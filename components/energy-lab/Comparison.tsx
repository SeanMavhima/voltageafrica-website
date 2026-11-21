"use client";

import { isPostponed, type Analysis } from "@/lib/energy-lab/explain";
import { FLEXIBLE_IDS, flexibleSpec, LOAD_MAP } from "@/lib/energy-lab/loads";
import { formatClock } from "@/lib/energy-lab/math";
import { STEP_H, type Summary } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import type { Level } from "./Console";
import { COLORS, TimeChart } from "./TimeChart";
import { Flag } from "./ui";

type Row = {
  label: string;
  explore?: boolean;
  get: (s: Summary) => number;
  fmt: (v: number) => string;
  /** +1: higher is better, −1: lower is better, 0: neutral. */
  better: 1 | -1 | 0;
  tol: number;
  note?: string;
};

const kwh = (v: number) => `${v.toFixed(1)} kWh`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const ROWS: Row[] = [
  { label: "Energy served", explore: true, get: (s) => s.servedKwh, fmt: kwh, better: 1, tol: 0.05 },
  { label: "Share of demand served", get: (s) => s.servedFraction, fmt: (v) => `${(v * 100).toFixed(1)}%`, better: 1, tol: 0.0005 },
  { label: "Unserved energy", explore: true, get: (s) => s.unservedKwh, fmt: kwh, better: -1, tol: 0.05 },
  { label: "Clinic (critical) unserved", explore: true, get: (s) => s.unservedByPriority.critical, fmt: kwh, better: -1, tol: 0.05 },
  { label: "Essential loads unserved", get: (s) => s.unservedByPriority.essential, fmt: kwh, better: -1, tol: 0.05, note: "Lighting, refrigeration, school" },
  { label: "Standard loads unserved", get: (s) => s.unservedByPriority.standard, fmt: kwh, better: -1, tol: 0.05 },
  { label: "Flexible loads unserved", get: (s) => s.unservedByPriority.flexible, fmt: kwh, better: -1, tol: 0.05, note: "Pump, mill, workshop" },
  { label: "Hours with unmet demand", explore: true, get: (s) => s.outageHours, fmt: (v) => `${v.toFixed(2)} h`, better: -1, tol: 0.01 },
  { label: "Battery energy discharged", explore: true, get: (s) => s.batteryDischargeKwh, fmt: kwh, better: -1, tol: 0.05, note: "Less cycling means less wear" },
  { label: "Equivalent full cycles", get: (s) => s.equivalentCycles, fmt: (v) => v.toFixed(2), better: -1, tol: 0.005 },
  { label: "Lowest battery charge", explore: true, get: (s) => s.minSoc, fmt: pct, better: 1, tol: 0.005 },
  { label: "Battery charge at midnight", get: (s) => s.endSoc, fmt: pct, better: 1, tol: 0.005 },
  { label: "Hours below the reserve", get: (s) => s.hoursBelowReserve, fmt: (v) => `${v.toFixed(2)} h`, better: -1, tol: 0.01 },
  { label: "Solar used directly by loads", explore: true, get: (s) => s.pvToLoadKwh, fmt: kwh, better: 1, tol: 0.05 },
  { label: "Solar utilisation", get: (s) => s.solarUtilisation, fmt: pct, better: 1, tol: 0.005, note: "Used directly or stored" },
  { label: "Solar curtailed", get: (s) => s.curtailedKwh, fmt: kwh, better: -1, tol: 0.05 },
  { label: "Peak demand", get: (s) => s.peakDemandKw, fmt: (v) => `${v.toFixed(1)} kW`, better: 0, tol: 0.05 },
  { label: "Battery conversion losses", get: (s) => s.batteryLossesKwh, fmt: kwh, better: -1, tol: 0.05 },
];

