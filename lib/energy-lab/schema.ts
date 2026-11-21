/**
 * Validation for anything that crosses a trust boundary (browser → API, CMS → engine).
 * Bounds keep the simulator inside the range its assumptions were written for.
 */
import { z } from "zod";

const weather = z.enum(["clear", "partly", "afternoon", "cloudy", "rainy"]);
const hour = z.number().min(0).max(23.75);

export const BOUNDS = {
  households: { min: 10, max: 200, step: 5 },
  solarKwp: { min: 5, max: 120, step: 1 },
  batteryKwh: { min: 10, max: 400, step: 5 },
  reservePct: { min: 0.1, max: 0.6, step: 0.05 },
  initialSoc: { min: 0.1, max: 0.95, step: 0.05 },
  householdDemand: { min: 0.5, max: 2, step: 0.05 },
  businessDemand: { min: 0.5, max: 2.5, step: 0.05 },
  communityDemand: { min: 0.5, max: 2, step: 0.05 },
} as const;

const b = <K extends keyof typeof BOUNDS>(k: K) => z.number().min(BOUNDS[k].min).max(BOUNDS[k].max);

export const scenarioSchema = z.object({
  households: b("households").int(),
  solarKwp: b("solarKwp"),
  batteryKwh: b("batteryKwh"),
  reservePct: b("reservePct"),
  initialSoc: b("initialSoc"),
  weather,
  weatherTomorrow: weather,
  householdDemand: b("householdDemand"),
  businessDemand: b("businessDemand"),
  communityDemand: b("communityDemand"),
  pumpStart: hour,
  millStart: hour,
  workshopStart: hour,
  dayOfYear: z.number().int().min(1).max(365),
});

export const resilienceSchema = z.object({
  cloudyDays: z.number().int().min(0).max(4),
  cloudType: z.enum(["cloudy", "rainy"]),
  demandIncrease: z.number().min(0).max(0.6),
  eveningIncrease: z.number().min(0).max(0.8),
  batteryHealth: z.number().min(0.5).max(1),
  solarAvailable: z.number().min(0.4).max(1),
  batteryOutageHours: z.number().int().min(0).max(12),
  extraHouseholds: z.number().int().min(0).max(100),
});

export const copilotRequestSchema = z.object({
  question: z.string().trim().min(2).max(600),
  config: scenarioSchema,
  hour: z.number().min(0).max(23.75),
  level: z.enum(["explore", "engineer"]).default("explore"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(8)
    .default([]),
});

export type CopilotRequest = z.infer<typeof copilotRequestSchema>;
