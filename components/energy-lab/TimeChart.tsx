"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { formatClock, formatDayClock } from "@/lib/energy-lab/math";

export const COLORS = {
  solar: "var(--color-series-gen)",
  demand: "var(--color-series-demand)",
  battery: "var(--color-series-battery)",
  alt: "var(--color-series-alt)",
  short: "var(--color-status-critical)",
  ink: "var(--color-charcoal-2)",
  muted: "var(--color-stone)",
  grid: "color-mix(in srgb, var(--color-charcoal) 9%, transparent)",
};

export type Series = {
  id: string;
  label: string;
  color: string;
  kind: "line" | "area" | "band" | "step-area";
  values: number[];
  lower?: number[];
  upper?: number[];
  dashed?: boolean;
  /** Format for the tooltip. */
  format?: (v: number) => string;
  hideInTooltip?: boolean;
};

export type Span = { start: number; end: number; color: string; label?: string; opacity?: number };

type Props = {
  ts: number[];
  step: number;
  series: Series[];
  yMax: number;
  yMin?: number;
  unit: string;
  height?: number;
  spans?: Span[];
  marker?: number | null;
  onPick?: (t: number) => void;
  multiDay?: boolean;
  ariaLabel: string;
  yTicks?: number[];
  yFormat?: (v: number) => string;
  legend?: boolean;
  /** Direct labels: series id → index to place the label at. */
  directLabels?: Record<string, number>;
  footer?: ReactNode;
};

