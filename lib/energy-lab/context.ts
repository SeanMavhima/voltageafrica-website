/**
 * Structured, compact views of simulation state for the copilot (LLM or fallback).
 * Everything here is derived from simulator runs; nothing is invented.
 */
import { analyse, type Analysis } from "./explain";
import { forecast24h, type Forecast } from "./forecast";
import { LOAD_MAP, LOADS, PRIORITY_LABEL } from "./loads";
import { formatClock, formatDayClock, round } from "./math";
import { NO_STRESS, runResilience, type ResilienceInput, type ResilienceResult } from "./resilience";
import { scenarioSchema } from "./schema";
import { inverterKw, socAt, SPEC, stepAt } from "./simulate";
import { WEATHER } from "./solar";
import { ENGINE_VERSION, type ScenarioConfig, type SimResult, type Summary } from "./types";

export function brief(s: Summary) {
  return {
    demandKwh: round(s.demandKwh, 1),
    servedKwh: round(s.servedKwh, 1),
    unservedKwh: round(s.unservedKwh, 1),
    servedPct: round(s.servedFraction * 100, 1),
    unservedByPriorityKwh: Object.fromEntries(Object.entries(s.unservedByPriority).map(([k, v]) => [k, round(v, 2)])),
    solarAvailableKwh: round(s.pvAvailableKwh, 1),
    solarUsedKwh: round(s.pvUsedKwh, 1),
    solarCurtailedKwh: round(s.curtailedKwh, 1),
    solarUtilisationPct: round(s.solarUtilisation * 100, 1),
    batteryChargedKwh: round(s.batteryChargeKwh, 1),
    batteryDischargedKwh: round(s.batteryDischargeKwh, 1),
    batteryLossesKwh: round(s.batteryLossesKwh, 1),
    equivalentFullCycles: round(s.equivalentCycles, 2),
    socStartPct: round(s.startSoc * 100, 0),
    socMinPct: round(s.minSoc * 100, 0),
    socEndPct: round(s.endSoc * 100, 0),
    hoursBelowReserve: round(s.hoursBelowReserve, 2),
    peakDemandKw: round(s.peakDemandKw, 1),
    hoursWithUnservedDemand: round(s.outageHours, 2),
    loadsWithUnservedDemand: s.loads.filter((l) => l.unservedKwh > 0.05).map((l) => ({ load: LOAD_MAP[l.id].name, unservedKwh: round(l.unservedKwh, 1), hours: round(l.outageHours, 2) })),
  };
}

export function snapshotAt(run: SimResult, hour: number) {
  const st = stepAt(run, hour);
  const flow = st.batteryKw > 0.05 ? "charging" : st.batteryKw < -0.05 ? "discharging" : "idle";
  return {
    time: formatClock(hour),
    solarKw: round(st.pvKw, 2),
    demandKw: round(st.demandKw, 2),
    servedKw: round(st.servedKw, 2),
    unservedKw: round(st.unservedKw, 2),
    batteryKw: round(st.batteryKw, 2),
    battery: flow,
    curtailedKw: round(st.curtailedKw, 2),
    socPct: round(socAt(run, hour) * 100, 1),
    storedKwh: round(socAt(run, hour) * run.capacityKwh, 1),
    availableAboveReserveKwh: round(Math.max(0, socAt(run, hour) - run.reserveSoc) * run.capacityKwh, 1),
    availableAboveFloorKwh: round(Math.max(0, socAt(run, hour) - SPEC.minSoc) * run.capacityKwh, 1),
    loads: LOADS.map((l) => ({ load: l.name, priority: l.priority, demandKw: round(st.loads[l.id].demand, 2), servedKw: round(st.loads[l.id].served, 2) })).filter((l) => l.demandKw > 0.005),
  };
}

export function systemDescription(cfg: ScenarioConfig) {
  return {
    households: cfg.households,
    solarKwp: cfg.solarKwp,
    batteryKwh: cfg.batteryKwh,
    inverterKw: round(inverterKw(cfg), 1),
    reservePct: Math.round(cfg.reservePct * 100),
    initialSocPct: Math.round(cfg.initialSoc * 100),
    weatherToday: WEATHER[cfg.weather].label,
    weatherTomorrow: WEATHER[cfg.weatherTomorrow].label,
    demandMultipliers: { households: cfg.householdDemand, business: cfg.businessDemand, schoolAndClinic: cfg.communityDemand },
    dayOfYear: cfg.dayOfYear,
    batteryLimits: { minSocPct: SPEC.minSoc * 100, maxSocPct: SPEC.maxSoc * 100, chargeEfficiency: SPEC.chargeEff, dischargeEfficiency: SPEC.dischargeEff, maxPowerKw: round(SPEC.cRate * cfg.batteryKwh, 1) },
    loads: LOADS.map((l) => ({ load: l.name, priority: PRIORITY_LABEL[l.priority], schedule: l.schedule })),
  };
}

export function forecastBrief(f: Forecast) {
  return {
    from: formatClock(f.from),
    horizonHours: 24,
    solarKwh: { central: round(f.totals.pv, 1), lowCase: round(f.totals.pvLow, 1), highCase: round(f.totals.pvHigh, 1) },
    demandKwh: round(f.totals.demand, 1),
    unservedKwh: { central: round(f.totals.unserved, 1), lowCase: round(f.totals.unservedLow, 1) },
    socEndPct: { central: round(f.totals.endSoc * 100, 0), lowCase: round(f.totals.endSocLow * 100, 0) },
    shortages: f.shortages.map((w) => ({ from: formatDayClock(w.start), to: formatDayClock(w.end), kwh: round(w.kwh, 1), case: w.case })),
    surpluses: f.surpluses.map((w) => ({ from: formatDayClock(w.start), to: formatDayClock(w.end), kwh: round(w.kwh, 1), batteryFull: w.curtailed })),
    flexibleLoadWindows: f.flexWindows.map((w) => ({ load: w.name, from: formatDayClock(w.start), to: formatDayClock(w.end), solarCoveredPctCentral: Math.round(w.solarShareCentral * 100), solarCoveredPctLowCase: Math.round(w.solarShareLow * 100) })),
    note: "Simulated forecast with scenario bounds, not a trained model or measured weather.",
  };
}

