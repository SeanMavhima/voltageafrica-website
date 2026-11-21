/**
 * Community demand model: eleven load categories with daily profiles,
 * priorities and (for three productive loads) a reschedulable run window.
 *
 * Reference profiles are for 60 connected households and are ASSUMPTIONS for a
 * conceptual hub, chosen to be plausible for rural Southern Africa. They are not
 * survey results or metered data.
 */
import { clamp01, smoothWindow } from "./math";
import type { FlexibleSpec, LoadDef, LoadId, Priority, ScenarioConfig, Stress } from "./types";

export const REFERENCE_HOUSEHOLDS = 60;

export const LOADS: LoadDef[] = [
  { id: "clinic", name: "Health clinic", short: "Clinic", group: "community", priority: "critical", scale: "community", schedule: "Open 07:00–18:00 · vaccine fridge and night lighting always on" },
  { id: "lighting", name: "Household lighting", short: "Lighting", group: "homes", priority: "essential", scale: "household", schedule: "Mostly 18:00–22:30, some at dawn, security lights overnight" },
  { id: "refrigeration", name: "Refrigeration", short: "Fridges", group: "homes", priority: "essential", scale: "household", schedule: "Continuous, compressor duty rises in the afternoon heat" },
  { id: "school", name: "School", short: "School", group: "community", priority: "essential", scale: "community", schedule: "Lessons 07:30–15:30 · lights, computers, projector" },
  { id: "phones", name: "Mobile phone charging", short: "Phones", group: "homes", priority: "standard", scale: "household", schedule: "Spread through the day, 06:00–22:00" },
  { id: "appliances", name: "Household appliances", short: "TV · radio · fans", group: "homes", priority: "standard", scale: "household", schedule: "Evening peak 18:30–22:30, light use by day" },
  { id: "business", name: "Small businesses", short: "Shops", group: "business", priority: "standard", scale: "business", schedule: "Trading 08:00–20:30 · evening lighting" },
  { id: "coldroom", name: "Cold room (produce)", short: "Cold room", group: "productive", priority: "standard", scale: "business", schedule: "Continuous, higher by day" },
  { id: "pump", name: "Water pumping", short: "Pump", group: "water", priority: "flexible", scale: "household", schedule: "6 h per day into an elevated tank, any time 06:00–18:00", flexible: { powerKw: 2.2, runHours: 6, earliest: 6, latest: 18 } },
  { id: "mill", name: "Grain milling", short: "Mill", group: "productive", priority: "flexible", scale: "business", schedule: "3 h per day, opening hours 07:00–19:00", flexible: { powerKw: 5.5, runHours: 3, earliest: 7, latest: 19 } },
  { id: "workshop", name: "Workshop tools", short: "Workshop", group: "productive", priority: "flexible", scale: "business", schedule: "2 h per day of welding / carpentry, 08:00–17:00", flexible: { powerKw: 2, runHours: 2, earliest: 8, latest: 17 } },
];

export const LOAD_MAP = Object.fromEntries(LOADS.map((l) => [l.id, l])) as Record<LoadId, LoadDef>;
export const FLEXIBLE_IDS: LoadId[] = LOADS.filter((l) => l.flexible).map((l) => l.id);

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  essential: "Essential",
  standard: "Standard",
  flexible: "Flexible",
};
export const PRIORITY_NOTE: Record<Priority, string> = {
  critical: "Supplied first; may draw on the battery reserve.",
  essential: "Supplied before standard loads; never uses the reserve.",
  standard: "Supplied when energy allows.",
  flexible: "Can run at a different time of day within its window.",
};