function Delta({ a, b, row }: { a: number; b: number; row: Row }) {
  const d = b - a;
  if (Math.abs(d) <= row.tol) return <span className="text-stone">no change</span>;
  const good = row.better === 0 ? null : row.better * d > 0;
  const sign = d > 0 ? "+" : "−";
  const text = row.fmt === pct ? `${sign}${Math.abs(Math.round(d * 100))} pts` : `${sign}${row.fmt(Math.abs(d))}`;
  return (
    <span className={cn("tabular-nums", good === true && "text-forest", good === false && "text-status-critical-ink")}>
      {text}
      {good !== null && <span className="sr-only">{good ? " (better)" : " (worse)"}</span>}
      <span aria-hidden className="ml-1 text-[9px]">
        {good === true ? "●" : good === false ? "▲" : ""}
      </span>
    </span>
  );
}

export function narrative(a: Analysis): string[] {
  const b = a.baseline.summary;
  const i = a.intelligent.summary;
  const out: string[] = [];
  const dServed = i.servedKwh - b.servedKwh;
  const dCrit = b.unservedByPriority.critical - i.unservedByPriority.critical;
  const dDis = b.batteryDischargeKwh - i.batteryDischargeKwh;
  if (Math.abs(dServed) < 0.05 && Math.abs(dCrit) < 0.05 && Math.abs(dDis) < 0.5 && !a.changes.length) {
    return ["In this scenario intelligent management makes no measurable difference: the system has enough energy and the operator's schedule already works. That is a valid result, not a failure of the method."];
  }
  if (dCrit > 0.05) out.push(`The clinic keeps power: ${kwh(b.unservedByPriority.critical)} of its demand goes unserved without management, ${kwh(i.unservedByPriority.critical)} with it.`);
  if (dServed > 0.05) out.push(`${kwh(dServed)} more energy reaches the community (${pct(b.servedFraction)} → ${pct(i.servedFraction)} of demand).`);
  if (dServed < -0.05)
    out.push(`Total energy served is ${kwh(-dServed)} lower with management. The reserve and the priority order deliberately hold energy back for the clinic and essential services instead of letting the whole network run the battery flat.`);
  if (dDis > 0.5) out.push(`The battery discharges ${kwh(dDis)} less (${b.equivalentCycles.toFixed(2)} → ${i.equivalentCycles.toFixed(2)} cycles) because ${a.changes.length ? "flexible loads run on direct solar" : "loads are prioritised"}.`);
  const moved = a.changes.filter((c) => !isPostponed(a, c.id));
  const postponed = a.changes.filter((c) => isPostponed(a, c.id));
  if (moved.length) out.push(`The optimiser moved ${moved.map((c) => `the ${LOAD_MAP[c.id].short.toLowerCase()} to ${formatClock(c.to)}`).join(", ")}.`);
  if (postponed.length) out.push(`There is not enough energy for ${postponed.map((c) => `the ${LOAD_MAP[c.id].short.toLowerCase()}`).join(" or ")} today without draining storage that essential services need, so ${postponed.length > 1 ? "they are" : "it is"} effectively postponed.`);
  if (i.unservedKwh > 0.01 * i.demandKwh) out.push(`Management cannot close the remaining ${kwh(i.unservedKwh)} gap. That needs more generation or storage, or less demand (see the recommendations).`);
  return out;
}

