/**
 * Recommendations with their reasoning. Every number in a recommendation is read
 * from a simulation run; the wording only explains it.
 */
import { LOAD_MAP, baselineSchedule } from "./loads";
import { formatClock, round } from "./math";
import { compare, type Comparison, type ScheduleChange } from "./optimize";
import { sizeFor, type Sizing } from "./resilience";
import { simulate } from "./simulate";
import { WEATHER } from "./solar";
import { STEP_H, type LoadId, type ScenarioConfig, type SimResult } from "./types";

export type RecommendationKind = "schedule" | "reserve" | "shed" | "capacity" | "surplus" | "evening" | "steady";

export type Recommendation = {
  id: string;
  kind: RecommendationKind;
  title: string;
  why: string;
  effect: string;
  tradeoff: string;
  basis: string;
  /** Simulated figures the text is built from (also handed to the copilot). */
  figures: Record<string, number | string>;
};

const kwh = (v: number) => `${round(v, 1)} kWh`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const clockRange = (a: number, b: number) => `${formatClock(a)}–${formatClock(b)}`;

const TRADEOFF: Partial<Record<LoadId, string>> = {
  pump: "Water is pumped at a different time. This only works if the elevated tank holds enough water to cover the hours when the pump does not run, and the pump's own schedule (and anyone who operates it) can change.",
  mill: "Customers would bring grain at a different time of day, and the operator's working hours change. Some demand may not move, for example after harvest or market days.",
  workshop: "Workshop work moves to another part of the day; jobs that need evening hours would have to be planned differently.",
};

/** Solar surplus (kW above non-flexible demand) averaged over a run window. */
function surplusIn(run: SimResult, start: number, hours: number): number {
  let s = 0;
  let n = 0;
  for (const st of run.steps) {
    if (st.t >= start - 1e-9 && st.t < start + hours - 1e-9) {
      const flex = st.loads.pump.demand + st.loads.mill.demand + st.loads.workshop.demand;
      s += st.pvKw - (st.demandKw - flex);
      n++;
    }
  }
  return n ? s / n : 0;
}

function windowOf(run: SimResult, pick: (s: SimResult["steps"][number]) => boolean): [number, number] | null {
  const hits = run.steps.filter(pick);
  return hits.length ? [hits[0].t, hits[hits.length - 1].t + STEP_H] : null;
}

const BASIS = (cfg: ScenarioConfig) =>
  `Simulated ${WEATHER[cfg.weather].label.toLowerCase()} day: ${cfg.solarKwp} kWp solar, ${cfg.batteryKwh} kWh battery, ${cfg.households} households, 15-minute dispatch steps. Load profiles and weather are modelled assumptions, not field measurements.`;

/** A flexible load the optimised dispatch mostly sheds: it is effectively postponed, not moved. */
export function isPostponed(c: Comparison, id: LoadId): boolean {
  const l = c.intelligent.summary.loads.find((x) => x.id === id);
  return !!l && l.demandKwh > 0 && l.unservedKwh >= 0.5 * l.demandKwh;
}

