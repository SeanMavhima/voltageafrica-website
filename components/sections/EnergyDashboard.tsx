"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { activeConnections, formatHour, getDay, MODEL, sampleAt, stateOf } from "@/lib/sim/energy";
import { useInView } from "@/lib/hooks";

const C = { gen: "var(--color-series-gen)", demand: "var(--color-series-demand)", battery: "var(--color-series-battery)" };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function EnergyDashboard() {
  const day = useMemo(() => getDay(), []);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const inView = useInView(wrapRef, "0px");
  const reduce = useReducedMotion();
  const [now, setNow] = useState(13.25);
  const [hover, setHover] = useState<number | null>(null);

  // A slow "clock" moving through the simulated day while visible.
  useEffect(() => {
    if (!inView || reduce || hover !== null) return;
    const t = window.setInterval(() => setNow((h) => (h + 0.25) % 24), 650);
    return () => window.clearInterval(t);
  }, [inView, reduce, hover]);

  const h = hover ?? now;
  const s = sampleAt(h);

  const padL = 34;
  const padR = 12;
  const W = width;
  const innerW = W - padL - padR;
  const x = (hr: number) => padL + (hr / 24) * innerW;

  const P_H = 190;
  const P_TOP = 14;
  const P_BOT = P_H - 24;
  const maxKw = 25;
  const yP = (kw: number) => P_BOT - (kw / maxKw) * (P_BOT - P_TOP);

  const B_H = 108;
  const B_TOP = 10;
  const B_BOT = B_H - 24;
  const yB = (soc: number) => B_BOT - soc * (B_BOT - B_TOP);

  const genArea = useMemo(() => {
    const pts = day.map((p) => `${x(p.hour).toFixed(1)},${yP(p.pvKw).toFixed(1)}`).join(" L");
    return `M${x(0)},${yP(0)} L${pts} L${x(24)},${yP(0)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, W]);
  const genLine = useMemo(() => "M" + day.map((p) => `${x(p.hour).toFixed(1)},${yP(p.pvKw).toFixed(1)}`).join(" L"), [day, W]); // eslint-disable-line react-hooks/exhaustive-deps
  const demLine = useMemo(() => "M" + day.map((p) => `${x(p.hour).toFixed(1)},${yP(p.demandKw).toFixed(1)}`).join(" L"), [day, W]); // eslint-disable-line react-hooks/exhaustive-deps
  const socLine = useMemo(() => "M" + day.map((p) => `${x(p.hour).toFixed(1)},${yB(p.soc).toFixed(1)}`).join(" L"), [day, W]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const hr = Math.min(23.75, Math.max(0, ((px - padL) / innerW) * 24));
    setHover(Math.round(hr * 4) / 4);
  };

  const ticks = [0, 6, 12, 18, 24];
  const tipLeft = Math.min(Math.max(x(h) + 12, padL), W - 170);

  const kpis = [
    { k: "Solar generation", v: s.pvKw.toFixed(1), u: "kW", c: C.gen },
    { k: "Battery charge", v: String(Math.round(s.soc * 100)), u: "%", c: C.battery },
    { k: "Energy demand", v: s.demandKw.toFixed(1), u: "kW", c: C.demand },
    { k: "Active connections", v: String(activeConnections(s)), u: `of ${MODEL.connections}`, c: "var(--color-stone)" },
  ];

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-paper shadow-[0_40px_80px_-50px_rgb(36_36_31/0.45)] ring-1 ring-rule">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="pulse-dot h-2 w-2 rounded-full bg-series-battery" aria-hidden />
          <p className="text-sm font-semibold text-charcoal">Energy intelligence · concept console</p>
        </div>
        <span className="tag-sim text-amber-ink">Demo · simulated data</span>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-rule bg-rule sm:grid-cols-4">
        {kpis.map((m) => (
          <div key={m.k} className="bg-paper px-5 py-4">
            <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone">
              <span className="h-2 w-2 rounded-full" style={{ background: m.c }} aria-hidden />
              {m.k}
            </dt>
            <dd className="mt-2 font-mono text-2xl tabular-nums text-charcoal">
              {m.v}
              <span className="ml-1 text-xs text-stone">{m.u}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="px-2 pb-3 pt-4 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2">
          <p className="text-sm font-semibold text-charcoal">Power over 24 hours</p>
          <ul className="flex gap-5 text-xs text-charcoal-2" aria-label="Legend">
            <li className="flex items-center gap-2">
              <span className="h-2 w-4" style={{ background: C.gen }} aria-hidden /> Solar generation
            </li>
            <li className="flex items-center gap-2">
              <span className="h-[2px] w-4" style={{ background: C.demand }} aria-hidden /> Demand
            </li>
          </ul>
        </div>

        <div className="relative">
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${P_H + B_H}`}
            className="mt-2 block touch-pan-y select-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Simulated 24-hour profile. At ${formatHour(h)}: solar ${s.pvKw.toFixed(1)} kilowatts, demand ${s.demandKw.toFixed(1)} kilowatts, battery ${Math.round(s.soc * 100)} percent.`}
          >
            {/* Power chart grid */}
            {[0, 10, 20].map((v) => (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={yP(v)} y2={yP(v)} stroke="color-mix(in srgb, var(--color-charcoal) 9%, transparent)" />
                <text x={padL - 8} y={yP(v) + 3} textAnchor="end" className="fill-stone font-mono text-[10px]">
                  {v}
                </text>
              </g>
            ))}
            <text x={padL - 8} y={P_TOP - 2} textAnchor="end" className="fill-stone font-mono text-[9px]">
              kW
            </text>
            <path d={genArea} fill={C.gen} opacity={0.22} />
            <path d={genLine} fill="none" stroke={C.gen} strokeWidth={2} strokeLinejoin="round" />
            <path d={demLine} fill="none" stroke={C.demand} strokeWidth={2} strokeLinejoin="round" />
            {/* direct labels */}
            <text x={x(12)} y={yP(sampleAt(12).pvKw) - 8} textAnchor="middle" className="fill-charcoal-2 text-[11px]">
              Solar
            </text>
            <text x={x(20.4)} y={yP(sampleAt(20.4).demandKw) - 8} textAnchor="middle" className="fill-charcoal-2 text-[11px]">
              Evening demand
            </text>

            {/* Battery chart */}
            <g transform={`translate(0 ${P_H})`}>
              <text x={padL} y={B_TOP - 2} className="fill-charcoal text-[12px]">
                Battery state of charge
              </text>
              {[0, 0.5, 1].map((v) => (
                <g key={v}>
                  <line x1={padL} x2={W - padR} y1={yB(v)} y2={yB(v)} stroke="color-mix(in srgb, var(--color-charcoal) 9%, transparent)" />
                  <text x={padL - 8} y={yB(v) + 3} textAnchor="end" className="fill-stone font-mono text-[10px]">
                    {v * 100}
                  </text>
                </g>
              ))}
              <path d={socLine} fill="none" stroke={C.battery} strokeWidth={2} strokeLinejoin="round" />
              {ticks.map((t) => (
                <text key={t} x={x(t)} y={B_H - 6} textAnchor={t === 0 ? "start" : t === 24 ? "end" : "middle"} className="fill-stone font-mono text-[10px]">
                  {String(t).padStart(2, "0")}:00
                </text>
              ))}
            </g>

            {/* Crosshair */}
            <line x1={x(h)} x2={x(h)} y1={P_TOP - 4} y2={P_H + B_BOT} stroke="color-mix(in srgb, var(--color-charcoal) 45%, transparent)" strokeDasharray="2 3" />
            <circle cx={x(h)} cy={yP(s.pvKw)} r={4.5} fill={C.gen} stroke="var(--color-paper)" strokeWidth={2} />
            <circle cx={x(h)} cy={yP(s.demandKw)} r={4.5} fill={C.demand} stroke="var(--color-paper)" strokeWidth={2} />
            <circle cx={x(h)} cy={P_H + yB(s.soc)} r={4.5} fill={C.battery} stroke="var(--color-paper)" strokeWidth={2} />
            <rect x={padL} y={0} width={innerW} height={P_H + B_BOT} fill="transparent" />
          </svg>

          {/* Tooltip */}
          <div className="pointer-events-none absolute top-2 rounded-lg bg-charcoal px-3 py-2 text-xs text-parchment shadow-xl" style={{ left: `${(tipLeft / W) * 100}%` }} aria-hidden>
            <p className="font-mono text-parchment">{formatHour(h)}</p>
            <p className="mt-1 flex items-center gap-2 text-parchment/75">
              <span className="h-1.5 w-1.5" style={{ background: C.gen }} /> Solar <span className="ml-auto pl-3 font-mono text-parchment">{s.pvKw.toFixed(1)} kW</span>
            </p>
            <p className="flex items-center gap-2 text-parchment/75">
              <span className="h-1.5 w-1.5" style={{ background: C.demand }} /> Demand <span className="ml-auto pl-3 font-mono text-parchment">{s.demandKw.toFixed(1)} kW</span>
            </p>
            <p className="flex items-center gap-2 text-parchment/75">
              <span className="h-1.5 w-1.5" style={{ background: C.battery }} /> Battery <span className="ml-auto pl-3 font-mono text-parchment">{Math.round(s.soc * 100)}%</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
        <p className="text-xs text-stone">
          Status: <span className="font-medium text-forest">{stateOf(s)}</span>
        </p>
        <details className="text-xs text-stone">
          <summary className="cursor-pointer font-medium hover:text-charcoal">View as table</summary>
          <div className="mt-3 max-h-56 overflow-auto">
            <table className="w-full min-w-[22rem] text-left font-mono text-[11px]">
              <thead className="text-stone">
                <tr>
                  <th className="py-1 pr-4 font-normal">Time</th>
                  <th className="py-1 pr-4 font-normal">Solar kW</th>
                  <th className="py-1 pr-4 font-normal">Demand kW</th>
                  <th className="py-1 font-normal">Battery %</th>
                </tr>
              </thead>
              <tbody className="text-charcoal-2">
                {day
                  .filter((p) => p.hour % 2 === 0 && p.hour < 24)
                  .map((p) => (
                    <tr key={p.hour} className="border-t border-rule">
                      <td className="py-1 pr-4">{formatHour(p.hour)}</td>
                      <td className="py-1 pr-4">{p.pvKw.toFixed(1)}</td>
                      <td className="py-1 pr-4">{p.demandKw.toFixed(1)}</td>
                      <td className="py-1">{Math.round(p.soc * 100)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
