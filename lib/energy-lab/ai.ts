import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildContext, contextForModel, runVariant, type LabContext } from "./context";
import { answerOffline, type CopilotAnswer } from "./fallback";
import { resilienceSchema, scenarioSchema, type CopilotRequest } from "./schema";

/**
 * AI Energy Copilot, server side only. The API key is read from the environment
 * and never sent to the browser. The model receives the simulator's structured
 * state (recomputed here from the validated scenario, never trusted from the
 * client) and can run further what-if simulations through one tool.
 */

export const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 3;

export function aiStatus() {
  const key = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const disabled = process.env.ENERGY_LAB_AI === "off";
  return { configured: key && !disabled, keyPresent: key, disabledByEnv: disabled, model: process.env.ENERGY_LAB_AI_MODEL?.trim() || DEFAULT_MODEL };
}

const variantSchema = scenarioSchema
  .partial()
  .extend(resilienceSchema.partial().shape)
  .extend({ addHouseholds: z.number().int().min(-150).max(150).optional() })
  .strict();

const VARIANT_TOOL: Anthropic.Beta.BetaTool = {
  name: "run_variant",
  description:
    "Run the VoltageAfrica microgrid simulator on a variant of the CURRENT scenario and return the simulated results. Use it for any what-if question whose answer is not already in the context (different solar or battery size, more households, other weather, demand changes, multi-day cloudy periods, battery degradation, outages). Only the fields you pass change; everything else stays as in the current scenario. Fractions are 0..1 (reservePct 0.25 = 25%). If cloudyDays or another stress field is set, a multi-day resilience run is returned instead of a single day.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      solarKwp: { type: "number", description: "PV array size, kWp (5–120)" },
      batteryKwh: { type: "number", description: "Battery capacity, kWh (10–400)" },
      households: { type: "integer", description: "Total connected households (10–200)" },
      addHouseholds: { type: "integer", description: "Households to add to the current number" },
      reservePct: { type: "number", description: "Battery reserve for critical loads, fraction 0.1–0.6" },
      initialSoc: { type: "number", description: "State of charge at 00:00, fraction 0.1–0.95" },
      weather: { type: "string", enum: ["clear", "partly", "afternoon", "cloudy", "rainy"], description: "Weather today (afternoon = sunny morning, overcast from about 13:00)" },
      weatherTomorrow: { type: "string", enum: ["clear", "partly", "afternoon", "cloudy", "rainy"] },
      householdDemand: { type: "number", description: "Household demand multiplier 0.5–2" },
      businessDemand: { type: "number", description: "Business and productive-use demand multiplier 0.5–2.5" },
      communityDemand: { type: "number", description: "School and clinic demand multiplier 0.5–2" },
      cloudyDays: { type: "integer", description: "Consecutive cloudy days at the start of a multi-day run (0–4)" },
      cloudType: { type: "string", enum: ["cloudy", "rainy"] },
      demandIncrease: { type: "number", description: "Extra demand on every load, fraction 0–0.6" },
      eveningIncrease: { type: "number", description: "Extra household demand 17:00–23:00, fraction 0–0.8" },
      batteryHealth: { type: "number", description: "Battery state of health 0.5–1" },
      solarAvailable: { type: "number", description: "Fraction of the PV array working 0.4–1" },
      batteryOutageHours: { type: "integer", description: "Battery offline from 18:00 on day 1 for this many hours (0–12)" },
      extraHouseholds: { type: "integer", description: "Extra households in a multi-day stress run (0–100)" },
    },
  },
};

function systemPrompt(level: "explore" | "engineer") {
  return `You are the AI Energy Copilot in VoltageAfrica's Energy Lab, an interactive SIMULATION of a conceptual solar microgrid for a rural community in Zimbabwe.

Ground rules:
- Answer only from the simulation data in the context and from run_variant results. Quote figures with units (kW for power, kWh for energy, % for state of charge).
- Never invent readings, customers, installations or performance figures. Everything is simulated: say "in the simulation" where it matters. There is no live telemetry and the lab does not control any equipment.
- If the data cannot answer the question, say so plainly and say what would be needed. Questions unrelated to this energy system: decline briefly and offer what you can answer.
- Use run_variant for what-if questions not covered by the context instead of estimating. Do not claim a result is optimal beyond what the optimiser's stated guarantee says (coordinate-wise optimal on a 30-minute grid, not a global optimum).
- Management cannot create energy. If generation or storage is insufficient, say so.
- "Uncontrolled" means a conventional system without load management (the whole network trips when the battery is exhausted). "Managed" means priority dispatch with a reserve for the clinic; "optimised schedule" adds the flexible-load scheduling.

Style: ${
    level === "engineer"
      ? "the reader is an engineer. Be precise and technical: energy balances, constraints, efficiencies, assumptions and limitations."
      : "the reader may not be technical. Use plain language, short sentences, and explain any technical term the first time."
  } Keep answers under about 220 words unless asked for more. Plain text only: short paragraphs and "- " bullet lists; **bold** for a few key figures; no headings, no tables, no code blocks.`;
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]) {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function askCopilot(req: CopilotRequest): Promise<CopilotAnswer & { notice?: string }> {
  const ctx: LabContext = buildContext(req.config, req.hour);
  const status = aiStatus();
  if (!status.configured) return answerOffline(req.question, req.config, req.hour, req.level, ctx);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000, maxRetries: 1 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...req.history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: `<simulation_context>\n${JSON.stringify(contextForModel(ctx))}\n</simulation_context>\n\nQuestion: ${req.question}`,
    },
  ];
  const sources = new Set<string>(["simulation context"]);

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await client.beta.messages.create({
        model: status.model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: systemPrompt(req.level),
        tools: round < MAX_TOOL_ROUNDS ? [VARIANT_TOOL] : [],
        messages,
      });
      if (res.stop_reason === "refusal") break;
      if (res.stop_reason !== "tool_use") {
        const answer = textOf(res.content);
        if (!answer) break;
        return { answer, sources: [...sources], intent: "ai", mode: "ai" };
      }
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        const parsed = variantSchema.safeParse(block.input);
        if (!parsed.success) {
          results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` });
          continue;
        }
        const out = runVariant(req.config, parsed.data);
        sources.add("what-if simulation (run on request)");
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: "error" in out, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
    }
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    console.error(`[energy-lab] copilot model call failed${status ? ` (${status})` : ""}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  }
  return { ...answerOffline(req.question, req.config, req.hour, req.level, ctx), notice: "The AI service did not return an answer, so this one comes from the lab's built-in engine." };
}
