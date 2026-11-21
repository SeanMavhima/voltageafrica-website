/**
 * Deterministic copilot: answers common questions directly from simulation
 * results, without any language model. Used when no LLM is configured, when the
 * LLM call fails, and as the offline answer in the browser.
 *
 * Matching is keyword-based. Anything it does not recognise gets an honest
 * "I can't answer that from the simulation" plus the questions it can answer.
 */
import { brief, buildContext, runVariant, type LabContext } from "./context";
import { LOAD_MAP } from "./loads";
import { formatClock, formatDayClock, round } from "./math";
import { NO_STRESS, runResilience } from "./resilience";
import { WEATHER } from "./solar";
import type { ScenarioConfig } from "./types";

export type CopilotAnswer = { answer: string; sources: string[]; intent: string; mode: "ai" | "fallback" };

const k = (v: number) => `${round(v, 1)} kWh`;
const kw = (v: number) => `${round(v, 1)} kW`;
const p = (v: number) => `${Math.round(v * 100)}%`;

type Intent = { id: string; test: RegExp; run: (q: string, cfg: ScenarioConfig, hour: number, ctx: LabContext, level: "explore" | "engineer") => { answer: string; sources: string[] } };

const num = (q: string, fallback: number) => {
  const m = q.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : fallback;
};

