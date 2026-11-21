/**
 * Time-stepped microgrid dispatch simulator.
 *
 * Two dispatch policies are modelled, both on identical physics:
 *
 *  UNCONTROLLED ("baseline"): a conventional off-grid system with no load
 *  management. Every load draws whenever it wants. If solar plus the battery
 *  cannot cover the whole network, the inverter's low-voltage disconnect (LVD)
 *  trips and the WHOLE network goes dark until the battery has recharged to the
 *  reconnect threshold. An overload (demand above inverter rating) drops the
 *  network for that interval.
 *
 *  MANAGED ("priority" / "intelligent"): an energy management system supplies
 *  loads in priority order (critical → essential → standard → flexible). Only
 *  critical loads may discharge the battery below the reserve; once the reserve
 *  is reached, lower-priority loads are shed individually instead of the whole
 *  network tripping. "intelligent" additionally uses an optimised flexible-load
 *  schedule (see ./optimize.ts); "priority" keeps the operator's schedule.
 *
 * Battery model: energy reservoir with separate charge and discharge
 * efficiencies, SOC limits, a C-rate power limit, and capacity scaled by state
 * of health. No temperature, ageing-within-run or voltage dynamics.
 */
import { LOADS, baselineSchedule, clampStart, flexibleSpec, loadDemandKw } from "./loads";
import { pvPower, WEATHER } from "./solar";
import { STEP_H, PRIORITIES, type LoadId, type Priority, type ScenarioConfig, type Schedule, type SimResult, type StepResult, type Strategy, type Stress, type Summary, type SystemSpec, type Weather } from "./types";

export const SPEC: SystemSpec = {
  latitudeDeg: -19.67, // Shurugwi, Midlands Province, Zimbabwe
  pvDerate: 0.86,
  pvTempCoeff: -0.0037,
  noctC: 45,
  minSoc: 0.1,
  maxSoc: 0.95,
  chargeEff: 0.95,
  dischargeEff: 0.95,
  cRate: 0.5,
  inverterRatio: 0.8,
  reconnectSoc: 0.3,
};

export const DEFAULT_CONFIG: ScenarioConfig = {
  households: 60,
  solarKwp: 30,
  batteryKwh: 80,
  reservePct: 0.25,
  initialSoc: 0.55,
  weather: "clear",
  weatherTomorrow: "clear",
  householdDemand: 1,
  businessDemand: 1,
  communityDemand: 1,
  pumpStart: 7,
  millStart: 16,
  workshopStart: 15,
  dayOfYear: 300,
};

export type SimOptions = {
  strategy: Strategy;
  schedule?: Schedule;
  stress?: Stress;
  days?: number;
  /** Clearness factor override per day (used for forecast bounds). */
  clearness?: (day: number, weather: Weather) => number | undefined;
  /** Demand multiplier (forecast bounds). */
  demandFactor?: number;
  /** Start the run part-way through (absolute hour) with a given SOC; defaults 0 and config.initialSoc. */
  startT?: number;
  startSoc?: number;
  /** Run length in hours (defaults to 24 × days). */
  hours?: number;
};

export function inverterKw(cfg: ScenarioConfig, spec = SPEC) {
  return Math.max(6, cfg.solarKwp * spec.inverterRatio);
}

export function weatherForDay(cfg: ScenarioConfig, stress: Stress | undefined, day: number): Weather {
  const seq = stress?.weatherByDay;
  if (seq && seq.length) return seq[Math.min(day, seq.length - 1)];
  return day === 0 ? cfg.weather : cfg.weatherTomorrow;
}

/** Effective flexible start times (clamped into each load's window). */
export function resolveSchedule(cfg: ScenarioConfig, schedule: Schedule | undefined, stress: Stress = {}): Record<LoadId, number> {
  const base = { ...baselineSchedule(cfg), ...(schedule ?? {}) };
  const out = {} as Record<LoadId, number>;
  for (const l of LOADS) if (l.flexible) out[l.id] = clampStart(l.id, base[l.id] ?? l.flexible.earliest, flexibleSpec(l.id, cfg, stress));
  return out;
}

const emptyByPriority = (): Record<Priority, number> => ({ critical: 0, essential: 0, standard: 0, flexible: 0 });

