/**
 * 24-hour SIMULATED forecast.
 *
 * This is not a trained predictive model and uses no field data. It projects the
 * simulator forward from the selected moment using the scenario's weather for
 * today and tomorrow, and brackets it with two scenario bounds:
 *
 *   central  clearness factor of each weather class, reference demand
 *   low case lower clearness bound of each class, demand +10%  (pessimistic)
 *   high case upper clearness bound of each class, demand −10% (optimistic)
 *
 * The bounds are assumptions, not statistical quantiles. The provider
 * interfaces below are where measured weather forecasts and metered telemetry
 * would plug in once a pilot hub produces data.
 */
import { flexibleSpec, FLEXIBLE_IDS, LOAD_MAP } from "./loads";
import { formatClock } from "./math";
import { simulate, socAt } from "./simulate";
import { WEATHER } from "./solar";
import { STEP_H, type LoadId, type ScenarioConfig, type Schedule, type SimResult, type Weather } from "./types";

/** Future integration points (not implemented: no live data exists yet). */
export interface WeatherProvider {
  /** Clearness factor (0..1) for an absolute hour, or undefined to fall back to the scenario class. */
  clearness(t: number): number | undefined;
  source: string;
}
export interface TelemetryProvider {
  /** Latest measured state of charge (0..1) and its timestamp. */
  stateOfCharge(): { soc: number; at: string } | null;
  source: string;
}

export const DEMAND_BAND = 0.1;

export type ForecastPoint = { t: number; pv: number; pvLow: number; pvHigh: number; demand: number; demandHigh: number; demandLow: number; soc: number; socLow: number; unserved: number; unservedLow: number };
export type Window = { start: number; end: number; kwh: number };
export type FlexWindow = { id: LoadId; name: string; start: number; end: number; solarShareCentral: number; solarShareLow: number };

export type Forecast = {
  from: number;
  startSoc: number;
  points: ForecastPoint[];
  totals: { pv: number; pvLow: number; pvHigh: number; demand: number; unserved: number; unservedLow: number; endSoc: number; endSocLow: number; minSocLow: number };
  shortages: (Window & { case: "central" | "low case" })[];
  surpluses: (Window & { curtailed: boolean })[];
  flexWindows: FlexWindow[];
  weather: Weather[];
  method: string;
  limitations: string[];
};

