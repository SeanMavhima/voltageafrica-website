export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);

export function smoothStep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** ≈1 inside [a, b], ≈0 outside, with ramps of width r centred on each edge. */
export function smoothWindow(h: number, a: number, b: number, r = 0.5): number {
  return smoothStep(a - r / 2, a + r / 2, h) * (1 - smoothStep(b - r / 2, b + r / 2, h));
}

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const round = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export function formatClock(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    hh = (hh + 1) % 24;
    mm = 0;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "Day 2 · 06:00" for multi-day runs. */
export function formatDayClock(t: number): string {
  return `Day ${Math.floor(t / 24) + 1} · ${formatClock(t)}`;
}