export function simulate(cfg: ScenarioConfig, opts: SimOptions, spec: SystemSpec = SPEC): SimResult {
  const dt = STEP_H;
  const stress = opts.stress ?? {};
  const days = opts.days ?? 1;
  const startT = opts.startT ?? 0;
  const n = Math.round((opts.hours ?? 24 * days) / dt);
  const managed = opts.strategy !== "baseline";
  const schedule = resolveSchedule(cfg, opts.schedule, stress);

  const capacity = Math.max(0.1, cfg.batteryKwh * (stress.batteryHealth ?? 1) * (1 - (stress.storageUnavailable ?? 0)));
  const floorKwh = spec.minSoc * capacity;
  const reserveSoc = Math.max(spec.minSoc, Math.min(spec.maxSoc, cfg.reservePct));
  const reserveKwh = reserveSoc * capacity;
  const maxKwh = spec.maxSoc * capacity;
  const pmax = spec.cRate * capacity;
  const inv = inverterKw(cfg, spec);
  const solarFactor = stress.solarAvailable ?? 1;
  const ctx = { cfg, stress, schedule };
  const ordered = PRIORITIES.flatMap((p) => LOADS.filter((l) => l.priority === p));

  let socKwh = Math.min(maxKwh, Math.max(0, (opts.startSoc ?? cfg.initialSoc) * capacity));
  const startSoc = socKwh / capacity;
  let tripped = false;
  const steps: StepResult[] = [];

  for (let i = 0; i < n; i++) {
    const t = startT + i * dt;
    const day = Math.floor(t / 24);
    const weather = weatherForDay(cfg, stress, day);
    const k = opts.clearness?.(day, weather) ?? WEATHER[weather].k;
    const pv = pvPower(t % 24, dt, cfg.solarKwp, cfg.dayOfYear, weather, spec, k) * solarFactor;
    const outage = stress.batteryOutageHours ? t >= 18 && t < 18 + stress.batteryOutageHours : false;

    const loads = {} as StepResult["loads"];
    let demand = 0;
    for (const l of ordered) {
      const d = loadDemandKw(l, t, dt, ctx) * (opts.demandFactor ?? 1);
      loads[l.id] = { demand: d, served: 0 };
      demand += d;
    }

    const toAc = (kwh: number) => (outage ? 0 : Math.min(pmax, (Math.max(0, kwh) * spec.dischargeEff) / dt));
    let pvLeft = pv;
    let discharge = 0;
    let served = 0;

    if (managed) {
      const capCritical = toAc(socKwh - floorKwh);
      const capOthers = toAc(socKwh - reserveKwh);
      let invLeft = inv;
      for (const l of ordered) {
        const d = Math.min(loads[l.id].demand, invLeft);
        const fromPv = Math.min(d, pvLeft);
        pvLeft -= fromPv;
        const cap = l.priority === "critical" ? capCritical : capOthers;
        const fromBattery = Math.min(d - fromPv, Math.max(0, cap - discharge));
        discharge += fromBattery;
        const s = fromPv + fromBattery;
        loads[l.id].served = s;
        invLeft -= s;
        served += s;
      }
    } else {
      if (tripped && socKwh / capacity >= spec.reconnectSoc - 1e-9) tripped = false;
      const available = toAc(socKwh - floorKwh);
      if (!tripped && demand <= inv && pv + available >= demand - 1e-9) {
        for (const l of ordered) loads[l.id].served = loads[l.id].demand;
        served = demand;
        const fromPv = Math.min(pv, demand);
        pvLeft = pv - fromPv;
        discharge = demand - fromPv;
      } else if (!tripped && demand > 0) {
        // Overload drops the network for this interval; an energy shortfall trips the LVD (latched)
        // unless the battery is merely offline, in which case the system restarts once it returns.
        if (demand <= inv && !outage) tripped = true;
      }
    }

    // Surplus solar charges the battery; the remainder is curtailed.
    let charge = 0;
    if (!outage) charge = Math.max(0, Math.min(pvLeft, pmax, (maxKwh - socKwh) / (spec.chargeEff * dt)));
    const curtailed = pvLeft - charge;
    socKwh += charge * spec.chargeEff * dt - (discharge * dt) / spec.dischargeEff;
    socKwh = Math.max(0, Math.min(maxKwh, socKwh));

    steps.push({
      t,
      pvKw: pv,
      demandKw: demand,
      servedKw: served,
      unservedKw: Math.max(0, demand - served),
      batteryKw: charge - discharge,
      curtailedKw: curtailed,
      pvToLoadKw: pv - pvLeft,
      soc: socKwh / capacity,
      socKwh,
      tripped,
      loads,
    });
  }

  return { config: cfg, strategy: opts.strategy, schedule, steps, summary: summarise(steps, capacity, reserveSoc, startSoc, spec), capacityKwh: capacity, reserveSoc };
}