export function scheduleRecommendation(cfg: ScenarioConfig, c: Comparison, ch: ScheduleChange): Recommendation {
  // Contribution of this change within the optimised schedule: compare against the same schedule with only this load reverted.
  const reverted = simulate(cfg, { strategy: "intelligent", schedule: { ...c.optimisation.schedule, [ch.id]: ch.from } });
  const r = reverted.summary;
  const o = c.intelligent.summary;
  const fromSurplus = surplusIn(c.priority, ch.from, ch.runHours);
  const toSurplus = surplusIn(c.priority, ch.to, ch.runHours);
  const dDischarge = o.batteryDischargeKwh - r.batteryDischargeKwh;
  const dDirect = o.pvToLoadKwh - r.pvToLoadKwh;
  const dUnserved = o.unservedKwh - r.unservedKwh;
  const parts = [
    `${dDirect >= 0 ? "+" : "−"}${kwh(Math.abs(dDirect))} of demand supplied directly by solar`,
    `${dDischarge <= 0 ? "−" : "+"}${kwh(Math.abs(dDischarge))} drawn from the battery`,
  ];
  if (Math.abs(dUnserved) > 0.05) parts.push(`unserved energy ${dUnserved < 0 ? "falls" : "rises"} by ${kwh(Math.abs(dUnserved))}`);
  const byPriority = (["critical", "essential", "standard", "flexible"] as const)
    .map((p) => ({ p, d: o.unservedByPriority[p] - r.unservedByPriority[p] }))
    .filter((x) => Math.abs(x.d) > 0.05);
  const shiftsShortage = dUnserved > -0.05 && byPriority.some((x) => x.d < 0) && byPriority.some((x) => x.d > 0);
  if (isPostponed(c, ch.id)) {
    const l = c.intelligent.summary.loads.find((x) => x.id === ch.id)!;
    return {
      id: `postpone-${ch.id}`,
      kind: "shed",
      title: `Postpone ${LOAD_MAP[ch.id].name.toLowerCase()} today`,
      why: `There is not enough energy today to run the ${LOAD_MAP[ch.id].short.toLowerCase()} (${ch.powerKw} kW for ${ch.runHours} h) without taking it from storage that essential loads need later. At its current time it would draw on the battery before the evening peak.`,
      effect: `The energy manager sheds ${kwh(l.unservedKwh)} of its ${kwh(l.demandKwh)} demand. Compared with keeping it at ${formatClock(ch.from)}, the simulation gives ${parts.join(", ")}${byPriority.length ? ` (${byPriority.map((x) => `${x.p} ${x.d < 0 ? "−" : "+"}${kwh(Math.abs(x.d))}`).join(", ")})` : ""}.`,
      tradeoff: `${LOAD_MAP[ch.id].name} does not happen today, or only partly: work and income are lost or delayed to a sunnier day.`,
      basis: `${BASIS(cfg)} The optimiser found no start time at which solar alone could carry this load.`,
      figures: { load: ch.id, unservedKwh: round(l.unservedKwh, 2), demandKwh: round(l.demandKwh, 2), deltaBatteryKwh: round(dDischarge, 2), deltaUnservedKwh: round(dUnserved, 2) },
    };
  }
  return {
    id: `schedule-${ch.id}`,
    kind: "schedule",
    title: `Run the ${LOAD_MAP[ch.id].short.toLowerCase()} ${clockRange(ch.to, ch.to + ch.runHours)} instead of ${clockRange(ch.from, ch.from + ch.runHours)}`,
    why: `Solar output is expected to exceed the rest of the community's demand by ${round(toSurplus, 1)} kW on average in the proposed window, against ${round(fromSurplus, 1)} kW in the current one. The ${LOAD_MAP[ch.id].name.toLowerCase()} draws ${ch.powerKw} kW for ${ch.runHours} h.`,
    effect: `Compared with the optimised schedule but this load left at its current time, the simulation gives ${parts.join(", ")}.${
      shiftsShortage
        ? ` The change moves the shortfall between priority classes (${byPriority.map((x) => `${x.p} ${x.d < 0 ? "−" : "+"}${kwh(Math.abs(x.d))}`).join(", ")}): it protects higher-priority services, not total energy.`
        : ""
    }`,
    tradeoff: TRADEOFF[ch.id] ?? "The load runs at a different time of day.",
    basis: `${BASIS(cfg)} Window chosen by the scheduling optimiser (coordinate search, ${c.optimisation.evaluated} schedules simulated).`,
    figures: { load: ch.id, from: formatClock(ch.from), to: formatClock(ch.to), runHours: ch.runHours, powerKw: ch.powerKw, surplusFromKw: round(fromSurplus, 2), surplusToKw: round(toSurplus, 2), deltaBatteryKwh: round(dDischarge, 2), deltaDirectSolarKwh: round(dDirect, 2), deltaUnservedKwh: round(dUnserved, 2) },
  };
}

