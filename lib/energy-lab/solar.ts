/**
 * Solar resource and PV output model (transparent and deliberately simple).
 *
 *   1. Sun position: declination (Cooper, 1969) and hour angle, solar time = clock time.
 *   2. Clear-sky global horizontal irradiance: Haurwitz (1945),
 *        GHI_clear = 1098 · cosZ · exp(−0.059 / cosZ)  [W/m²]
 *   3. Weather: GHI = GHI_clear · k, with a fixed clearness factor k per weather class.
 *   4. Cell temperature: NOCT model, T_cell = T_amb + (NOCT − 20) / 800 · G.
 *   5. PV power: P = kWp · G/1000 · (1 + γ (T_cell − 25)) · derate.
 *
 * Limitations: modules are treated as horizontal (no tilt/tracking gain), no
 * equation-of-time correction, no diffuse/direct split, and the weather classes
 * are scenario bounds, not measured cloud statistics.
 */
import { smoothStep } from "./math";
import type { SystemSpec, Weather } from "./types";

const DEG = Math.PI / 180;

/** Clearness factor applied to clear-sky irradiance, with the range used for forecast bounds. */
export const WEATHER: Record<Weather, { label: string; k: number; low: number; high: number; tempOffset: number; description: string }> = {
  clear: { label: "Clear sky", k: 1.0, low: 0.9, high: 1.0, tempOffset: 0, description: "Full sun. Irradiance follows the clear-sky curve." },
  partly: { label: "Partly cloudy", k: 0.7, low: 0.5, high: 0.88, tempOffset: -1.5, description: "Broken cloud. About 70% of clear-sky irradiance on average." },
  afternoon: { label: "Cloudy afternoon", k: 1.0, low: 0.85, high: 1.0, tempOffset: -2, description: "Sunny morning; thick cloud rolls in around 13:00 and cuts irradiance to about 30%." },
  cloudy: { label: "Overcast", k: 0.4, low: 0.25, high: 0.6, tempOffset: -3.5, description: "Thick cloud. About 40% of clear-sky irradiance." },
  rainy: { label: "Rain", k: 0.2, low: 0.1, high: 0.35, tempOffset: -5, description: "Rain and heavy cloud. About 20% of clear-sky irradiance." },
};

export const WEATHER_ORDER: Weather[] = ["clear", "partly", "afternoon", "cloudy", "rainy"];

/** Within-day shape of the clearness factor (1 = the class factor applies unchanged). */
export function weatherShape(weather: Weather, hour: number): number {
  if (weather === "afternoon") return 1 - 0.7 * smoothStep(12.5, 13.75, hour);
  return 1;
}

export function declination(dayOfYear: number): number {
  return 23.45 * DEG * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
}

/** Cosine of the solar zenith angle at a clock hour (0..24). */
export function cosZenith(hour: number, dayOfYear: number, latitudeDeg: number): number {
  const phi = latitudeDeg * DEG;
  const delta = declination(dayOfYear);
  const omega = 15 * DEG * (hour - 12);
  return Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
}

/** Clear-sky GHI in W/m² (Haurwitz). */
export function clearSkyGhi(hour: number, dayOfYear: number, latitudeDeg: number): number {
  const c = cosZenith(hour, dayOfYear, latitudeDeg);
  if (c <= 0.01) return 0;
  return 1098 * c * Math.exp(-0.059 / c);
}

/** Ambient temperature, °C: a daily cosine peaking at 14:00. */
export function ambientTemp(hour: number, weather: Weather): number {
  const amp = weather === "clear" ? 8 : weather === "partly" || weather === "afternoon" ? 6.5 : 4.5;
  return 21 + WEATHER[weather].tempOffset + amp * Math.cos((2 * Math.PI * (hour - 14)) / 24);
}

export function cellTemp(ambient: number, ghi: number, noctC: number): number {
  return ambient + ((noctC - 20) / 800) * ghi;
}

/** Irradiance with weather applied. `k` overrides the class clearness factor. */
export function irradiance(hour: number, dayOfYear: number, latitudeDeg: number, weather: Weather, k = WEATHER[weather].k): number {
  return clearSkyGhi(hour, dayOfYear, latitudeDeg) * k * weatherShape(weather, hour);
}

/** AC-side PV power available, kW, averaged over the interval [hour, hour + dt). */
export function pvPower(hour: number, dt: number, kwp: number, dayOfYear: number, weather: Weather, spec: SystemSpec, k = WEATHER[weather].k): number {
  // Midpoint rule over the step is accurate to well under 1% at 15-minute steps.
  const h = (((hour + dt / 2) % 24) + 24) % 24;
  const g = irradiance(h, dayOfYear, spec.latitudeDeg, weather, k);
  if (g <= 0) return 0;
  const tc = cellTemp(ambientTemp(h, weather), g, spec.noctC);
  const p = kwp * (g / 1000) * (1 + spec.pvTempCoeff * (tc - 25)) * spec.pvDerate;
  return Math.max(0, p);
}

/** Total PV energy over a day, kWh (for quick sizing estimates). */
export function dailyPvKwh(kwp: number, dayOfYear: number, weather: Weather, spec: SystemSpec, k?: number, dt = 0.25): number {
  let e = 0;
  for (let h = 0; h < 24; h += dt) e += pvPower(h, dt, kwp, dayOfYear, weather, spec, k) * dt;
  return e;
}
