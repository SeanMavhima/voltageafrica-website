import { DEFAULT_CONFIG } from "./simulate";
import type { ScenarioConfig } from "./types";

export type Preset = { id: string; index: string; title: string; summary: string; focusHour: number; config: Partial<ScenarioConfig> };

/**
 * Scenario presets. The CMS chooses which one opens by default and may hide
 * presets, but the parameters themselves are version-controlled here.
 */
export const PRESETS: Preset[] = [
  { id: "sunny", index: "01", title: "Sunny day", summary: "Clear skies. Solar covers the day and fills the battery for the evening.", focusHour: 12.5, config: { weather: "clear", weatherTomorrow: "clear", initialSoc: 0.55 } },
  { id: "cloudy-afternoon", index: "02", title: "Cloudy afternoon", summary: "Thick cloud cuts generation while the community's demand carries on.", focusHour: 15, config: { weather: "afternoon", weatherTomorrow: "partly", initialSoc: 0.45 } },
  { id: "evening-peak", index: "03", title: "Evening peak", summary: "After sunset solar is zero and household demand climbs. Everything runs on storage.", focusHour: 20, config: { weather: "partly", weatherTomorrow: "clear", initialSoc: 0.4, householdDemand: 1.3 } },
  { id: "battery-stress", index: "04", title: "Battery stress", summary: "The day starts with the battery nearly empty and demand above normal.", focusHour: 19, config: { weather: "partly", weatherTomorrow: "partly", initialSoc: 0.2, householdDemand: 1.15, businessDemand: 1.2 } },
  { id: "growing", index: "05", title: "Growing community", summary: "Thirty more households connect to the same equipment.", focusHour: 20.5, config: { weather: "clear", weatherTomorrow: "clear", households: 90, initialSoc: 0.5 } },
  { id: "productive", index: "06", title: "Productive energy", summary: "Milling, workshop and cold-room demand grow by 60% as enterprises expand.", focusHour: 16.5, config: { weather: "clear", weatherTomorrow: "clear", businessDemand: 1.6, initialSoc: 0.5, millStart: 16 } },
];

export const PRESET_MAP = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

export function presetConfig(id: string, defaults: ScenarioConfig = DEFAULT_CONFIG): ScenarioConfig {
  const p = PRESET_MAP[id] ?? PRESETS[0];
  return { ...defaults, ...p.config };
}