export function recommend(cfg: ScenarioConfig, c: Comparison, opts: { sizing?: boolean } = {}): { items: Recommendation[]; sizing: Sizing | null } {
  const items: Recommendation[] = [];
  const b = c.baseline.summary;
  const i = c.intelligent.summary;

  for (const ch of c.changes) items.push(scheduleRecommendation(cfg, c, ch));

  // Reserve for critical services.
  const critB = b.unservedByPriority.critical;
  const critI = i.unservedByPriority.critical;
  if (critB > 0.05 && critI < critB - 0.05) {
    items.push({
      id: "reserve",
      kind: "reserve",
      title: `Hold a ${pct(cfg.reservePct)} battery reserve for the clinic`,
      why: `Without load management the whole network trips when the battery runs out, and the clinic goes dark with everyone else: ${kwh(critB)} of clinic demand goes unserved in the uncontrolled run.`,
      effect: `With priority dispatch, unserved clinic energy is ${kwh(critI)}. Lower-priority loads are switched off one by one as the battery reaches the reserve, instead of the whole network tripping.`,
      tradeoff: `Standard and flexible loads are cut earlier: their unserved energy is ${kwh(i.unservedByPriority.standard + i.unservedByPriority.flexible)} with management against ${kwh(b.unservedByPriority.standard + b.unservedByPriority.flexible)} without. Energy kept in reserve is not used today.`,
      basis: `${BASIS(cfg)} Critical, essential, standard and flexible priorities are assumptions; a real hub would agree them with the community.`,
      figures: { reservePct: cfg.reservePct, clinicUnservedBaselineKwh: round(critB, 2), clinicUnservedManagedKwh: round(critI, 2) },
    });
  }

  // Loads that still cannot be supplied.
  const short = i.loads.filter((l) => l.unservedKwh > 0.05).sort((a, z) => z.unservedKwh - a.unservedKwh);
  if (short.length) {
    const names = short.slice(0, 4).map((l) => `${LOAD_MAP[l.id].short.toLowerCase()} (${kwh(l.unservedKwh)})`);
    const w = windowOf(c.intelligent, (s) => s.unservedKw > 0.05);
    items.push({
      id: "shed",
      kind: "shed",
      title: `Defer or reduce ${short.length === 1 ? LOAD_MAP[short[0].id].short.toLowerCase() : `${short.length} loads`} when storage is low`,
      why: `Even with management, ${kwh(i.unservedKwh)} of demand cannot be supplied${w ? ` between ${formatClock(w[0])} and ${formatClock(w[1])}` : ""}: ${names.join(", ")}.`,
      effect:
        b.outageHours > 0
          ? `Shedding these loads keeps the network up and protects critical services. Without management the network would trip and every load, the clinic included, would lose supply for ${round(b.outageHours, 1)} h in total.`
          : `Without management these loads would have been supplied today, but only by running the battery down to ${pct(b.minSoc)} with nothing held back for the clinic overnight. Management keeps it at or above ${pct(i.minSoc)}.`,
      tradeoff: "These services are interrupted. Shedding moves the shortage to lower-priority users; it does not create energy.",
      basis: BASIS(cfg),
      figures: { unservedManagedKwh: round(i.unservedKwh, 2), loads: short.map((l) => l.id).join(",") },
    });
  }

  // Physical shortfall: operations cannot fix it.
  let sizing: Sizing | null = null;
  if (i.unservedKwh > 0.01 * i.demandKwh) {
    sizing = opts.sizing === false ? null : sizeFor(cfg, {}, 2, c.optimisation.schedule);
    const fixes = [sizing?.addKwp != null ? `about +${sizing.addKwp} kWp of solar` : null, sizing?.addKwh != null ? `about +${sizing.addKwh} kWh of storage` : null].filter(Boolean);
    items.push({
      id: "capacity",
      kind: "capacity",
      title: "Demand exceeds what this system can supply",
      why: `Over the day, demand is ${kwh(i.demandKwh)} and available solar is ${kwh(i.pvAvailableKwh)}, with the battery starting at ${pct(i.startSoc)}. Scheduling and prioritisation leave ${kwh(i.unservedKwh)} (${pct(1 - i.servedFraction)}) unserved.`,
      effect: fixes.length
        ? `The sizing search finds that ${fixes.join(", or ")} would bring unserved energy below 1% of demand over two days of this scenario (each found separately with the other held fixed).`
        : `Within the searched range (up to +${sizing?.searchedUpToKwp ?? "—"} kWp or +${sizing?.searchedUpToKwh ?? "—"} kWh), neither addition alone brings unserved energy below 1%.${i.startSoc < cfg.reservePct ? " Part of the shortfall occurs before sunrise while the battery starts below its reserve: a starting condition that extra equipment does not change." : ""}`,
      tradeoff: "More equipment means more capital cost. Reducing demand (efficient appliances, fewer connections) is the other lever.",
      basis: `${BASIS(cfg)} Sizing by bisection on simulated two-day runs with managed dispatch; not a design study.`,
      figures: { demandKwh: round(i.demandKwh, 1), pvKwh: round(i.pvAvailableKwh, 1), unservedKwh: round(i.unservedKwh, 1), addKwp: sizing?.addKwp ?? "not found", addKwh: sizing?.addKwh ?? "not found" },
    });
  }

  // Unused solar.
  if (i.curtailedKwh > 2) {
    const w = windowOf(c.intelligent, (s) => s.curtailedKw > 0.05);
    items.push({
      id: "surplus",
      kind: "surplus",
      title: `${kwh(i.curtailedKwh)} of solar goes unused once the battery is full`,
      why: `The battery reaches its ${pct(0.95)} limit${w ? ` and generation is curtailed between ${formatClock(w[0])} and ${formatClock(w[1])}` : ""}.`,
      effect: "This is free daytime energy for new productive uses (an extra milling shift, irrigation, ice-making) or for charging a larger battery for the evening.",
      tradeoff: "Adding daytime load is only worth it if it does not raise evening demand on the battery.",
      basis: BASIS(cfg),
      figures: { curtailedKwh: round(i.curtailedKwh, 1) },
    });
  }

  // Evening dependence.
  const evening = c.intelligent.steps.filter((s) => s.t >= 17 && s.t < 24);
  const eveningUnserved = evening.reduce((a, s) => a + s.unservedKw * STEP_H, 0);
  const hh = evening.reduce((a, s) => a + (s.loads.lighting.demand + s.loads.appliances.demand + s.loads.phones.demand) * STEP_H, 0);
  if (eveningUnserved > 0.5 && eveningUnserved <= 0.5 * hh) {
    items.push({
      id: "evening",
      kind: "evening",
      title: "Reduce evening demand on the battery",
      why: `${kwh(eveningUnserved)} of demand is unserved after 17:00, when solar is falling to zero and household use peaks.`,
      effect: `Household lighting, appliances and phone charging use ${kwh(hh)} in the evening. Cutting that by about ${pct(Math.min(1, eveningUnserved / Math.max(hh, 0.1)))} (efficient bulbs and appliances, daytime phone charging) would cover the shortfall in this simulation.`,
      tradeoff: "Depends on household behaviour and appliance upgrades, which the operator does not control.",
      basis: `${BASIS(cfg)} Phone charging is not modelled as shiftable.`,
      figures: { eveningUnservedKwh: round(eveningUnserved, 1), eveningHouseholdKwh: round(hh, 1) },
    });
  }

  if (!items.length) {
    items.push({
      id: "steady",
      kind: "steady",
      title: "No change recommended",
      why: `All ${kwh(i.demandKwh)} of demand is supplied in the simulation, and the battery stays at or above ${pct(i.minSoc)}.`,
      effect: "The current operating schedule is already the best the optimiser found for this scenario.",
      tradeoff: "None in this scenario. Test it under stress in the resilience lab.",
      basis: BASIS(cfg),
      figures: { demandKwh: round(i.demandKwh, 1), minSoc: round(i.minSoc, 3) },
    });
  }
  return { items, sizing };
}

export type Analysis = Comparison & { recommendations: Recommendation[]; sizing: Sizing | null };

export function analyse(cfg: ScenarioConfig): Analysis {
  const c = compare(cfg);
  const { items, sizing } = recommend(cfg, c);
  return { ...c, recommendations: items, sizing };
}