const INTENTS: Intent[] = [
  {
    id: "compare",
    test: /\b(compar|baseline|before and after|before & after|optimi[sz]ed|difference)\b/i,
    run: (_q, _c, _h, ctx) => {
      const a = ctx.analysis;
      const b = a.baseline.summary;
      const i = a.intelligent.summary;
      const lines = [
        `Both runs use the same simulated day, equipment and weather.`,
        `- **Energy served:** ${k(b.servedKwh)} uncontrolled, ${k(i.servedKwh)} with intelligent management (${p(b.servedFraction)} vs ${p(i.servedFraction)} of ${k(i.demandKwh)} demand).`,
        `- **Clinic (critical):** ${k(b.unservedByPriority.critical)} unserved uncontrolled, ${k(i.unservedByPriority.critical)} managed.`,
        `- **Essential loads:** ${k(b.unservedByPriority.essential)} vs ${k(i.unservedByPriority.essential)} unserved. **Flexible loads:** ${k(b.unservedByPriority.flexible)} vs ${k(i.unservedByPriority.flexible)}.`,
        `- **Battery:** discharged ${k(b.batteryDischargeKwh)} vs ${k(i.batteryDischargeKwh)} (${round(b.equivalentCycles, 2)} vs ${round(i.equivalentCycles, 2)} equivalent cycles); lowest charge ${p(b.minSoc)} vs ${p(i.minSoc)}.`,
        `- **Solar used:** ${p(b.solarUtilisation)} vs ${p(i.solarUtilisation)} of what was available.`,
      ];
      if (a.changes.length) lines.push(`Schedule changes: ${a.changes.map((c) => `${c.name.toLowerCase()} ${formatClock(c.from)} → ${formatClock(c.to)}`).join("; ")}.`);
      else lines.push("The optimiser kept the current flexible-load schedule: no move improved the objective.");
      if (i.servedKwh < b.servedKwh - 0.05) lines.push(`Total energy served is lower with management because the battery reserve and the priority order protect the clinic and essential services first. That is a deliberate trade-off, not a gain in energy.`);
      return { answer: lines.join("\n"), sources: ["day.uncontrolled", "day.managedOptimisedSchedule", "day.scheduleChanges"] };
    },
  },
  {
    id: "cloudy-days",
    test: /(cloud|overcast|rain).*(day|days)|(\d+|two|three|four|several) (cloudy|overcast|rainy)/i,
    run: (q, cfg) => {
      const words: Record<string, number> = { two: 2, three: 3, four: 4, several: 3 };
      const w = Object.keys(words).find((x) => q.toLowerCase().includes(x));
      const n = Math.max(1, Math.min(4, w ? words[w] : num(q, 3)));
      const rainy = /rain/i.test(q);
      const r = runResilience(cfg, { ...NO_STRESS, cloudyDays: n, cloudType: rainy ? "rainy" : "cloudy" });
      const m = r.intelligent.run.summary;
      const u = r.baseline.run.summary;
      const lines = [
        `I simulated ${n} ${rainy ? "rainy" : "overcast"} day${n > 1 ? "s" : ""} followed by clear weather (${r.hours / 24} days in total).`,
        `- **With intelligent management:** ${p(m.servedFraction)} of demand served, ${k(m.unservedKwh)} unserved, clinic unserved ${k(m.unservedByPriority.critical)}. Lowest battery charge ${p(m.minSoc)}.`,
        `- **Uncontrolled:** ${p(u.servedFraction)} served, clinic unserved ${k(u.unservedByPriority.critical)}, the network tripped for ${round(u.outageHours, 1)} h.`,
        `- Per day (managed): ${r.intelligent.days.map((d) => `day ${d.day + 1} ${WEATHER[d.weather].label.toLowerCase()} ${p(d.servedKwh / Math.max(d.demandKwh, 0.01))}`).join(", ")}.`,
        `- Recovery: the battery is back above its reserve at ${r.intelligent.recoveredAt === null ? "no point within the horizon" : formatDayClock(r.intelligent.recoveredAt)}.`,
      ];
      const s = r.sizing;
      lines.push(s.addKwp != null || s.addKwh != null ? `To keep unserved energy below 1% through this, the sizing search finds ${[s.addKwp != null ? `+${s.addKwp} kWp of solar` : null, s.addKwh != null ? `+${s.addKwh} kWh of storage` : null].filter(Boolean).join(" or ")} (each on its own).` : `Neither extra solar (up to +${s.searchedUpToKwp} kWp) nor extra storage (up to +${s.searchedUpToKwh} kWh) alone keeps unserved energy below 1% in this case.`);
      return { answer: lines.join("\n"), sources: ["resilience simulation (run on request)"] };
    },
  },
  {
    id: "households",
    test: /(household|homes|connection|families)/i,
    run: (q, cfg) => {
      const n = Math.round(num(q, 20));
      const v = runVariant(cfg, { addHouseholds: n });
      if ("error" in v) return { answer: `I can't run that: ${v.error}.`, sources: [] };
      const r = v.result as { managedOptimised: ReturnType<typeof brief>; uncontrolled: ReturnType<typeof brief>; sizing: unknown };
      const m = r.managedOptimised;
      const ok = m.unservedKwh <= 0.01 * m.demandKwh;
      const sz = r.sizing as { addSolarKwp?: number | null; addBatteryKwh?: number | null } | string;
      return {
        answer: [
          `With ${n} more households (${cfg.households + n} in total) on the same ${cfg.solarKwp} kWp / ${cfg.batteryKwh} kWh system, on this ${WEATHER[cfg.weather].label.toLowerCase()} day:`,
          `- Demand rises to ${k(m.demandKwh)}; managed dispatch serves ${m.servedPct}% (${k(m.unservedKwh)} unserved), with the battery down to ${m.socMinPct}% at its lowest.`,
          `- Uncontrolled, ${r.uncontrolled.servedPct}% would be served.`,
          ok ? "So on this day the system can support them. Check a cloudy day in the resilience lab before concluding it always can." : `So the system cannot fully support them on this day.${typeof sz === "object" ? ` The sizing search suggests ${[sz.addSolarKwp != null ? `+${sz.addSolarKwp} kWp` : null, sz.addBatteryKwh != null ? `+${sz.addBatteryKwh} kWh` : null].filter(Boolean).join(" or ") || "neither addition alone suffices"}.` : ""}`,
        ].join("\n"),
        sources: ["what-if simulation (run on request)"],
      };
    },
  },
  {
    id: "battery-size",
    test: /(battery|storage).*(doubl|twice|bigger|larger|increase|\d+ ?kwh)|doubl.*(battery|storage)/i,
    run: (q, cfg) => {
      const m = q.match(/(\d+(?:\.\d+)?)\s*kwh/i);
      const target = m ? Number(m[1]) : /doubl|twice/i.test(q) ? cfg.batteryKwh * 2 : cfg.batteryKwh * 1.5;
      const v = runVariant(cfg, { batteryKwh: Math.min(400, target) });
      if ("error" in v) return { answer: `I can't run that: ${v.error}.`, sources: [] };
      const now = buildContext(cfg, 12).day.managedOptimisedSchedule;
      const r = (v.result as { managedOptimised: typeof now }).managedOptimised;
      return {
        answer: [
          `Battery ${cfg.batteryKwh} → ${Math.min(400, target)} kWh, same day and solar:`,
          `- Energy served: ${now.servedPct}% → ${r.servedPct}% (unserved ${k(now.unservedKwh)} → ${k(r.unservedKwh)}).`,
          `- Solar curtailed: ${k(now.solarCurtailedKwh)} → ${k(r.solarCurtailedKwh)}. Lowest charge ${now.socMinPct}% → ${r.socMinPct}%.`,
          r.unservedKwh >= now.unservedKwh - 0.1 && now.unservedKwh > 0.1
            ? "More storage barely helps here: there is not enough solar energy to fill it. Generation is the constraint."
            : now.unservedKwh <= 0.1
              ? "The current battery already serves all demand on this day; the larger one mainly adds margin for cloudy days."
              : now.solarCurtailedKwh > 1
                ? "Part of the gain comes from storing midday surplus that is curtailed with the smaller battery."
                : `Note: the starting charge is set as a percentage (${Math.round(cfg.initialSoc * 100)}%), so the larger battery also starts the day with more stored energy (${k(cfg.initialSoc * Math.min(400, target))} instead of ${k(cfg.initialSoc * cfg.batteryKwh)}). No solar was being curtailed, so that head start, not extra solar capture, explains most of the gain on this day.`,
        ].join("\n"),
        sources: ["what-if simulation (run on request)"],
      };
    },
  },
  {
    id: "solar-size",
    test: /(how much|additional|more|extra).*(solar|pv|panel|kwp)|(solar|pv).*(require|need)/i,
    run: (_q, cfg, _h, ctx) => {
      const s = ctx.analysis.sizing;
      const i = ctx.analysis.intelligent.summary;
      if (!s) return { answer: `None is needed for this scenario: with management the ${cfg.solarKwp} kWp system serves ${p(i.servedFraction)} of demand. To size for bad weather, run a multi-day test in the resilience lab or ask “what happens if it is cloudy for three days?”.`, sources: ["day.sizingToKeepUnservedBelow1Pct"] };
      return {
        answer: [
          `For this scenario, unserved energy is ${k(i.unservedKwh)} of ${k(i.demandKwh)}.`,
          s.addKwp != null ? `- Adding about **${s.addKwp} kWp** of solar (to ${cfg.solarKwp + s.addKwp} kWp) brings unserved energy below 1% over two simulated days, with the battery unchanged.` : `- Extra solar alone (searched up to +${s.searchedUpToKwp} kWp) does not get below 1%: storage or the starting charge is the limit.`,
          s.addKwh != null ? `- Alternatively about **${s.addKwh} kWh** more storage, with solar unchanged.` : `- Extra storage alone (up to +${s.searchedUpToKwh} kWh) does not get there either.`,
          "Found by bisection on simulated runs with managed dispatch. It is a screening estimate, not an engineering design.",
        ].join("\n"),
        sources: ["day.sizingToKeepUnservedBelow1Pct"],
      };
    },
  },
  {
    id: "battery-flow",
    test: /(why|what).*(battery).*(discharg|charg|drain|empty|low)|battery (discharg|charg)/i,
    run: (_q, cfg, hour, ctx) => {
      const n = ctx.now.managed;
      const parts = [`At ${n.time} the simulated solar output is ${kw(n.solarKw)} and demand is ${kw(n.demandKw)}.`];
      if (n.battery === "discharging" && n.unservedKw > 0.05 && n.availableAboveReserveKwh < 0.1)
        parts.push(`Solar does not cover demand and the battery has reached the ${Math.round(cfg.reservePct * 100)}% reserve (${n.socPct}% now), so it supplies only critical loads: ${kw(-n.batteryKw)} for the clinic. The other ${kw(n.unservedKw)} of demand is switched off until solar returns.`);
      else if (n.battery === "discharging") parts.push(`Solar does not cover demand, so the battery supplies ${kw(-n.batteryKw)}. It holds ${k(n.storedKwh)} (${n.socPct}%), of which ${k(n.availableAboveReserveKwh)} is above the ${Math.round(cfg.reservePct * 100)}% reserve that only the clinic may use.`);
      else if (n.battery === "charging") parts.push(`Solar exceeds demand, so the surplus charges the battery at ${kw(n.batteryKw)}${n.curtailedKw > 0.05 ? `; another ${kw(n.curtailedKw)} is curtailed because the battery cannot take it` : ""}.`);
      else parts.push(n.socPct >= 94 ? "The battery is full, so it is idle and any surplus is curtailed." : n.unservedKw > 0.05 ? `The battery is at its limit for these loads (${n.socPct}%), so it is not discharging; ${kw(n.unservedKw)} of demand is shed.` : "Solar and demand are roughly balanced, so the battery is idle.");
      if (n.unservedKw > 0.05 && !parts.some((x) => x.includes("switched off"))) parts.push(`Unserved right now: ${kw(n.unservedKw)}.`);
      return { answer: parts.join(" "), sources: ["now.managed"] };
    },
  },
  {
    id: "available",
    test: /(how much|what).*(energy|power).*(available|left|stored|have)/i,
    run: (_q, cfg, hour, ctx) => {
      const n = ctx.now.managed;
      const rest = ctx.analysis.intelligent.steps.filter((s) => s.t >= hour).reduce((a, s) => a + s.pvKw * 0.25, 0);
      return {
        answer: [
          `At ${n.time} (simulated):`,
          `- Stored: ${k(n.storedKwh)} (${n.socPct}% of ${cfg.batteryKwh} kWh). Usable by all loads, above the reserve: ${k(n.availableAboveReserveKwh)}. Usable by the clinic, above the 10% floor: ${k(n.availableAboveFloorKwh)}.`,
          `- Solar right now: ${kw(n.solarKw)}. Expected for the rest of the day: ${k(rest)}.`,
          `- Discharge is limited to ${kw(cfg.batteryKwh * 0.5)} and every kWh out of the battery costs about 5% in conversion losses.`,
        ].join("\n"),
        sources: ["now.managed", "system.batteryLimits"],
      };
    },
  },
  {
    id: "solar-peak",
    test: /(solar peak|midday|middle of the day|surplus|run during|what should we run|when should)/i,
    run: (_q, _c, _h, ctx) => {
      const f = ctx.forecast;
      const lines = [`From the 24-hour simulated forecast (from ${f.from}):`];
      if (f.surpluses.length) lines.push(`- Solar surplus windows: ${f.surpluses.map((s) => `${s.from} to ${s.to} (${s.kwh} kWh${s.batteryFull ? ", battery full" : ""})`).join("; ")}.`);
      else lines.push("- No solar surplus is expected in the next 24 hours.");
      if (f.flexibleLoadWindows.length) lines.push(`- Best windows for flexible loads: ${f.flexibleLoadWindows.map((w) => `${w.load.toLowerCase()} ${w.from}–${w.to.split("· ")[1]} (${w.solarCoveredPctCentral}% solar-covered, ${w.solarCoveredPctLowCase}% in the low case)`).join("; ")}.`);
      lines.push("Running pumping, milling and workshop tools in these windows uses solar directly instead of drawing on the battery later.");
      return { answer: lines.join("\n"), sources: ["forecast.surpluses", "forecast.flexibleLoadWindows"] };
    },
  },
  {
    id: "evening",
    test: /evening|night|after sunset|peak demand/i,
    run: (_q, cfg, _h, ctx) => {
      const run = ctx.analysis.intelligent;
      const ev = run.steps.filter((s) => s.t >= 17);
      const dem = ev.reduce((a, s) => a + s.demandKw * 0.25, 0);
      const fromBatt = ev.reduce((a, s) => a + Math.max(0, -s.batteryKw) * 0.25, 0);
      const un = ev.reduce((a, s) => a + s.unservedKw * 0.25, 0);
      const recs = ctx.analysis.recommendations.filter((r) => ["evening", "capacity", "shed"].includes(r.kind) || (r.kind === "schedule" && Number(r.figures.deltaBatteryKwh) < 0));
      return {
        answer: [
          `From 17:00 to midnight demand is ${k(dem)}; ${k(fromBatt)} of it comes from the battery and ${k(un)} is unserved (managed dispatch).`,
          un > 0.1 ? "Ways to reduce evening shortages, from the simulation:" : "There are no evening shortages in this scenario.",
          ...(un > 0.1 ? recs.slice(0, 4).map((r) => `- **${r.title}.** ${r.effect}`) : []),
          `Moving productive loads into daylight helps the evening only indirectly: the battery ends the afternoon fuller. Household lighting and appliances are not shiftable in this model.`,
        ].join("\n"),
        sources: ["day.managedOptimisedSchedule", "day.recommendations"],
      };
    },
  },
  {
    id: "deficit",
    test: /(deficit|shortage|unserved|not enough|outage|blackout|why.*(short|cut|off))/i,
    run: (_q, cfg, _h, ctx) => {
      const i = ctx.analysis.intelligent.summary;
      if (i.unservedKwh < 0.05) return { answer: `There is no energy deficit in this scenario: all ${k(i.demandKwh)} of demand is supplied with management.`, sources: ["day.managedOptimisedSchedule"] };
      const affected = i.loads.filter((l) => l.unservedKwh > 0.05).map((l) => `${LOAD_MAP[l.id].name.toLowerCase()} ${k(l.unservedKwh)}`);
      return {
        answer: [
          `The system is short by ${k(i.unservedKwh)} (${p(1 - i.servedFraction)} of demand) on this simulated day.`,
          `- Supply: ${k(i.pvAvailableKwh)} of solar (${WEATHER[cfg.weather].label.toLowerCase()}) plus the battery, which started at ${p(i.startSoc)}.`,
          `- Demand: ${k(i.demandKwh)}, peaking at ${kw(i.peakDemandKw)}.`,
          `- Affected: ${affected.join(", ")}. The clinic is protected by the reserve${i.unservedByPriority.critical > 0.05 ? `, but even it loses ${k(i.unservedByPriority.critical)}` : ""}.`,
          "Scheduling cannot create energy: the gap closes only with more generation, more storage, a fuller battery at the start, or less demand.",
        ].join("\n"),
        sources: ["day.managedOptimisedSchedule", "system"],
      };
    },
  },
  {
    id: "risks",
    test: /risk|vulnerab|what could go wrong|weak/i,
    run: (_q, cfg, _h, ctx) => {
      const i = ctx.analysis.intelligent.summary;
      const cloudy = runResilience(cfg, { ...NO_STRESS, cloudyDays: 2 });
      const risks = [
        `**Weather:** two overcast days leave ${k(cloudy.intelligent.run.summary.unservedKwh)} unserved with management (${k(cloudy.baseline.run.summary.unservedByPriority.critical)} of it clinic demand without management).`,
        `**Storage margin:** the battery's lowest point today is ${p(i.minSoc)} against a ${p(cfg.reservePct)} reserve and a 10% floor.`,
        i.curtailedKwh > 2 ? `**Unused solar:** ${k(i.curtailedKwh)} is curtailed, a sign that daytime demand could grow without new panels.` : null,
        i.unservedKwh > 0.05 ? `**Capacity:** ${k(i.unservedKwh)} of demand is already unserved on this day.` : null,
        "**Model risk:** these are simulated profiles and weather; a real hub needs metered data to confirm them.",
      ].filter(Boolean);
      return { answer: ["Main risks in this simulated scenario:", ...risks.map((r) => `- ${r}`)].join("\n"), sources: ["day.managedOptimisedSchedule", "resilience simulation (run on request)"] };
    },
  },
  {
    id: "balance",
    test: /(energy balance|engineering|technical|equation|losses|efficien)/i,
    run: (_q, cfg, _h, ctx) => {
      const i = ctx.analysis.intelligent.summary;
      const cap = ctx.analysis.intelligent.capacityKwh;
      return {
        answer: [
          `Daily energy balance (managed dispatch, 15-minute steps):`,
          `- Solar available ${k(i.pvAvailableKwh)} = direct to loads ${k(i.pvToLoadKwh)} + into battery ${k(i.batteryChargeKwh)} + curtailed ${k(i.curtailedKwh)}.`,
          `- Demand ${k(i.demandKwh)} = served ${k(i.servedKwh)} (solar ${k(i.pvToLoadKwh)} + battery ${k(i.batteryDischargeKwh)}) + unserved ${k(i.unservedKwh)}.`,
          `- Battery: ΔE = 0.95 × ${k(i.batteryChargeKwh)} − ${k(i.batteryDischargeKwh)} / 0.95 = ${k((i.endSoc - i.startSoc) * cap)} (SOC ${p(i.startSoc)} → ${p(i.endSoc)}); conversion losses ${k(i.batteryLossesKwh)}; ${round(i.equivalentCycles, 2)} equivalent full cycles.`,
          `- PV model: P = kWp × G/1000 × (1 − 0.37%/°C × (T_cell − 25)) × 0.86, with Haurwitz clear-sky irradiance scaled by a clearness factor of ${WEATHER[cfg.weather].k} (${WEATHER[cfg.weather].label.toLowerCase()}).`,
          `- Dispatch: loads served in priority order; only critical loads may discharge below the ${p(cfg.reservePct)} reserve; floor 10%, ceiling 95%, power limit 0.5C.`,
        ].join("\n"),
        sources: ["day.managedOptimisedSchedule", "system.batteryLimits"],
      };
    },
  },
  {
    id: "simple",
    test: /(non-engineer|simple|simply|plain (english|language|terms|words)|explain (this|the|it)|what is (this|the) (system|microgrid|lab)|how does (this|the|it).*(work|system|microgrid)?)/i,
    run: (_q, cfg, hour, ctx) => {
      const n = ctx.now.managed;
      const i = ctx.analysis.intelligent.summary;
      return {
        answer: [
          `Think of the microgrid as a village's own small power station. ${cfg.solarKwp} kWp of solar panels make electricity while the sun shines. A ${cfg.batteryKwh} kWh battery stores what is not used at once, for the evening and night. A controller decides, every 15 minutes, who gets power first: the clinic, then lighting, fridges and the school, then everything else.`,
          `Right now (${n.time}, simulated) the panels make ${kw(n.solarKw)}, the village uses ${kw(n.demandKw)}, and the battery is ${n.socPct}% full${n.battery === "charging" ? " and filling" : n.battery === "discharging" ? " and helping out" : ""}.`,
          i.unservedKwh > 0.05 ? `Today there is not quite enough: ${k(i.unservedKwh)} of the ${k(i.demandKwh)} the village wants cannot be supplied, so the controller switches off the least important uses first.` : `Today there is enough for everyone: all ${k(i.demandKwh)} the village uses is supplied.`,
          `The clever part is timing: moving the water pump and the mill into the sunniest hours means they run on sunshine instead of emptying the battery.`,
        ].join("\n\n"),
        sources: ["now.managed", "day.managedOptimisedSchedule"],
      };
    },
  },
];