export function summarise(steps: StepResult[], capacity: number, reserveSoc: number, startSoc: number, spec: SystemSpec = SPEC): Summary {
  const dt = STEP_H;
  const s: Summary = {
    hours: steps.length * dt,
    demandKwh: 0,
    servedKwh: 0,
    unservedKwh: 0,
    servedFraction: 1,
    unservedByPriority: emptyByPriority(),
    demandByPriority: emptyByPriority(),
    pvAvailableKwh: 0,
    pvUsedKwh: 0,
    pvToLoadKwh: 0,
    curtailedKwh: 0,
    solarUtilisation: 1,
    batteryChargeKwh: 0,
    batteryDischargeKwh: 0,
    batteryLossesKwh: 0,
    equivalentCycles: 0,
    minSoc: startSoc,
    endSoc: steps.length ? steps[steps.length - 1].soc : startSoc,
    startSoc,
    hoursBelowReserve: 0,
    peakDemandKw: 0,
    peakServedKw: 0,
    hoursFullyServed: 0,
    outageHours: 0,
    depletedAt: null,
    loads: [],
  };
  const perLoad = new Map<LoadId, { demandKwh: number; servedKwh: number; unservedKwh: number; outageHours: number }>();
  for (const l of LOADS) perLoad.set(l.id, { demandKwh: 0, servedKwh: 0, unservedKwh: 0, outageHours: 0 });

  for (const st of steps) {
    s.demandKwh += st.demandKw * dt;
    s.servedKwh += st.servedKw * dt;
    s.pvAvailableKwh += st.pvKw * dt;
    s.pvToLoadKwh += st.pvToLoadKw * dt;
    s.curtailedKwh += st.curtailedKw * dt;
    if (st.batteryKw > 0) s.batteryChargeKwh += st.batteryKw * dt;
    else s.batteryDischargeKwh += -st.batteryKw * dt;
    s.minSoc = Math.min(s.minSoc, st.soc);
    if (st.soc < reserveSoc - 1e-6) s.hoursBelowReserve += dt;
    s.peakDemandKw = Math.max(s.peakDemandKw, st.demandKw);
    s.peakServedKw = Math.max(s.peakServedKw, st.servedKw);
    if (st.unservedKw > 0.01) s.outageHours += dt;
    if (s.depletedAt === null && (st.soc <= spec.minSoc + 0.002 || st.tripped)) s.depletedAt = st.t;
    for (const l of LOADS) {
      const x = st.loads[l.id];
      const acc = perLoad.get(l.id)!;
      const un = Math.max(0, x.demand - x.served);
      acc.demandKwh += x.demand * dt;
      acc.servedKwh += x.served * dt;
      acc.unservedKwh += un * dt;
      if (un > 0.005) acc.outageHours += dt;
      s.demandByPriority[l.priority] += x.demand * dt;
      s.unservedByPriority[l.priority] += un * dt;
    }
  }
  s.unservedKwh = Math.max(0, s.demandKwh - s.servedKwh);
  s.servedFraction = s.demandKwh > 0 ? s.servedKwh / s.demandKwh : 1;
  s.pvUsedKwh = s.pvToLoadKwh + s.batteryChargeKwh;
  s.solarUtilisation = s.pvAvailableKwh > 0 ? s.pvUsedKwh / s.pvAvailableKwh : 1;
  s.batteryLossesKwh = s.batteryChargeKwh * (1 - spec.chargeEff) + s.batteryDischargeKwh * (1 / spec.dischargeEff - 1);
  s.equivalentCycles = s.batteryDischargeKwh / spec.dischargeEff / capacity;
  s.hoursFullyServed = s.hours - s.outageHours;
  s.loads = LOADS.map((l) => ({ id: l.id, ...perLoad.get(l.id)! }));
  return s;
}

/** Interpolated system state at an hour within a run (for the live readouts). */
export function stepAt(result: SimResult, hour: number): StepResult {
  const t0 = result.steps[0]?.t ?? 0;
  const i = Math.max(0, Math.min(result.steps.length - 1, Math.floor((hour - t0) / STEP_H + 1e-9)));
  return result.steps[i];
}

/** SOC at the START of the step containing `hour`. */
export function socAt(result: SimResult, hour: number): number {
  const t0 = result.steps[0]?.t ?? 0;
  const i = Math.max(0, Math.min(result.steps.length - 1, Math.floor((hour - t0) / STEP_H + 1e-9)));
  return i === 0 ? result.summary.startSoc : result.steps[i - 1].soc;
}
