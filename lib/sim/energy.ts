/**
 * Illustrative 24-hour energy model for a conceptual community solar microgrid.
 *
 * SIMULATED DATA ONLY. These figures are not measurements from any deployed
 * VoltageAfrica system and are not a design specification. They exist so
 * visitors can see how generation, storage and demand interact across a day.
 */

export const MODEL = {
  pvPeakKw: 24,
  batteryKwh: 60,
  minSoc: 0.15,
  maxSoc: 0.98,
  roundTrip: 0.92,
  connections: 60,
  stepH: 0.25,
} as const;

export type SimPoint = {
  hour: number;
  pvKw: number;
  demandKw: number;
  soc: number; // 0..1
  batteryKw: number; // + charging, − discharging
  curtailedKw: number;
};

const bump = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));
const smoothStep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export function pvAt(hour: number): number {
  const s = Math.sin((Math.PI * (hour - 6)) / 12.6);
  if (hour < 6 || hour > 18.6 || s <= 0) return 0;
  // A deterministic soft "passing cloud" dip early afternoon for realism.
  const cloud = 1 - 0.18 * bump(hour, 13.5, 0.45);
  return MODEL.pvPeakKw * Math.pow(s, 1.3) * cloud;
}

export function demandAt(hour: number): number {
  const base = 2.1;
  const morning = 3.2 * bump(hour, 6.6, 0.9);
  const productive = 6.0 * smoothStep(8.2, 9.5, hour) * (1 - smoothStep(15.5, 17, hour));
  const school = 1.6 * smoothStep(7.5, 8, hour) * (1 - smoothStep(14.5, 15, hour));
  const evening = 8.8 * bump(hour, 19.6, 1.55);
  const night = 0.6 * smoothStep(21.5, 23.5, hour);
  return base + morning + productive + school + evening - night;
}

function simulateDay(startSoc: number): SimPoint[] {
  const pts: SimPoint[] = [];
  let soc = startSoc;
  const n = Math.round(24 / MODEL.stepH);
  for (let i = 0; i <= n; i++) {
    const hour = i * MODEL.stepH;
    const pv = pvAt(hour);
    const demand = demandAt(hour);
    const net = pv - demand;
    let batteryKw = 0;
    let curtailed = 0;
    if (net >= 0) {
      const room = ((MODEL.maxSoc - soc) * MODEL.batteryKwh) / MODEL.stepH;
      batteryKw = Math.min(net * MODEL.roundTrip, room);
      curtailed = Math.max(0, net - batteryKw / MODEL.roundTrip);
    } else {
      const avail = ((soc - MODEL.minSoc) * MODEL.batteryKwh) / MODEL.stepH;
      batteryKw = -Math.min(-net, avail);
    }
    pts.push({ hour, pvKw: pv, demandKw: demand, soc, batteryKw, curtailedKw: curtailed });
    if (i < n) soc = Math.min(MODEL.maxSoc, Math.max(MODEL.minSoc, soc + (batteryKw * MODEL.stepH) / MODEL.batteryKwh));
  }
  return pts;
}

let cache: SimPoint[] | null = null;

/** A steady-state day: iterate until the end-of-day SOC matches the start. */
export function getDay(): SimPoint[] {
  if (cache) return cache;
  let soc = 0.5;
  let day = simulateDay(soc);
  for (let k = 0; k < 6; k++) {
    soc = day[day.length - 1].soc;
    day = simulateDay(soc);
  }
  cache = day;
  return day;
}

export function sampleAt(hour: number): SimPoint {
  const day = getDay();
  const h = ((hour % 24) + 24) % 24;
  const f = h / MODEL.stepH;
  const i = Math.floor(f);
  const a = day[i];
  const b = day[Math.min(i + 1, day.length - 1)];
  const t = f - i;
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    hour: h,
    pvKw: lerp(a.pvKw, b.pvKw),
    demandKw: lerp(a.demandKw, b.demandKw),
    soc: lerp(a.soc, b.soc),
    batteryKw: lerp(a.batteryKw, b.batteryKw),
    curtailedKw: lerp(a.curtailedKw, b.curtailedKw),
  };
}

export type SystemState = "Solar surplus · charging" | "Solar + storage" | "Running on storage" | "Low reserve";

export function stateOf(p: SimPoint): SystemState {
  if (p.soc < 0.2 && p.pvKw < p.demandKw) return "Low reserve";
  if (p.batteryKw > 0.2) return "Solar surplus · charging";
  if (p.pvKw > 0.5) return "Solar + storage";
  return "Running on storage";
}

/** Modelled connections drawing power at a given moment (out of MODEL.connections). */
export function activeConnections(p: SimPoint): number {
  const peak = 15;
  return Math.max(6, Math.min(MODEL.connections, Math.round((p.demandKw / peak) * MODEL.connections)));
}

/** 0 = night, 1 = full day — for lighting. */
export function daylight(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return smoothStep(5.4, 7.4, h) * (1 - smoothStep(17.6, 19.4, h));
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
