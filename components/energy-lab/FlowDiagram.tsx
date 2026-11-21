"use client";

import type { KeyboardEvent } from "react";
import { LOAD_MAP } from "@/lib/energy-lab/loads";
import { clamp } from "@/lib/energy-lab/math";
import type { LoadId, StepResult } from "@/lib/energy-lab/types";
import { COLORS } from "./TimeChart";

export type GroupKey = "homes" | "clinic" | "school" | "business" | "water" | "productive";
export type NodeKey = "solar" | "ems" | "battery" | "distribution" | GroupKey;

export const GROUPS: { key: GroupKey; label: string; loads: LoadId[] }[] = [
  { key: "clinic", label: "Health clinic", loads: ["clinic"] },
  { key: "homes", label: "Households", loads: ["lighting", "refrigeration", "phones", "appliances"] },
  { key: "school", label: "School", loads: ["school"] },
  { key: "business", label: "Shops & cold room", loads: ["business", "coldroom"] },
  { key: "water", label: "Water pump", loads: ["pump"] },
  { key: "productive", label: "Mill & workshop", loads: ["mill", "workshop"] },
];

export function groupFlow(st: StepResult, g: (typeof GROUPS)[number]) {
  const demand = g.loads.reduce((a, id) => a + st.loads[id].demand, 0);
  const served = g.loads.reduce((a, id) => a + st.loads[id].served, 0);
  return { demand, served, short: Math.max(0, demand - served) };
}

const width = (kw: number) => (kw < 0.02 ? 0 : clamp(2 + 10 * Math.sqrt(kw / 20), 2, 13));
const duration = (kw: number) => `${clamp(2.6 / (0.25 + kw / 5), 0.45, 5).toFixed(2)}s`;

function Flow({ d, kw, color, reverse = false, label }: { d: string; kw: number; color: string; reverse?: boolean; label?: string }) {
  const w = width(kw);
  return (
    <g>
      <path d={d} fill="none" stroke="color-mix(in srgb, var(--color-charcoal) 12%, transparent)" strokeWidth={2} />
      {w > 0 && (
        <>
          <path d={d} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={w + 6} strokeLinecap="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={w} className={`lab-flow${reverse ? " lab-flow-rev" : ""}`} style={{ ["--flow-dur" as string]: duration(kw) }}>
            {label && <title>{label}</title>}
          </path>
        </>
      )}
    </g>
  );
}

const keyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export function FlowDiagram({ step, soc, hour, managed, selected, onSelect, solarKwp, batteryKwh }: { step: StepResult; soc: number; hour: number; managed: boolean; selected: NodeKey | null; onSelect: (k: NodeKey) => void; solarKwp: number; batteryKwh: number }) {
  const pv = step.pvKw;
  const toLoad = step.pvToLoadKw;
  const charge = Math.max(0, step.batteryKw);
  const discharge = Math.max(0, -step.batteryKw);
  const served = step.servedKw;
  const day = hour >= 5.8 && hour <= 18.4;
  // Sun position along an arc (illustrative, follows the clock).
  const f = clamp((hour - 6) / 12.5, 0, 1);
  const sunX = 60 + f * 300;
  const sunY = 120 - Math.sin(Math.PI * f) * 85;
  const loadY = [92, 180, 268, 356, 444, 532];
  const node = (k: NodeKey, label: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    "aria-pressed": selected === k,
    onClick: () => onSelect(k),
    onKeyDown: keyActivate(() => onSelect(k)),
    className: "cursor-pointer outline-none [&:focus-visible>.ring]:opacity-100",
  });
  const ring = (k: NodeKey) => (selected === k ? 1 : undefined);

  return (
    <svg viewBox="0 0 1000 620" className="block h-auto w-full select-none" role="group" aria-label="Energy flow through the simulated microgrid. Select a component for details.">
      <defs>
        <linearGradient id="lab-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={day ? "var(--color-amber-soft)" : "var(--color-parchment-3)"} stopOpacity={day ? 0.55 : 0.5} />
          <stop offset="1" stopColor="var(--color-paper)" stopOpacity={0} />
        </linearGradient>
        <pattern id="lab-cells" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill="#2b3a4a" />
          <path d="M0 0H18M0 0V12" stroke="#7d93a8" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="260" rx="18" fill="url(#lab-sky)" />

      {/* ── Flows ── */}
      <Flow d="M240 200 C 320 220, 330 300, 392 300" kw={toLoad + charge} color={COLORS.solar} label={`Solar to energy management: ${(toLoad + charge).toFixed(1)} kW`} />
      <Flow d="M240 450 C 320 440, 330 340, 392 330" kw={charge > discharge ? charge : discharge} color={COLORS.battery} reverse={charge > discharge} label={charge > discharge ? `Charging ${charge.toFixed(1)} kW` : `Discharging ${discharge.toFixed(1)} kW`} />
      <Flow d="M578 315 L 700 315" kw={served} color={COLORS.demand} label={`To distribution: ${served.toFixed(1)} kW`} />
      {GROUPS.map((g, i) => {
        const gf = groupFlow(step, g);
        return <Flow key={g.key} d={`M712 ${loadY[i]} L 792 ${loadY[i]}`} kw={gf.served} color={COLORS.demand} label={`${g.label}: ${gf.served.toFixed(2)} kW`} />;
      })}
      {step.curtailedKw > 0.05 && (
        <g>
          <path d="M165 150 C 200 60, 300 40, 400 46" fill="none" stroke={COLORS.solar} strokeWidth={1.5} strokeDasharray="3 5" opacity={0.7} />
          <text x="406" y="50" className="fill-stone font-mono text-[15px]">
            curtailed {step.curtailedKw.toFixed(1)} kW
          </text>
        </g>
      )}

      {/* ── Sun ── */}
      {day ? (
        <g aria-hidden>
          <circle cx={sunX} cy={sunY} r={26} fill="#e8a344" opacity={0.25} />
          <circle cx={sunX} cy={sunY} r={15} fill="#e8a344" />
        </g>
      ) : (
        <g aria-hidden>
          <circle cx={330} cy={52} r={13} fill="var(--color-stone-2)" opacity={0.55} />
          <circle cx={336} cy={47} r={12} fill="var(--color-paper)" />
        </g>
      )}

      {/* ── Solar array ── */}
      <g {...node("solar", `Solar array, ${pv.toFixed(1)} kilowatts`)}>
        <rect className="ring opacity-0" x="44" y="122" width="214" height="140" rx="14" fill="none" stroke="var(--color-amber-ink)" strokeWidth={2} style={{ opacity: ring("solar") }} />
        <g transform="translate(64 148) skewX(-14)">
          {[0, 1, 2].map((c) => (
            <rect key={c} x={c * 60 + 20} y={0} width={54} height={52} rx={2} fill="url(#lab-cells)" stroke="var(--color-charcoal)" strokeWidth={1.2} opacity={day ? 1 : 0.65} />
          ))}
        </g>
        <line x1="150" x2="150" y1="200" y2="214" stroke="var(--color-charcoal)" strokeWidth={2} />
        <text x="62" y="240" className="fill-charcoal text-[17px] font-semibold">
          Solar array
        </text>
        <text x="240" y="240" textAnchor="end" className="fill-charcoal font-mono text-[17px]">
          {pv.toFixed(1)} kW
        </text>
        <text x="62" y="256" className="fill-stone font-mono text-[12px]">
          {solarKwp} kWp · {Math.round((pv / Math.max(solarKwp, 0.1)) * 100)}% of rated
        </text>
      </g>

      {/* ── Battery ── */}
      <g {...node("battery", `Battery, ${Math.round(soc * 100)} percent charged`)}>
        <rect className="ring opacity-0" x="44" y="380" width="214" height="146" rx="14" fill="none" stroke="var(--color-amber-ink)" strokeWidth={2} style={{ opacity: ring("battery") }} />
        <rect x="70" y="404" width="150" height="62" rx="8" fill="var(--color-paper)" stroke="var(--color-charcoal)" strokeWidth={2} />
        <rect x="220" y="422" width="8" height="26" rx="2" fill="var(--color-charcoal)" />
        <rect x="75" y="409" width={Math.max(0, 140 * soc)} height="52" rx="5" fill={COLORS.battery} opacity={0.85} />
        {/* reserve tick */}
        <text x="145" y="444" textAnchor="middle" className="fill-charcoal font-mono text-[20px] font-medium" style={{ paintOrder: "stroke", stroke: "var(--color-paper)", strokeWidth: 4 }}>
          {Math.round(soc * 100)}%
        </text>
        <text x="62" y="494" className="fill-charcoal text-[17px] font-semibold">
          Battery
        </text>
        <text x="240" y="494" textAnchor="end" className="fill-charcoal font-mono text-[17px]">
          {charge > 0.05 ? `+${charge.toFixed(1)}` : discharge > 0.05 ? `−${discharge.toFixed(1)}` : "0.0"} kW
        </text>
        <text x="62" y="512" className="fill-stone font-mono text-[12px]">
          {(soc * batteryKwh).toFixed(0)} of {batteryKwh} kWh · {charge > 0.05 ? "charging" : discharge > 0.05 ? "discharging" : "idle"}
        </text>
      </g>

      {/* ── Energy management ── */}
      <g {...node("ems", "Energy management system")}>
        <rect x="392" y="250" width="186" height="130" rx="16" fill="#24241f" stroke="var(--color-rule-strong)" />
        <rect className="ring opacity-0" x="384" y="242" width="202" height="146" rx="20" fill="none" stroke="var(--color-amber-ink)" strokeWidth={2} style={{ opacity: ring("ems") }} />
        <text x="485" y="290" textAnchor="middle" className="fill-[#f3efe5] text-[16px] font-semibold">
          Energy
        </text>
        <text x="485" y="310" textAnchor="middle" className="fill-[#f3efe5] text-[16px] font-semibold">
          management
        </text>
        <text x="485" y="340" textAnchor="middle" className="fill-[#e8a344] font-mono text-[12px]">
          {managed ? "PRIORITY DISPATCH" : "NO LOAD CONTROL"}
        </text>
        <text x="485" y="360" textAnchor="middle" className="fill-[#b9c6b0] font-mono text-[11px]">
          {step.tripped ? "NETWORK TRIPPED" : `${served.toFixed(1)} kW out`}
        </text>
      </g>

      {/* ── Distribution bus ── */}
      <g {...node("distribution", "Distribution network")}>
        <rect className="ring opacity-0" x="688" y="62" width="36" height="500" rx="10" fill="none" stroke="var(--color-amber-ink)" strokeWidth={2} style={{ opacity: ring("distribution") }} />
        <line x1="706" x2="706" y1="80" y2="546" stroke={step.tripped ? "var(--color-status-critical)" : "var(--color-charcoal)"} strokeWidth={5} strokeLinecap="round" />
        <text x="706" y="592" textAnchor="middle" className="fill-stone text-[13px] font-semibold uppercase tracking-[0.12em]">
          Distribution
        </text>
      </g>

      {/* ── Loads ── */}
      {GROUPS.map((g, i) => {
        const gf = groupFlow(step, g);
        const y = loadY[i];
        const frac = gf.demand > 0 ? gf.served / gf.demand : 1;
        const prio = LOAD_MAP[g.loads[0]].priority;
        const short = gf.short > 0.01;
        return (
          <g key={g.key} {...node(g.key, `${g.label}: ${gf.served.toFixed(2)} of ${gf.demand.toFixed(2)} kilowatts${short ? ", short of supply" : ""}`)}>
            <rect x="792" y={y - 34} width="200" height="68" rx="12" fill="var(--color-paper)" stroke={short ? "var(--color-status-critical)" : "color-mix(in srgb, var(--color-charcoal) 18%, transparent)"} strokeWidth={short ? 2 : 1} />
            <rect className="ring opacity-0" x="786" y={y - 40} width="212" height="80" rx="16" fill="none" stroke="var(--color-amber-ink)" strokeWidth={2} style={{ opacity: ring(g.key) }} />
            <text x="806" y={y - 10} className="fill-charcoal text-[15px] font-semibold">
              {g.label}
            </text>

            <rect x="806" y={y + 2} width="172" height="6" rx="3" fill="color-mix(in srgb, var(--color-charcoal) 8%, transparent)" />
            {gf.demand > 0.005 && <rect x="806" y={y + 2} width={172 * frac} height="6" rx="3" fill={COLORS.demand} />}
            {short && <rect x={806 + 172 * frac} y={y + 2} width={172 * (1 - frac)} height="6" rx="3" fill="var(--color-status-critical)" opacity={0.85} />}
            <text x="806" y={y + 26} className="fill-charcoal-2 font-mono text-[12px]">
              {gf.demand < 0.005 ? "off" : `${gf.served.toFixed(2)} / ${gf.demand.toFixed(2)} kW`}
            </text>
            {short ? (
              <text x="978" y={y + 26} textAnchor="end" className="fill-status-critical-ink font-mono text-[12px] font-medium">
                ▲ short {gf.short.toFixed(2)}
              </text>
            ) : (
              <text x="978" y={y + 26} textAnchor="end" className="fill-stone-2 font-mono text-[10px] uppercase">
                {prio}
              </text>
            )}
          </g>
        );
      })}

      {step.unservedKw > 0.01 && (
        <g aria-hidden>
          <rect x="392" y="400" width="186" height="44" rx="10" fill="var(--color-status-critical)" opacity={0.1} />
          <text x="485" y="418" textAnchor="middle" className="fill-status-critical-ink text-[12px] font-semibold uppercase tracking-[0.08em]">
            ▲ Energy deficit
          </text>
          <text x="485" y="436" textAnchor="middle" className="fill-status-critical-ink font-mono text-[13px]">
            {step.unservedKw.toFixed(1)} kW unserved
          </text>
        </g>
      )}
    </svg>
  );
}
