/**
 * Flexible-load scheduling optimiser.
 *
 * Decision variables: the start time of each flexible load (water pump, mill,
 * workshop), on a 30-minute grid inside each load's permitted window.
 *
 * Objective (lower is better), evaluated by running the full managed-dispatch
 * simulation over the same day the comparison reports:
 *
 *   J = 1000·U_critical + 100·U_essential + 10·U_standard + 9·U_flexible
 *       + 0.05·E_discharge − 0.02·E_end + 0.001·Σ|shift|
 *
 *   U_p        unserved energy of priority class p (kWh)
 *   E_discharge battery energy discharged (kWh) — penalises unnecessary cycling
 *   E_end      energy stored at the end of the day (kWh) — values energy left for the night after
 *   shift      hours moved from the operator's schedule — prefers minimal change on ties
 *
 * Method: a greedy initial placement on the solar-surplus profile, then
 * coordinate descent (each load in turn tries every start time while the others
 * stay fixed) until no single move improves J. The result is therefore
 * COORDINATE-WISE OPTIMAL for this objective and grid: no single load can be
 * moved to a better time. It is not proven to be the global optimum over all
 * joint rearrangements, and it is only as good as the simulated forecast.
 */
import { flexibleSpec, FLEXIBLE_IDS, LOAD_MAP } from "./loads";
import { resolveSchedule, simulate, type SimOptions } from "./simulate";
import type { LoadId, Priority, ScenarioConfig, Schedule, SimResult, Stress, Summary } from "./types";

export const OBJECTIVE_WEIGHTS: Record<Priority, number> = { critical: 1000, essential: 100, standard: 10, flexible: 9 };
const W_DISCHARGE = 0.05;
const W_END = 0.02;
const W_SHIFT = 0.001;
const HORIZON_DAYS = 1;
const MAX_PASSES = 8;

export type OptimisationResult = {
  schedule: Record<LoadId, number>;
  baselineSchedule: Record<LoadId, number>;
  objective: number;
  baselineObjective: number;
  evaluated: number;
  passes: number;
  method: string;
  /** "coordinate-wise optimal" only when a full pass found no improving move. */
  guarantee: "coordinate-wise optimal" | "improved, not converged" | "unchanged";
};

export function objective(s: Summary, capacityKwh: number, shiftHours: number): number {
  let j = 0;
  for (const p of Object.keys(OBJECTIVE_WEIGHTS) as Priority[]) j += OBJECTIVE_WEIGHTS[p] * s.unservedByPriority[p];
  return j + W_DISCHARGE * s.batteryDischargeKwh - W_END * s.endSoc * capacityKwh + W_SHIFT * shiftHours;
}

function candidates(id: LoadId, cfg: ScenarioConfig, stress: Stress): number[] {
  const spec = flexibleSpec(id, cfg, stress);
  const out: number[] = [];
  for (let s = spec.earliest; s <= spec.latest - spec.runHours + 1e-9; s += 0.5) out.push(s);
  return out;
}