const CAPABILITIES = [
  "Why is the battery discharging?",
  "How much energy is available?",
  "What happens if it is cloudy for three days?",
  "Can the system support 20 additional households?",
  "What should we run during the solar peak?",
  "Why is there an energy deficit?",
  "How can we reduce evening shortages?",
  "What happens if the battery capacity doubles?",
  "How much additional solar would this scenario need?",
  "Compare the baseline with the optimised system.",
  "What are the main risks in this scenario?",
  "Explain this system to a non-engineer.",
  "Give me an engineering explanation of the energy balance.",
];

export function answerOffline(question: string, cfg: ScenarioConfig, hour: number, level: "explore" | "engineer" = "explore", ctx?: LabContext): CopilotAnswer {
  const c = ctx ?? buildContext(cfg, hour);
  const q = question.toLowerCase();
  const intent = INTENTS.find((i) => i.test.test(q));
  if (!intent) {
    return {
      intent: "unknown",
      mode: "fallback",
      sources: [],
      answer: `I can't answer that from the simulation data. The offline copilot only answers from the simulator's own results, and it does not recognise this question. It can answer, for example:\n${CAPABILITIES.slice(0, 7).map((x) => `- ${x}`).join("\n")}`,
    };
  }
  const out = intent.run(question, cfg, hour, c, level);
  return { ...out, intent: intent.id, mode: "fallback" };
}

export const SUGGESTED_QUESTIONS = CAPABILITIES;
