/**
 * Resilience testing: multi-day stress scenarios and the equipment that would be
 * needed to ride through them. All results are simulated.
 */
import { LOAD_MAP } from "./loads";
import { optimiseSchedule } from "./optimize";
import { simulate } from "./simulate";
import { STEP_H, type LoadId, type Priority, type ScenarioConfig, type Schedule, type SimResult, type Stress, type Weather } from "./types";

export type ResilienceInput = {
  cloudyDays: number; // 0..4
  cloudType: Extract<Weather, "cloudy" | "rainy">;
  demandIncrease: number; // 0..0.6
  eveningIncrease: number; // 0..0.8
  batteryHealth: number; // 0.5..1
  solarAvailable: number; // 0.4..1
  batteryOutageHours: number; // 0..12
  extraHouseholds: number; // 0..60
};

export const NO_STRESS: ResilienceInput = { cloudyDays: 0, cloudType: "cloudy", demandIncrease: 0, eveningIncrease: 0, batteryHealth: 1, solarAvailable: 1, batteryOutageHours: 0, extraHouseholds: 0 };

export const RESILIENCE_PRESETS: { id: string; label: string; description: string; input: Partial<ResilienceInput> }[] = [
  { id: "overcast3", label: "Three overcast days", description: "A three-day run of thick cloud, then clear skies.", input: { cloudyDays: 3, cloudType: "cloudy" } },
  { id: "rain2", label: "Two days of rain", description: "Heavy rain for two days.", input: { cloudyDays: 2, cloudType: "rainy" } },
  { id: "growth", label: "Community growth", description: "30 more households connect, evening use rises 20%.", input: { extraHouseholds: 30, eveningIncrease: 0.2 } },
  { id: "ageing", label: "Ageing equipment", description: "Battery at 70% health and 20% of the array soiled or faulty.", input: { batteryHealth: 0.7, solarAvailable: 0.8 } },
  { id: "outage", label: "Battery trip", description: "The battery bank is offline from 18:00 for six hours.", input: { batteryOutageHours: 6 } },
];

export function toStress(cfg: ScenarioConfig, r: ResilienceInput): { stress: Stress; days: number; stressEnd: number } {
  const days = Math.min(6, Math.max(3, r.cloudyDays + 2));
  const weatherByDay: Weather[] = Array.from({ length: days }, (_, d) => (d < r.cloudyDays ? r.cloudType : d === 0 ? cfg.weather : "clear"));
  const stress: Stress = {
    weatherByDay,
    demandIncrease: r.demandIncrease,
    eveningIncrease: r.eveningIncrease,
    batteryHealth: r.batteryHealth,
    solarAvailable: r.solarAvailable,
    batteryOutageHours: r.batteryOutageHours,
    extraHouseholds: r.extraHouseholds,
  };
  // Weather stress ends after the cloudy days; outages end after their duration; other stresses persist.
  const stressEnd = Math.max(r.cloudyDays * 24, r.batteryOutageHours ? 18 + r.batteryOutageHours : 0);
  return { stress, days, stressEnd };
}

export type DayStat = { day: number; weather: Weather; demandKwh: number; servedKwh: number; unservedKwh: number; criticalUnservedKwh: number; minSoc: number; pvKwh: number };
export type AffectedLoad = { id: LoadId; name: string; priority: Priority; unservedKwh: number; outageHours: number };

export type StrategyOutcome = {
  run: SimResult;
  days: DayStat[];
  affected: AffectedLoad[];
  depletedAt: number | null;
  recoveredAt: number | null;
  firstFullDay: number | null;
};

export type Sizing = { addKwp: number | null; addKwh: number | null; target: string; searchedUpToKwp: number; searchedUpToKwh: number };

export type ResilienceResult = {
  input: ResilienceInput;
  hours: number;
  stressEnd: number;
  baseline: StrategyOutcome;
  intelligent: StrategyOutcome;
  sizing: Sizing;
  schedule: Schedule;
};