export function resilienceBrief(r: ResilienceResult) {
  const o = (x: ResilienceResult["baseline"]) => ({
    ...brief(x.run.summary),
    perDay: x.days.map((d) => ({ day: d.day + 1, weather: WEATHER[d.weather].label, servedPct: round((d.servedKwh / Math.max(d.demandKwh, 0.01)) * 100, 1), unservedKwh: round(d.unservedKwh, 1), clinicUnservedKwh: round(d.criticalUnservedKwh, 1), minSocPct: Math.round(d.minSoc * 100) })),
    firstReachedFloor: x.depletedAt === null ? null : formatDayClock(x.depletedAt),
    recoveredToReserve: x.recoveredAt === null ? "not within the simulated horizon" : formatDayClock(x.recoveredAt),
  });
  return {
    horizonDays: r.hours / 24,
    uncontrolled: o(r.baseline),
    managed: o(r.intelligent),
    sizingToKeepUnservedBelow1Pct: { addSolarKwp: r.sizing.addKwp ?? `not reached within +${r.sizing.searchedUpToKwp} kWp`, addBatteryKwh: r.sizing.addKwh ?? `not reached within +${r.sizing.searchedUpToKwh} kWh` },
  };
}

export function analysisBrief(a: Analysis) {
  return {
    uncontrolled: brief(a.baseline.summary),
    managedOperatorSchedule: brief(a.priority.summary),
    managedOptimisedSchedule: brief(a.intelligent.summary),
    scheduleChanges: a.changes.map((c) => ({ load: c.name, from: formatClock(c.from), to: formatClock(c.to), runHours: c.runHours, powerKw: c.powerKw })),
    optimiser: { method: a.optimisation.method, schedulesEvaluated: a.optimisation.evaluated, guarantee: a.optimisation.guarantee, objective: "1000·critical + 100·essential + 10·standard + 9·flexible unserved kWh + 0.05·battery discharge − 0.02·energy left at midnight" },
    recommendations: a.recommendations.map((r) => ({ title: r.title, why: r.why, effect: r.effect, tradeoff: r.tradeoff, figures: r.figures })),
    sizingToKeepUnservedBelow1Pct: a.sizing ? { addSolarKwp: a.sizing.addKwp, addBatteryKwh: a.sizing.addKwh } : "not needed: managed dispatch already serves ≥ 99% of demand",
  };
}

/** A what-if variant: scenario changes and/or a multi-day stress. */
export type VariantInput = Partial<ScenarioConfig> & Partial<ResilienceInput> & { addHouseholds?: number };

export function runVariant(cfg: ScenarioConfig, v: VariantInput) {
  const merged = { ...cfg };
  for (const k of Object.keys(cfg) as (keyof ScenarioConfig)[]) if (v[k] !== undefined) (merged as Record<string, unknown>)[k] = v[k];
  if (v.addHouseholds) merged.households = cfg.households + v.addHouseholds;
  const parsed = scenarioSchema.safeParse(merged);
  if (!parsed.success) return { error: `Outside the simulator's supported range: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` };
  const next = parsed.data;
  const changed = Object.fromEntries((Object.keys(cfg) as (keyof ScenarioConfig)[]).filter((k) => cfg[k] !== next[k]).map((k) => [k, { from: cfg[k], to: next[k] }]));
  const stressKeys: (keyof ResilienceInput)[] = ["cloudyDays", "demandIncrease", "eveningIncrease", "batteryHealth", "solarAvailable", "batteryOutageHours", "extraHouseholds"];
  const stressed = stressKeys.some((k) => v[k] !== undefined && v[k] !== NO_STRESS[k]);
  if (stressed) {
    const input: ResilienceInput = { ...NO_STRESS };
    for (const k of [...stressKeys, "cloudType" as const]) if (v[k] !== undefined) (input as Record<string, unknown>)[k] = v[k];
    return { changed, stress: input, result: resilienceBrief(runResilience(next, input)) };
  }
  const a = analyse(next);
  return { changed, result: { uncontrolled: brief(a.baseline.summary), managedOptimised: brief(a.intelligent.summary), scheduleChanges: analysisBrief(a).scheduleChanges, sizing: analysisBrief(a).sizingToKeepUnservedBelow1Pct } };
}

export type LabContext = ReturnType<typeof buildContext>;

export function buildContext(cfg: ScenarioConfig, hour: number) {
  const a = analyse(cfg);
  const f = forecast24h(cfg, a.intelligent, hour, a.optimisation.schedule);
  return {
    engine: `VoltageAfrica Energy Lab simulator v${ENGINE_VERSION}`,
    dataStatus: "SIMULATED. Conceptual community microgrid. No live telemetry; no deployed system; does not control equipment.",
    system: systemDescription(cfg),
    now: { managed: snapshotAt(a.intelligent, hour), uncontrolled: snapshotAt(a.baseline, hour) },
    day: analysisBrief(a),
    forecast: forecastBrief(f),
    analysis: a,
    forecastFull: f,
  };
}

/** The JSON handed to the LLM (drops the large raw runs). */
export function contextForModel(ctx: LabContext) {
  const { analysis: _a, forecastFull: _f, ...rest } = ctx;
  return rest;
}