export function optimiseSchedule(cfg: ScenarioConfig, stress: Stress = {}, simOpts: Partial<SimOptions> = {}): OptimisationResult {
  const base = resolveSchedule(cfg, undefined, stress);
  let evaluated = 0;
  const shift = (sch: Record<LoadId, number>) => FLEXIBLE_IDS.reduce((a, id) => a + Math.abs(sch[id] - base[id]), 0);
  const cost = (sch: Record<LoadId, number>) => {
    evaluated++;
    const r = simulate(cfg, { ...simOpts, strategy: "intelligent", schedule: sch, stress, days: HORIZON_DAYS });
    return objective(r.summary, r.capacityKwh, shift(sch));
  };

  const baselineObjective = cost(base);

  // Greedy initial placement: largest energy first, into the window with most solar surplus.
  const fixed = simulate(cfg, { ...simOpts, strategy: "intelligent", schedule: base, stress, days: 1 });
  const surplus = fixed.steps.map((st) => {
    const flexKw = FLEXIBLE_IDS.reduce((a, id) => a + st.loads[id].demand, 0);
    return st.pvKw - (st.demandKw - flexKw);
  });
  const greedy = { ...base };
  const order = [...FLEXIBLE_IDS].sort((a, b) => {
    const sa = flexibleSpec(a, cfg, stress);
    const sb = flexibleSpec(b, cfg, stress);
    return sb.powerKw * sb.runHours - sa.powerKw * sa.runHours;
  });
  for (const id of order) {
    const spec = flexibleSpec(id, cfg, stress);
    let best = greedy[id];
    let bestScore = -Infinity;
    for (const s of candidates(id, cfg, stress)) {
      let score = 0;
      for (let i = Math.round(s * 4); i < Math.round((s + spec.runHours) * 4); i++) score += Math.min(spec.powerKw, surplus[i] ?? 0);
      if (score > bestScore + 1e-9) {
        bestScore = score;
        best = s;
      }
    }
    greedy[id] = best;
    for (let i = Math.round(best * 4); i < Math.round((best + spec.runHours) * 4); i++) surplus[i] -= spec.powerKw;
  }

  let current = { ...base };
  let currentCost = baselineObjective;
  const greedyCost = cost(greedy);
  if (greedyCost < currentCost - 1e-9) {
    current = greedy;
    currentCost = greedyCost;
  }

  // Coordinate descent.
  let passes = 0;
  let improved = true;
  while (improved && passes < MAX_PASSES) {
    improved = false;
    passes++;
    for (const id of FLEXIBLE_IDS) {
      for (const s of candidates(id, cfg, stress)) {
        if (Math.abs(s - current[id]) < 1e-9) continue;
        const trial = { ...current, [id]: s };
        const c = cost(trial);
        if (c < currentCost - 1e-6) {
          current = trial;
          currentCost = c;
          improved = true;
        }
      }
    }
  }

  const changed = FLEXIBLE_IDS.some((id) => Math.abs(current[id] - base[id]) > 1e-9);
  return {
    schedule: current,
    baselineSchedule: base,
    objective: currentCost,
    baselineObjective,
    evaluated,
    passes,
    method: "Greedy placement on the solar surplus, then coordinate descent over 30-minute start times, each candidate scored by a full 24-hour dispatch simulation.",
    // `improved` is false only if the last pass tried every single-load move and none helped.
    guarantee: improved ? "improved, not converged" : changed ? "coordinate-wise optimal" : "unchanged",
  };
}

export type ScheduleChange = { id: LoadId; name: string; from: number; to: number; runHours: number; powerKw: number };

export function scheduleChanges(opt: OptimisationResult, cfg: ScenarioConfig, stress: Stress = {}): ScheduleChange[] {
  return FLEXIBLE_IDS.filter((id) => Math.abs(opt.schedule[id] - opt.baselineSchedule[id]) > 1e-9).map((id) => {
    const spec = flexibleSpec(id, cfg, stress);
    return { id, name: LOAD_MAP[id].name, from: opt.baselineSchedule[id], to: opt.schedule[id], runHours: spec.runHours, powerKw: spec.powerKw };
  });
}

/** The three runs the comparison is built from, all on the same day and physics. */
export type Comparison = {
  baseline: SimResult; // uncontrolled, operator schedule
  priority: SimResult; // managed dispatch, operator schedule
  intelligent: SimResult; // managed dispatch, optimised schedule
  optimisation: OptimisationResult;
  changes: ScheduleChange[];
};

export function compare(cfg: ScenarioConfig, stress: Stress = {}, days = 1): Comparison {
  const optimisation = optimiseSchedule(cfg, stress);
  return {
    baseline: simulate(cfg, { strategy: "baseline", stress, days }),
    priority: simulate(cfg, { strategy: "priority", stress, days }),
    intelligent: simulate(cfg, { strategy: "intelligent", schedule: optimisation.schedule, stress, days }),
    optimisation,
    changes: scheduleChanges(optimisation, cfg, stress),
  };
}
