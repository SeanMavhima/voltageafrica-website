/**
 * VoltageAfrica AI Energy Lab · shared types.
 *
 * Units, everywhere in this module:
 *   power   kW   (instantaneous, averaged over one time step)
 *   energy  kWh  (power × hours)
 *   time    hours from 00:00 of simulated day 1; one step = STEP_H hours
 *   state of charge (SOC) as a fraction 0..1 of the battery's *current* capacity
 *
 * Everything here is a SIMULATION of a conceptual community microgrid. No value
 * is a measurement from a deployed VoltageAfrica system.
 */

export const STEP_H = 0.25; // 15-minute dispatch interval
export const STEPS_PER_DAY = Math.round(24 / STEP_H);
export const ENGINE_VERSION = "1.0.0";

export type Weather = "clear" | "partly" | "afternoon" | "cloudy" | "rainy";

export type Priority = "critical" | "essential" | "standard" | "flexible";
export const PRIORITIES: Priority[] = ["critical", "essential", "standard", "flexible"];

export type LoadGroup = "homes" | "community" | "business" | "water" | "productive";

/** How a load's demand scales with the scenario. */
export type DemandScale = "household" | "business" | "community" | "none";

export type LoadId =
  | "lighting"
  | "phones"
  | "appliances"
  | "refrigeration"
  | "clinic"
  | "school"
  | "business"
  | "coldroom"
  | "pump"
  | "mill"
  | "workshop";

export type FlexibleSpec = {
  /** Rated power while running, kW. */
  powerKw: number;
  /** Hours of running required per day. */
  runHours: number;
  /** Earliest start and latest finish allowed (hours, 0..24). */
  earliest: number;
  latest: number;
};

export type LoadDef = {
  id: LoadId;
  name: string;
  short: string;
  group: LoadGroup;
  priority: Priority;
  scale: DemandScale;
  /** Human description of the operating schedule (for the UI). */
  schedule: string;
  /** Present only on loads that can be rescheduled within a window. */
  flexible?: FlexibleSpec;
};

/** Scenario parameters. Bounds are enforced by the Zod schema in ./schema.ts. */
export type ScenarioConfig = {
  households: number;
  solarKwp: number;
  batteryKwh: number;
  /** Fraction of capacity kept for critical loads (0..1). */
  reservePct: number;
  /** State of charge at 00:00 of day 1 (0..1). */
  initialSoc: number;
  weather: Weather;
  /** Weather for the following day (forecast and multi-day runs). */
  weatherTomorrow: Weather;
  /** Demand multipliers (1 = reference profile). */
  householdDemand: number;
  businessDemand: number;
  communityDemand: number;
  /** Start hour of each flexible load in the baseline (operator's current) schedule. */
  pumpStart: number;
  millStart: number;
  workshopStart: number;
  /** Day of year used for the sun's path (1..365). */
  dayOfYear: number;
};

/** Equipment and physics constants (version-controlled, not CMS-editable). */
export type SystemSpec = {
  latitudeDeg: number;
  /** PV system derate: soiling, wiring, mismatch, MPPT and inverter losses. */
  pvDerate: number;
  /** Power temperature coefficient of the modules, per °C. */
  pvTempCoeff: number;
  /** Nominal operating cell temperature, °C. */
  noctC: number;
  minSoc: number;
  maxSoc: number;
  chargeEff: number;
  dischargeEff: number;
  /** Max charge / discharge power as a fraction of capacity per hour (C-rate). */
  cRate: number;
  /** AC capacity of the inverter(s), kW, as a multiple of PV kWp (min 6 kW). */
  inverterRatio: number;
  /** Baseline low-voltage disconnect: SOC needed to reconnect after a trip. */
  reconnectSoc: number;
};

/** Stress-test modifiers (resilience lab and what-if variants). */
export type Stress = {
  /** Multi-day weather sequence; overrides config.weather / weatherTomorrow. */
  weatherByDay?: Weather[];
  /** Extra demand on every load, fraction (0.2 = +20%). */
  demandIncrease?: number;
  /** Extra demand 17:00–23:00 on household loads, fraction. */
  eveningIncrease?: number;
  /** Battery state of health (1 = new). */
  batteryHealth?: number;
  /** Fraction of the PV array available (1 = all strings working). */
  solarAvailable?: number;
  /** Battery bank offline for this many hours from 18:00 on day 1. */
  batteryOutageHours?: number;
  /** Additional households connected. */
  extraHouseholds?: number;
  /** Fraction of battery capacity unavailable (e.g. a string isolated). */
  storageUnavailable?: number;
};

export type Strategy = "baseline" | "priority" | "intelligent";

/** Start hour for each flexible load. */
export type Schedule = Partial<Record<LoadId, number>>;

export type StepResult = {
  t: number; // hour from start
  pvKw: number;
  demandKw: number;
  servedKw: number;
  unservedKw: number;
  /** + charging (AC into battery), − discharging (AC out of battery). */
  batteryKw: number;
  curtailedKw: number;
  pvToLoadKw: number;
  soc: number; // at the END of the step
  socKwh: number;
  tripped: boolean;
  loads: Record<LoadId, { demand: number; served: number }>;
};

export type LoadSummary = { id: LoadId; demandKwh: number; servedKwh: number; unservedKwh: number; outageHours: number };

export type Summary = {
  hours: number;
  demandKwh: number;
  servedKwh: number;
  unservedKwh: number;
  servedFraction: number;
  unservedByPriority: Record<Priority, number>;
  demandByPriority: Record<Priority, number>;
  pvAvailableKwh: number;
  pvUsedKwh: number;
  pvToLoadKwh: number;
  curtailedKwh: number;
  solarUtilisation: number;
  batteryChargeKwh: number; // AC energy into the battery
  batteryDischargeKwh: number; // AC energy out of the battery
  batteryLossesKwh: number;
  equivalentCycles: number;
  minSoc: number;
  endSoc: number;
  startSoc: number;
  hoursBelowReserve: number;
  peakDemandKw: number;
  peakServedKw: number;
  hoursFullyServed: number;
  outageHours: number;
  /** First hour at which the battery reached its floor, or null. */
  depletedAt: number | null;
  loads: LoadSummary[];
};

export type SimResult = {
  config: ScenarioConfig;
  strategy: Strategy;
  schedule: Schedule;
  steps: StepResult[];
  summary: Summary;
  capacityKwh: number;
  reserveSoc: number;
};