function windows(points: ForecastPoint[], pick: (p: ForecastPoint) => number, threshold: number): Window[] {
  const out: Window[] = [];
  let cur: Window | null = null;
  for (const p of points) {
    const v = pick(p);
    if (v > threshold) {
      if (!cur) cur = { start: p.t, end: p.t + STEP_H, kwh: 0 };
      cur.end = p.t + STEP_H;
      cur.kwh += v * STEP_H;
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * @param today   the day's run (managed dispatch) used to read the state of charge at `from`
 * @param from    absolute hour to forecast from (0..24 on day 1)
 */
export function forecast24h(cfg: ScenarioConfig, today: SimResult, from: number, schedule: Schedule): Forecast {
  const startSoc = socAt(today, from);
  const run = (bound: "central" | "low" | "high") =>
    simulate(cfg, {
      strategy: "intelligent",
      schedule,
      startT: from,
      startSoc,
      hours: 24,
      clearness: bound === "central" ? undefined : (_d, w) => (bound === "low" ? WEATHER[w].low : WEATHER[w].high),
      demandFactor: bound === "low" ? 1 + DEMAND_BAND : bound === "high" ? 1 - DEMAND_BAND : 1,
    });
  const c = run("central");
  const lo = run("low");
  const hi = run("high");

  const points: ForecastPoint[] = c.steps.map((s, i) => ({
    t: s.t,
    pv: s.pvKw,
    pvLow: lo.steps[i].pvKw,
    pvHigh: hi.steps[i].pvKw,
    demand: s.demandKw,
    demandHigh: lo.steps[i].demandKw,
    demandLow: hi.steps[i].demandKw,
    soc: s.soc,
    socLow: lo.steps[i].soc,
    unserved: s.unservedKw,
    unservedLow: lo.steps[i].unservedKw,
  }));

  const centralShort = windows(points, (p) => p.unserved, 0.05).map((w) => ({ ...w, case: "central" as const }));
  const lowShort = windows(points, (p) => p.unservedLow, 0.05)
    .filter((w) => !centralShort.some((cw) => cw.start < w.end && w.start < cw.end))
    .map((w) => ({ ...w, case: "low case" as const }));
  const surpluses = windows(points, (p) => p.pv - p.demand, 0.5).map((w) => ({
    ...w,
    curtailed: c.steps.some((s) => s.t >= w.start && s.t < w.end && s.curtailedKw > 0.05),
  }));

  // Best operating window for each flexible load within the horizon, by solar coverage.
  const flexWindows: FlexWindow[] = [];
  const netCentral = c.steps.map((s) => s.pvKw - (s.demandKw - FLEXIBLE_IDS.reduce((a, id) => a + s.loads[id].demand, 0)));
  const netLow = lo.steps.map((s) => s.pvKw - (s.demandKw - FLEXIBLE_IDS.reduce((a, id) => a + s.loads[id].demand, 0)));
  for (const id of FLEXIBLE_IDS) {
    const spec = flexibleSpec(id, cfg);
    let best: FlexWindow | null = null;
    let bestScore = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const t = points[i].t;
      const dh = ((t % 24) + 24) % 24;
      if (dh < spec.earliest - 1e-9 || dh + spec.runHours > spec.latest + 1e-9 || (dh * 2) % 1 !== 0) continue;
      const len = Math.round(spec.runHours / STEP_H);
      if (i + len > points.length) break;
      let sc = 0;
      let sl = 0;
      let margin = 0;
      for (let j = i; j < i + len; j++) {
        sc += Math.min(spec.powerKw, Math.max(0, netCentral[j]));
        sl += Math.min(spec.powerKw, Math.max(0, netLow[j]));
        margin += netCentral[j];
      }
      const shareC = sc / (spec.powerKw * len);
      const shareL = sl / (spec.powerKw * len);
      // Rank by solar coverage in the central case, then the low case, then the surplus margin.
      const score = shareC * 1000 + shareL * 10 + margin * 1e-3;
      if (!best || score > bestScore) {
        bestScore = score;
        best = { id, name: LOAD_MAP[id].name, start: t, end: t + spec.runHours, solarShareCentral: shareC, solarShareLow: shareL };
      }
    }
    if (best) flexWindows.push(best);
  }

  const sum = (r: SimResult) => r.summary;
  const weather = [0, 1].map((d) => (d === 0 ? cfg.weather : cfg.weatherTomorrow));
  return {
    from,
    startSoc,
    points,
    totals: {
      pv: sum(c).pvAvailableKwh,
      pvLow: sum(lo).pvAvailableKwh,
      pvHigh: sum(hi).pvAvailableKwh,
      demand: sum(c).demandKwh,
      unserved: sum(c).unservedKwh,
      unservedLow: sum(lo).unservedKwh,
      endSoc: sum(c).endSoc,
      endSocLow: sum(lo).endSoc,
      minSocLow: sum(lo).minSoc,
    },
    shortages: [...centralShort, ...lowShort].sort((a, b) => a.start - b.start),
    surpluses,
    flexWindows,
    weather,
    method: `Simulated projection from ${formatClock(from)} for 24 hours, starting at the simulated state of charge (${Math.round(startSoc * 100)}%). Central case uses each weather class's clearness factor; the low and high cases use its assumed lower and upper bounds with demand ±${DEMAND_BAND * 100}%.`,
    limitations: [
      "Simulated forecast: no measured weather, satellite irradiance or metered demand is used.",
      "Bounds are scenario assumptions, not statistical confidence intervals.",
      "Weather is constant within each calendar day; real cloud cover changes hour by hour.",
      "Designed so a weather API (WeatherProvider) and pilot telemetry (TelemetryProvider) can replace the simulated inputs.",
    ],
  };
}