function outcome(run: SimResult, stressEnd: number): StrategyOutcome {
  const perDay = 24 / STEP_H;
  const days: DayStat[] = [];
  for (let d = 0; d * perDay < run.steps.length; d++) {
    const slice = run.steps.slice(d * perDay, (d + 1) * perDay);
    const crit = slice.reduce((a, s) => a + Math.max(0, s.loads.clinic.demand - s.loads.clinic.served) * STEP_H, 0);
    days.push({
      day: d,
      weather: "clear", // filled in by runResilience from the stress sequence
      demandKwh: slice.reduce((a, s) => a + s.demandKw * STEP_H, 0),
      servedKwh: slice.reduce((a, s) => a + s.servedKw * STEP_H, 0),
      unservedKwh: slice.reduce((a, s) => a + s.unservedKw * STEP_H, 0),
      criticalUnservedKwh: crit,
      minSoc: Math.min(...slice.map((s) => s.soc)),
      pvKwh: slice.reduce((a, s) => a + s.pvKw * STEP_H, 0),
    });
  }
  const affected = run.summary.loads
    .filter((l) => l.unservedKwh > 0.05)
    .map((l) => ({ id: l.id, name: LOAD_MAP[l.id].name, priority: LOAD_MAP[l.id].priority, unservedKwh: l.unservedKwh, outageHours: l.outageHours }))
    .sort((a, b) => ["critical", "essential", "standard", "flexible"].indexOf(a.priority) - ["critical", "essential", "standard", "flexible"].indexOf(b.priority) || b.unservedKwh - a.unservedKwh);
  const recoveredAt = run.steps.find((s) => s.t >= stressEnd && s.soc >= run.reserveSoc && !s.tripped)?.t ?? null;
  const firstFullDay = days.find((d) => d.day * 24 >= stressEnd && d.unservedKwh < 0.05)?.day ?? null;
  return { run, days, affected, depletedAt: run.summary.depletedAt, recoveredAt, firstFullDay };
}

/** Smallest addition that brings unserved energy to ≤ 1% of demand (managed dispatch), by bisection. */
export function sizeFor(cfg: ScenarioConfig, stress: Stress, days: number, schedule: Schedule): Sizing {
  const ok = (c: ScenarioConfig) => {
    const s = simulate(c, { strategy: "intelligent", schedule, stress, days }).summary;
    return s.unservedKwh <= 0.01 * s.demandKwh;
  };
  const search = (apply: (x: number) => ScenarioConfig, hi: number): number | null => {
    if (ok(apply(0))) return 0;
    if (!ok(apply(hi))) return null;
    let lo = 0;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (ok(apply(mid))) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const maxKwp = Math.max(30, cfg.solarKwp * 3);
  const maxKwh = Math.max(80, cfg.batteryKwh * 4);
  const addKwp = search((x) => ({ ...cfg, solarKwp: cfg.solarKwp + x }), maxKwp);
  const addKwh = search((x) => ({ ...cfg, batteryKwh: cfg.batteryKwh + x }), maxKwh);
  return {
    addKwp: addKwp === null ? null : Math.ceil(addKwp * 2) / 2,
    addKwh: addKwh === null ? null : Math.ceil(addKwh / 5) * 5,
    target: "unserved energy ≤ 1% of demand with managed dispatch",
    searchedUpToKwp: maxKwp,
    searchedUpToKwh: maxKwh,
  };
}

export function runResilience(cfg: ScenarioConfig, input: ResilienceInput): ResilienceResult {
  const { stress, days, stressEnd } = toStress(cfg, input);
  const opt = optimiseSchedule(cfg, stress);
  const baseline = simulate(cfg, { strategy: "baseline", stress, days });
  const intelligent = simulate(cfg, { strategy: "intelligent", schedule: opt.schedule, stress, days });
  const withWeather = (o: StrategyOutcome) => ({ ...o, days: o.days.map((d) => ({ ...d, weather: stress.weatherByDay![d.day] })) });
  return {
    input,
    hours: days * 24,
    stressEnd,
    baseline: withWeather(outcome(baseline, stressEnd)),
    intelligent: withWeather(outcome(intelligent, stressEnd)),
    sizing: sizeFor(cfg, stress, days, opt.schedule),
    schedule: opt.schedule,
  };
}