function Gantt({ a }: { a: Analysis }) {
  const t0 = 5;
  const t1 = 21;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * 100;
  const pr = a.priority;
  const surplus = pr.steps.filter((s) => s.t >= t0 && s.t < t1).map((s) => ({ t: s.t, v: s.pvKw - (s.demandKw - FLEXIBLE_IDS.reduce((acc, id) => acc + s.loads[id].demand, 0)) }));
  const maxV = Math.max(1, ...surplus.map((s) => Math.abs(s.v)));
  const area = surplus.map((s) => `${x(s.t + STEP_H / 2).toFixed(2)},${(50 - (Math.max(0, s.v) / maxV) * 46).toFixed(2)}`).join(" ");
  return (
    <div>
      <div className="relative ml-[7.25rem] h-14 border-b border-rule">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <polygon points={`0,50 ${area} 100,50`} fill={COLORS.solar} opacity={0.25} />
        </svg>
        <p className="absolute left-0 top-0 text-[11px] text-stone">Solar surplus above the rest of the community&apos;s demand</p>
      </div>
      <ul className="mt-3 space-y-8">
        {FLEXIBLE_IDS.map((id) => {
          const from = a.optimisation.baselineSchedule[id];
          const to = a.optimisation.schedule[id];
          const run = flexibleSpec(id, a.intelligent.config).runHours;
          const moved = Math.abs(from - to) > 1e-9;
          return (
            <li key={id} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
              <span className="text-[13px] text-charcoal">{LOAD_MAP[id].short}</span>
              <div className="relative h-8">
                <div className="absolute inset-y-0 rounded-[4px] border border-dashed border-charcoal/50" style={{ left: `${x(from)}%`, width: `${x(from + run) - x(from)}%` }} title={`Current: ${formatClock(from)}–${formatClock(from + run)}`} />
                <div className={cn("absolute inset-y-1.5 rounded-[3px]", isPostponed(a, id) ? "bg-[repeating-linear-gradient(135deg,var(--color-status-critical-ink)_0_3px,transparent_3px_7px)] ring-1 ring-status-critical-ink/60" : moved ? "bg-charcoal" : "bg-charcoal/40")} style={{ left: `${x(to)}%`, width: `${x(to + run) - x(to)}%` }} title={`Optimised: ${formatClock(to)}–${formatClock(to + run)}`} />
                <span className="absolute -bottom-5 whitespace-nowrap font-mono text-[10px] text-stone" style={x(to) < 45 ? { left: `${x(to)}%` } : { right: `${Math.max(0, 100 - x(to + run))}%` }}>
                  {formatClock(to)}
                  {isPostponed(a, id) ? " · mostly shed: postponed" : moved ? ` (was ${formatClock(from)})` : " · unchanged"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-7 grid grid-cols-[6.5rem_1fr] gap-3">
        <span />
        <div className="relative h-4 border-t border-rule font-mono text-[10px] text-stone">
          {[6, 9, 12, 15, 18].map((h) => (
            <span key={h} className="absolute top-1 -translate-x-1/2" style={{ left: `${x(h)}%` }}>
              {formatClock(h)}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-stone">
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-[3px] border border-dashed border-charcoal/50" aria-hidden /> Operator&apos;s current schedule
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-5 rounded-[3px] bg-charcoal" aria-hidden /> Optimised schedule
        </span>
      </p>
    </div>
  );
}

export function Comparison({ analysis: a, level }: { analysis: Analysis; level: Level }) {
  const rows = level === "engineer" ? ROWS : ROWS.filter((r) => r.explore);
  const cols = level === "engineer" ? (["baseline", "priority", "intelligent"] as const) : (["baseline", "intelligent"] as const);
  const head = { baseline: "Uncontrolled", priority: "Managed, current schedule", intelligent: "Intelligent management" };
  const yMax = Math.max(5, ...a.baseline.steps.map((s) => Math.max(s.demandKw, s.pvKw)), ...a.intelligent.steps.map((s) => s.demandKw)) * 1.08;
  const lines = narrative(a);

  const table = (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[30rem] text-left text-[13px]">
        <caption className="sr-only">Simulated comparison of the uncontrolled system and intelligent management over the same day</caption>
        <thead>
          <tr className="border-b-2 border-charcoal align-bottom text-[11px] uppercase tracking-[0.08em] text-stone">
            <th className="py-2 pr-3 font-semibold">Same simulated day</th>
            {cols.map((c) => (
              <th key={c} className={cn("py-2 pr-3 text-right font-semibold", c === "intelligent" && "text-charcoal")}>
                {head[c]}
              </th>
            ))}
            <th className="py-2 text-right font-semibold">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-rule">
              <th scope="row" className="py-2 pr-3 font-normal text-charcoal">
                {r.label}
                {r.note && level === "engineer" && <span className="block text-[11px] text-stone">{r.note}</span>}
              </th>
              {cols.map((c) => (
                <td key={c} className={cn("whitespace-nowrap py-2 pr-3 text-right font-mono tabular-nums", c === "intelligent" ? "text-charcoal" : "text-charcoal-2")}>
                  {r.fmt(r.get(a[c].summary))}
                </td>
              ))}
              <td className="whitespace-nowrap py-2 text-right font-mono text-[12px]">
                <Delta a={r.get(a.baseline.summary)} b={r.get(a.intelligent.summary)} row={r} />
              </td>
            </tr>
          ))}
          <tr className="border-b border-rule">
            <th scope="row" className="py-2 pr-3 font-normal text-charcoal">
              Flexible loads shifted
            </th>
            {cols.map((c) => (
              <td key={c} className="py-2 pr-3 text-right font-mono">
                {c === "intelligent" ? a.changes.length : 0}
              </td>
            ))}
            <td className="py-2 text-right font-mono text-[12px] text-stone">{a.changes.length ? `${a.changes.length} of ${FLEXIBLE_IDS.length}` : "none"}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[11.5px] leading-relaxed text-stone">● better · ▲ worse, judged per metric. Every value is computed by the simulator for the same day, equipment and weather.</p>
    </div>
  );

  return (
    <div className="space-y-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <ul className="space-y-4 border-l-2 border-amber pl-5">
            {lines.map((l, i) => (
              <li key={i} className="text-[1.02rem] leading-relaxed text-charcoal">
                {l}
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <p className="mb-4 text-sm font-semibold text-charcoal">Flexible-load schedule</p>
            <Gantt a={a} />
          </div>
        </div>
        <div className="min-w-0 space-y-8 lg:col-span-7">
          {(["baseline", "intelligent"] as const).map((k) => (
            <div key={k}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-charcoal">{head[k]}</p>
                {a[k].summary.unservedKwh > 0.05 ? <Flag tone="short">{kwh(a[k].summary.unservedKwh)} unserved</Flag> : <Flag tone="ok">All demand served</Flag>}
              </div>
              <TimeChart
                ts={a[k].steps.map((s) => s.t)}
                step={STEP_H}
                unit="kW"
                yMax={yMax}
                height={180}
                legend={k === "baseline"}
                ariaLabel={`${head[k]}: power served and unserved over the simulated day. Served ${a[k].summary.servedKwh.toFixed(1)} kWh, unserved ${a[k].summary.unservedKwh.toFixed(1)} kWh.`}
                series={[
                  { id: "served", label: "Demand served", color: COLORS.demand, kind: "area", values: a[k].steps.map((s) => s.servedKw) },
                  { id: "unserved", label: "Unserved", color: COLORS.short, kind: "step-area", values: a[k].steps.map((s) => s.unservedKw) },
                  { id: "solar", label: "Solar available", color: COLORS.solar, kind: "line", values: a[k].steps.map((s) => s.pvKw) },
                ]}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className={cn("min-w-0", level === "engineer" ? "lg:col-span-8" : "lg:col-span-8 lg:col-start-3")}>{table}</div>
        {level === "engineer" && (
          <div className="min-w-0 lg:col-span-4">
            <div className="rounded-xl bg-paper p-5 text-[12.5px] leading-relaxed text-charcoal-2 ring-1 ring-rule">
              <p className="font-semibold text-charcoal">Optimiser</p>
              <p className="mt-1">{a.optimisation.method}</p>
              <p className="mt-2 font-mono text-[11.5px]">J = 1000·U_crit + 100·U_ess + 10·U_std + 9·U_flex + 0.05·E_dis − 0.02·E_end</p>
              <p className="mt-2">
                Schedules simulated: <span className="font-mono">{a.optimisation.evaluated}</span> · passes: <span className="font-mono">{a.optimisation.passes}</span> · J:{" "}
                <span className="font-mono">
                  {a.optimisation.baselineObjective.toFixed(2)} → {a.optimisation.objective.toFixed(2)}
                </span>
              </p>
              <p className="mt-2">
                Guarantee: <strong className="font-semibold text-charcoal">{a.optimisation.guarantee}</strong>
                {a.optimisation.guarantee === "coordinate-wise optimal" && ". No single flexible load can be moved to a better start time on the 30-minute grid. A better joint rearrangement may exist; this is not a proof of global optimality."}
                {a.optimisation.guarantee === "unchanged" && ". No schedule the search evaluated scored better than the current one."}
                {a.optimisation.guarantee === "improved, not converged" && ". The search stopped at its pass limit while still finding improvements, so a single move may still improve this schedule."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