/** Reference power profile at hour h (0..24) for 60 households, kW. */
function referenceKw(id: LoadId, h: number): number {
  const w = smoothWindow;
  switch (id) {
    case "lighting": // 60 × 25 W at the evening peak
      return 1.5 * (w(h, 18, 22.5, 0.8) + 0.45 * w(h, 5.2, 6.6, 0.5)) + 0.15;
    case "phones":
      return 0.48 * (0.25 + 0.75 * w(h, 6, 22, 1));
    case "appliances": // 60 × 40 W at peak
      return 2.4 * w(h, 18.5, 22.5, 1) + 0.35 * w(h, 7, 18, 1) + 0.05;
    case "refrigeration": // ~6 fridges/freezers; duty rises with afternoon heat
      return 0.42 * (1 + 0.3 * Math.cos((2 * Math.PI * (h - 15)) / 24));
    case "clinic":
      return 0.3 + 0.4 * w(h, 7, 18, 0.5);
    case "school":
      return 0.05 + 1.75 * w(h, 7.5, 15.5, 0.5);
    case "business":
      return 0.08 + 1.0 * w(h, 8, 18.5, 0.5) + 1.8 * w(h, 18, 20.5, 0.5);
    case "coldroom":
      return 0.45 * (1 + 0.35 * Math.cos((2 * Math.PI * (h - 14)) / 24));
    default:
      return 0;
  }
}

/** Effective flexible specification for a scenario (run time scales with demand). */
export function flexibleSpec(id: LoadId, cfg: ScenarioConfig, stress: Stress = {}): FlexibleSpec {
  const base = LOAD_MAP[id].flexible!;
  const hh = cfg.households + (stress.extraHouseholds ?? 0);
  const factor = id === "pump" ? hh / REFERENCE_HOUSEHOLDS : cfg.businessDemand;
  const windowH = base.latest - base.earliest;
  // Run time in half-hour increments, at least 30 minutes, never longer than the window.
  const runHours = Math.min(windowH, Math.max(0.5, Math.round(base.runHours * factor * (1 + (stress.demandIncrease ?? 0)) * 2) / 2));
  return { ...base, runHours };
}

/** Clamp a start hour so the whole run fits in the load's window. */
export function clampStart(id: LoadId, start: number, spec: FlexibleSpec): number {
  const s = Math.round(start * 4) / 4;
  return Math.min(spec.latest - spec.runHours, Math.max(spec.earliest, s));
}

/** Fraction of [t0, t1) that a run [start, start + run) overlaps, using the day-hour of t0. */
function overlap(dayHour0: number, dt: number, start: number, run: number): number {
  const a = Math.max(dayHour0, start);
  const b = Math.min(dayHour0 + dt, start + run);
  return clamp01((b - a) / dt);
}

export type DemandContext = { cfg: ScenarioConfig; stress: Stress; schedule: Record<LoadId, number> | Partial<Record<LoadId, number>> };

/**
 * Average demand of one load over the step starting at absolute hour t (kW).
 * Non-flexible loads are evaluated at the step midpoint; flexible loads by exact overlap.
 */
export function loadDemandKw(def: LoadDef, t: number, dt: number, ctx: DemandContext): number {
  const { cfg, stress } = ctx;
  const dayHour = ((t % 24) + 24) % 24;
  if (def.flexible) {
    const spec = flexibleSpec(def.id, cfg, stress);
    const start = clampStart(def.id, ctx.schedule[def.id] ?? spec.earliest, spec);
    return spec.powerKw * overlap(dayHour, dt, start, spec.runHours);
  }
  const mid = dayHour + dt / 2;
  let kw = referenceKw(def.id, mid);
  const hh = cfg.households + (stress.extraHouseholds ?? 0);
  if (def.scale === "household") kw *= (hh / REFERENCE_HOUSEHOLDS) * cfg.householdDemand;
  else if (def.scale === "business") kw *= cfg.businessDemand;
  else if (def.scale === "community") kw *= cfg.communityDemand;
  kw *= 1 + (stress.demandIncrease ?? 0);
  if (stress.eveningIncrease && def.group === "homes" && mid >= 17 && mid < 23) kw *= 1 + stress.eveningIncrease;
  return Math.max(0, kw);
}

/** Baseline schedule from the scenario's operator start times. */
export function baselineSchedule(cfg: ScenarioConfig): Record<LoadId, number> {
  return { pump: cfg.pumpStart, mill: cfg.millStart, workshop: cfg.workshopStart } as Record<LoadId, number>;
}