function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(max: number, min = 0): number[] {
  const span = max - min || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/**
 * Time-series chart: one y-scale (never dual-axis), crosshair tooltip, optional
 * shaded spans and a current-time marker. A data table is always available.
 */
export function TimeChart({ ts, step, series, yMax, yMin = 0, unit, height = 220, spans = [], marker = null, onPick, multiDay = false, ariaLabel, yTicks, yFormat, legend = true, directLabels, footer }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const H = height;
  const t0 = ts[0] ?? 0;
  const t1 = (ts[ts.length - 1] ?? 24) + step;
  const x = (t: number) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR);
  const y = (v: number) => H - padB - ((v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);
  const ticks = yTicks ?? niceTicks(yMax, yMin);
  const fmtT = multiDay ? formatDayClock : formatClock;
  const fmtY = yFormat ?? ((v: number) => String(v));

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.values.map((v, i) => [x(ts[i] + step / 2), y(v)] as const);
        const line = pts.length ? "M" + pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join("L") : "";
        let area = "";
        if (s.kind === "area" && pts.length) area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${y(Math.max(yMin, 0)).toFixed(1)}L${pts[0][0].toFixed(1)},${y(Math.max(yMin, 0)).toFixed(1)}Z`;
        if (s.kind === "step-area" && s.values.length) {
          let d = "";
          s.values.forEach((v, i) => {
            if (v <= 1e-6) return;
            const xa = x(ts[i]);
            const xb = x(ts[i] + step);
            d += `M${xa.toFixed(1)},${y(0).toFixed(1)}L${xa.toFixed(1)},${y(v).toFixed(1)}L${xb.toFixed(1)},${y(v).toFixed(1)}L${xb.toFixed(1)},${y(0).toFixed(1)}Z`;
          });
          area = d;
        }
        if (s.kind === "band" && s.lower && s.upper) {
          const up = s.upper.map((v, i) => `${x(ts[i] + step / 2).toFixed(1)},${y(v).toFixed(1)}`);
          const lo = s.lower.map((v, i) => `${x(ts[i] + step / 2).toFixed(1)},${y(v).toFixed(1)}`).reverse();
          area = `M${up.join("L")}L${lo.join("L")}Z`;
        }
        return { s, line, area };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, W, H, yMax, yMin, ts, step],
  );

  const idxAt = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    const t = t0 + ((px - padL) / (W - padL - padR)) * (t1 - t0);
    return Math.max(0, Math.min(ts.length - 1, Math.floor((t - t0) / step)));
  };

  const xTicks: number[] = [];
  const span = t1 - t0;
  const every = span > 72 ? 24 : span > 30 ? 12 : 6;
  for (let t = Math.ceil(t0 / every) * every; t <= t1 + 1e-9; t += every) xTicks.push(t);

  const hi = hover;
  const tipX = hi !== null ? x(ts[hi] + step / 2) : 0;

  return (
    <figure className="m-0">
      {legend && (
        <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-charcoal-2" aria-label="Legend">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              {s.kind === "line" ? (
                <svg width="16" height="6" aria-hidden>
                  <line x1="0" x2="16" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
                </svg>
              ) : (
                <span className="h-2.5 w-4 rounded-[2px]" style={{ background: s.color, opacity: s.kind === "band" ? 0.3 : 0.55 }} aria-hidden />
              )}
              {s.label}
            </li>
          ))}
          {spans.some((s) => s.label) &&
            [...new Map(spans.filter((s) => s.label).map((s) => [s.label, s])).values()].map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-[2px]" style={{ background: s.color, opacity: 0.25 }} aria-hidden />
                {s.label}
              </li>
            ))}
        </ul>
      )}
      <div ref={ref} className="relative">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          className="block touch-pan-y select-none"
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(e) => setHover(idxAt(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => onPick?.(ts[idxAt(e.clientX, e.currentTarget.getBoundingClientRect())])}
          style={{ cursor: onPick ? "pointer" : "crosshair" }}
        >
          <defs>
            <clipPath id={`${id}-clip`}>
              <rect x={padL} y={padT - 2} width={W - padL - padR} height={H - padT - padB + 2} />
            </clipPath>
          </defs>
          {spans.map((s, i) => (
            <rect key={i} x={x(Math.max(t0, s.start))} y={padT} width={Math.max(0, x(Math.min(t1, s.end)) - x(Math.max(t0, s.start)))} height={H - padT - padB} fill={s.color} opacity={s.opacity ?? 0.12} />
          ))}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
              <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" className="fill-stone font-mono text-[10px]">
                {fmtY(v)}
              </text>
            </g>
          ))}
          <text x={padL - 8} y={padT - 4} textAnchor="end" className="fill-stone font-mono text-[9px]">
            {unit}
          </text>
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor={t <= t0 ? "start" : t >= t1 ? "end" : "middle"} className="fill-stone font-mono text-[10px]">
              {multiDay && t % 24 === 0 ? `Day ${t / 24 + 1}` : formatClock(t)}
            </text>
          ))}
          <g clipPath={`url(#${id}-clip)`}>
            {paths.map(({ s, line, area }) =>
              s.kind === "band" ? (
                <path key={s.id} d={area} fill={s.color} opacity={0.18} />
              ) : s.kind === "area" || s.kind === "step-area" ? (
                <g key={s.id}>
                  <path d={area} fill={s.color} opacity={s.kind === "step-area" ? 0.75 : 0.2} />
                  {s.kind === "area" && <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />}
                </g>
              ) : (
                <path key={s.id} d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
              ),
            )}
          </g>
          {directLabels &&
            series
              .filter((s) => directLabels[s.id] !== undefined && s.values[directLabels[s.id]] !== undefined)
              .map((s) => {
                const i = directLabels[s.id];
                return (
                  <text key={s.id} x={x(ts[i] + step / 2)} y={y(s.values[i]) - 8} textAnchor="middle" className="fill-charcoal-2 text-[11px]" style={{ paintOrder: "stroke", stroke: "var(--color-paper)", strokeWidth: 3 }}>
                    {s.label}
                  </text>
                );
              })}
          <line x1={padL} x2={W - padR} y1={y(Math.max(yMin, 0))} y2={y(Math.max(yMin, 0))} stroke="color-mix(in srgb, var(--color-charcoal) 35%, transparent)" />
          {marker !== null && marker >= t0 && marker <= t1 && (
            <g>
              <line x1={x(marker)} x2={x(marker)} y1={padT - 4} y2={H - padB} stroke="var(--color-charcoal)" strokeWidth={1.5} />
              <circle cx={x(marker)} cy={padT - 4} r={3.5} fill="var(--color-charcoal)" />
            </g>
          )}
          {hi !== null && (
            <g pointerEvents="none">
              <line x1={tipX} x2={tipX} y1={padT} y2={H - padB} stroke="color-mix(in srgb, var(--color-charcoal) 35%, transparent)" strokeDasharray="3 3" />
              {series
                .filter((s) => s.kind !== "band" && s.kind !== "step-area" && !s.hideInTooltip)
                .map((s) => (
                  <circle key={s.id} cx={tipX} cy={y(s.values[hi])} r={4} fill={s.color} stroke="var(--color-paper)" strokeWidth={2} />
                ))}
            </g>
          )}
        </svg>
        {hi !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[10rem] rounded-md bg-charcoal px-3 py-2 text-[11px] leading-relaxed text-parchment shadow-lg"
            style={{ left: `${Math.min(Math.max((tipX / W) * 100, 2), 98)}%`, transform: tipX / W > 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          >
            <p className="font-mono text-parchment/70">{fmtT(ts[hi])}</p>
            {series
              .filter((s) => !s.hideInTooltip)
              .map((s) => (
                <p key={s.id} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                    {s.label}
                  </span>
                  <span className="font-mono tabular-nums">
                    {s.kind === "band" && s.lower && s.upper ? `${(s.format ?? fmtY)(s.lower[hi])}–${(s.format ?? fmtY)(s.upper[hi])}` : (s.format ?? ((v: number) => `${v.toFixed(1)} ${unit}`))(s.values[hi])}
                  </span>
                </p>
              ))}
          </div>
        )}
      </div>
      {footer}
      <details className="mt-2 text-xs text-stone">
        <summary className="cursor-pointer select-none hover:text-charcoal">Show data table</summary>
        <div className="relative mt-2 max-h-64 overflow-auto rounded border border-rule">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-parchment-2 text-charcoal">
              <tr>
                <th className="px-2 py-1">Time</th>
                {series.map((s) => (
                  <th key={s.id} className="px-2 py-1">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ts.map((t, i) =>
                Math.abs((t * 2) % 2) < 1e-9 ? (
                  <tr key={t} className="border-t border-rule">
                    <td className="px-2 py-1">{fmtT(t)}</td>
                    {series.map((s) => (
                      <td key={s.id} className="px-2 py-1 tabular-nums">
                        {s.kind === "band" && s.lower && s.upper ? `${s.lower[i].toFixed(1)}–${s.upper[i].toFixed(1)}` : s.values[i].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
