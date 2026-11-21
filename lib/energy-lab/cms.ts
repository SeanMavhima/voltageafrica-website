/**
 * Reads the Energy Lab's CMS section content into safe, bounded settings.
 * The CMS controls copy, availability, the default scenario and a few starting
 * values. Physics, priorities and the optimiser stay in version-controlled code.
 */
import { bool, list, num, tags, text, type C } from "@/lib/cms/content";
import { SUGGESTED_QUESTIONS } from "./fallback";
import { PRESETS } from "./presets";
import { BOUNDS } from "./schema";
import { DEFAULT_CONFIG } from "./simulate";
import type { ScenarioConfig } from "./types";

export type LabSettings = {
  kicker: string;
  headline: string;
  intro: string;
  paused: boolean;
  pausedMessage: string;
  defaultPreset: string;
  defaultLevel: "explore" | "engineer";
  presets: { id: string; index: string; title: string; summary: string }[];
  features: { title: string; body: string }[];
  education: { title: string; body: string }[];
  disclaimer: string;
  defaults: ScenarioConfig;
  copilotOff: boolean;
  copilotIntro: string;
  suggestions: string[];
};

const within = (v: number, b: { min: number; max: number }) => Math.min(b.max, Math.max(b.min, v));

export const LAB_DEFAULT_COPY = {
  kicker: "VoltageAfrica AI Energy Lab",
  headline: "Intelligent energy. *Simulated, explored, explained.*",
  intro:
    "Step inside a simulated community microgrid. Change the weather, the equipment and the community's demand, then watch how an intelligent energy manager decides what to supply, when, and what to protect, and why.",
  disclaimer:
    "Everything in the Energy Lab is a simulation of a conceptual hub. VoltageAfrica does not yet operate a microgrid, and nothing here is live data, a field measurement or a validated forecast. The lab does not control any equipment.",
  pausedMessage: "The Energy Lab is being updated and will be back shortly.",
  copilotIntro:
    "Ask anything about the scenario on screen. The copilot reads the simulator's numbers (generation, demand, battery, the optimiser's recommendations, the forecast) and can run new what-if simulations. If the data cannot answer a question, it says so.",
};

export const LAB_DEFAULT_FEATURES = [
  { title: "A real simulator", body: "Sun position, weather, temperature, battery efficiencies and eleven community loads, every 15 minutes." },
  { title: "An optimiser", body: "Schedules pumping and milling into solar surplus and protects a reserve for the clinic." },
  { title: "A copilot", body: "Explains the system and runs what-if simulations, grounded in the simulator's own numbers." },
];

export function labSettings(c: C): LabSettings {
  const overrides = new Map(list(c, "presets").map((p) => [text(p, "preset"), p]));
  const presets = PRESETS.filter((p) => !bool(overrides.get(p.id) ?? {}, "hidden")).map((p) => {
    const o = overrides.get(p.id) ?? {};
    return { id: p.id, index: p.index, title: text(o, "title", p.title), summary: text(o, "summary", p.summary) };
  });
  const wanted = text(c, "defaultPreset", "sunny");
  const defaultPreset = presets.find((p) => p.id === wanted)?.id ?? presets[0]?.id ?? "sunny";
  const pick = (k: keyof typeof BOUNDS, scale = 1) => {
    const raw = num(c, k, NaN);
    return Number.isFinite(raw) && raw > 0 ? within(raw / scale, BOUNDS[k]) : DEFAULT_CONFIG[k];
  };
  const items = (k: string) => list(c, k).map((x) => ({ title: text(x, "title"), body: text(x, "body") })).filter((x) => x.title || x.body);
  return {
    kicker: text(c, "kicker", LAB_DEFAULT_COPY.kicker),
    headline: text(c, "headline", LAB_DEFAULT_COPY.headline),
    intro: text(c, "intro", LAB_DEFAULT_COPY.intro),
    paused: bool(c, "paused", false),
    pausedMessage: text(c, "pausedMessage", LAB_DEFAULT_COPY.pausedMessage),
    defaultPreset,
    defaultLevel: text(c, "defaultLevel") === "engineer" ? "engineer" : "explore",
    presets,
    features: items("features").length ? items("features") : LAB_DEFAULT_FEATURES,
    education: items("education"),
    disclaimer: text(c, "disclaimer", LAB_DEFAULT_COPY.disclaimer),
    defaults: {
      ...DEFAULT_CONFIG,
      households: Math.round(pick("households")),
      solarKwp: pick("solarKwp"),
      batteryKwh: pick("batteryKwh"),
      reservePct: pick("reservePct", 100),
    },
    copilotOff: bool(c, "copilotOff", false),
    copilotIntro: text(c, "copilotIntro", LAB_DEFAULT_COPY.copilotIntro),
    suggestions: (tags(c, "suggestedQuestions").length ? tags(c, "suggestedQuestions") : SUGGESTED_QUESTIONS.slice(0, 6)).slice(0, 8),
  };
}
