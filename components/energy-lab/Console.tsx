"use client";

import { Pause, Play } from "lucide-react";
import { LOADS, LOAD_MAP, PRIORITY_LABEL, PRIORITY_NOTE } from "@/lib/energy-lab/loads";
import { formatClock } from "@/lib/energy-lab/math";
import { inverterKw, socAt, SPEC, stepAt } from "@/lib/energy-lab/simulate";
import { WEATHER } from "@/lib/energy-lab/solar";
import type { Analysis } from "@/lib/energy-lab/explain";
import { STEP_H, type ScenarioConfig, type SimResult, type StepResult } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import { FlowDiagram, GROUPS, groupFlow, type NodeKey } from "./FlowDiagram";
import { COLORS, TimeChart } from "./TimeChart";
import { Flag, Readout, Segmented, SimTag, fmt } from "./ui";

export type Level = "explore" | "engineer";
export type View = "intelligent" | "baseline";

export function systemState(st: StepResult, managed: boolean): { tone: "short" | "ok" | "info" | "warn"; label: string; sentence: string } {
  const charge = Math.max(0, st.batteryKw);
  const discharge = Math.max(0, -st.batteryKw);
  if (st.tripped || (!managed && st.unservedKw > 0.01 && st.servedKw < 0.01))
    return { tone: "short", label: "Network down", sentence: `The battery reached its low-voltage limit and the whole network has tripped. It reconnects once solar recharges the battery to ${SPEC.reconnectSoc * 100}%.` };
  if (st.unservedKw > 0.01) return { tone: "short", label: "Energy deficit", sentence: `Supply falls ${st.unservedKw.toFixed(1)} kW short of demand. Lower-priority loads are switched off so the clinic and essential services keep power.` };
  if (charge > 0.05) return { tone: "ok", label: "Solar surplus", sentence: `Solar covers all demand and the surplus charges the battery${st.curtailedKw > 0.05 ? "; the battery cannot absorb it all, so some generation is curtailed" : ""}.` };
  if (st.curtailedKw > 0.05) return { tone: "ok", label: "Battery full", sentence: `Solar covers all demand and the battery is full, so ${st.curtailedKw.toFixed(1)} kW of generation is going unused: room for more daytime productive use.` };
  if (st.pvKw > 0.05 && discharge > 0.05) return { tone: "warn", label: "Solar + storage", sentence: "Solar covers part of demand; the battery supplies the rest." };
  if (discharge > 0.05) return { tone: "info", label: "On storage", sentence: "No solar generation. The whole community runs on the battery." };
  return { tone: "info", label: "Balanced", sentence: "Generation and demand are in balance." };
}

const NODE_INFO: Record<NodeKey, { title: string; role: string }> = {
  solar: { title: "Solar array", role: "Converts sunlight into electricity. Output follows the sun's height, the weather and the panels' temperature." },
  ems: { title: "Energy management", role: "Decides every 15 minutes which loads are supplied, when the battery charges or discharges, and when flexible loads run." },
  battery: { title: "Battery storage", role: "Stores daytime surplus for the evening and night. A reserve is held back for critical services." },
  distribution: { title: "Distribution network", role: "The low-voltage lines and smart meters that deliver power to each connection." },
  homes: { title: "Households", role: "Lighting, refrigeration, phone charging and appliances. Demand peaks in the evening." },
  clinic: { title: "Health clinic", role: "Critical load: lighting, equipment and the vaccine fridge. Always supplied first." },
  school: { title: "School", role: "Lights, computers and a projector during lessons." },
  business: { title: "Shops & cold room", role: "Small businesses trading into the evening, plus refrigerated produce storage." },
  water: { title: "Water pump", role: "Fills an elevated tank. Flexible: it can run whenever there is sun, if the tank can bridge the gap." },
  productive: { title: "Mill & workshop", role: "Grain milling and workshop tools: the productive uses that earn income. Flexible within opening hours." },
};

function Details({ k, run, hour, cfg, level }: { k: NodeKey; run: SimResult; hour: number; cfg: ScenarioConfig; level: Level }) {
  const st = stepAt(run, hour);
  const soc = socAt(run, hour);
  const info = NODE_INFO[k];
  let rows: [string, string][] = [];
  const group = GROUPS.find((g) => g.key === k);
  if (k === "solar") {
    rows = [
      ["Output now", fmt.kw(st.pvKw)],
      ["Rated capacity", `${cfg.solarKwp} kWp`],
      ["Weather", WEATHER[cfg.weather].label],
      ["Generated today", fmt.kwh(run.summary.pvAvailableKwh)],
    ];
    if (level === "engineer") rows.push(["System derate", `${SPEC.pvDerate}`], ["Temp. coefficient", `${(SPEC.pvTempCoeff * 100).toFixed(2)} %/°C`], ["Clearness factor", `${WEATHER[cfg.weather].k}`], ["Curtailed now", fmt.kw(st.curtailedKw)]);
  } else if (k === "battery") {
    rows = [
      ["State of charge", fmt.pct(soc)],
      ["Stored", `${(soc * run.capacityKwh).toFixed(1)} kWh`],
      ["Reserve for clinic", fmt.pct(run.reserveSoc)],
      ["Now", st.batteryKw > 0.05 ? `charging ${fmt.kw(st.batteryKw)}` : st.batteryKw < -0.05 ? `discharging ${fmt.kw(-st.batteryKw)}` : "idle"],
    ];
    if (level === "engineer") rows.push(["Capacity", `${run.capacityKwh.toFixed(0)} kWh`], ["SOC window", `${SPEC.minSoc * 100}–${SPEC.maxSoc * 100}%`], ["Efficiency (ch / dis)", `${SPEC.chargeEff} / ${SPEC.dischargeEff}`], ["Power limit", `${(SPEC.cRate * run.capacityKwh).toFixed(0)} kW (${SPEC.cRate}C)`], ["Cycles today", run.summary.equivalentCycles.toFixed(2)]);
  } else if (k === "ems") {
    rows = [
      ["Mode", run.strategy === "baseline" ? "No load control" : "Priority dispatch"],
      ["Supplying", fmt.kw(st.servedKw)],
      ["Unserved", fmt.kw(st.unservedKw)],
    ];
    if (level === "engineer") rows.push(["Inverter rating", `${inverterKw(cfg).toFixed(1)} kW`], ["Dispatch interval", `${STEP_H * 60} min`], ["Order", "critical → essential → standard → flexible"]);
  } else if (k === "distribution") {
    rows = [
      ["Connections", `${cfg.households} households + community`],
      ["Delivering", fmt.kw(st.servedKw)],
      ["Status", st.tripped ? "tripped" : "energised"],
    ];
  } else if (group) {
    const gf = groupFlow(st, group);
    rows = [
      ["Demand now", fmt.kw(gf.demand)],
      ["Supplied", fmt.kw(gf.served)],
      ...group.loads.map((id) => [`${LOAD_MAP[id].short}`, `${PRIORITY_LABEL[LOAD_MAP[id].priority]} · ${LOAD_MAP[id].schedule}`] as [string, string]),
    ];
    if (group.loads.some((id) => LOAD_MAP[id].flexible)) {
      for (const id of group.loads.filter((x) => LOAD_MAP[x].flexible)) rows.push([`${LOAD_MAP[id].short} runs`, `${formatClock(run.schedule[id] ?? 0)} start`]);
    }
  }
  return (
    <div className="rounded-xl bg-parchment px-5 py-4">
      <p className="text-[15px] font-semibold text-charcoal">{info.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-charcoal-2">{info.role}</p>
      <dl className="mt-3 grid gap-1.5 text-[12.5px]">
        {rows.map(([a, b]) => (
          <div key={a} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 border-t border-rule pt-1.5">
            <dt className="text-stone">{a}</dt>
            <dd className="text-charcoal">{b}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const MOMENTS = [
  { label: "Morning", h: 7 },
  { label: "Midday", h: 12.5 },
  { label: "Afternoon", h: 15.5 },
  { label: "Evening", h: 19.5 },
  { label: "Night", h: 23 },
];

export function Console({ analysis, cfg, view, setView, hour, setHour, playing, setPlaying, level, selected, setSelected, stale }: { analysis: Analysis; cfg: ScenarioConfig; view: View; setView: (v: View) => void; hour: number; setHour: (h: number) => void; playing: boolean; setPlaying: (p: boolean) => void; level: Level; selected: NodeKey | null; setSelected: (k: NodeKey | null) => void; stale: boolean }) {
  const run = view === "baseline" ? analysis.baseline : analysis.intelligent;
  const st = stepAt(run, hour);
  const soc = socAt(run, hour);
  const state = systemState(st, view !== "baseline");
  const ts = run.steps.map((s) => s.t);
  const maxKw = Math.max(5, ...run.steps.map((s) => Math.max(s.pvKw, s.demandKw))) * 1.08;
  const peakIdx = run.steps.reduce((b, s, i, a) => (s.pvKw > a[b].pvKw ? i : b), 0);
  const demIdx = run.steps.reduce((b, s, i, a) => (s.t > 17 && s.demandKw > a[b].demandKw ? i : b), 72);

  return (
    <div className={cn("transition-opacity duration-300", stale && "opacity-70")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label="Which system to show"
          value={view}
          onChange={setView}
          options={[
            { value: "intelligent", label: "Intelligent management", title: "Priority dispatch with a reserve and an optimised schedule" },
            { value: "baseline", label: "Uncontrolled", title: "A conventional system with no load management" },
          ]}
        />
        <div className="flex items-center gap-3">
          <Flag tone={state.tone}>{state.label}</Flag>
          <SimTag />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl bg-paper p-3 ring-1 ring-rule sm:p-5">
            <FlowDiagram step={st} soc={soc} hour={hour} managed={view !== "baseline"} selected={selected} onSelect={(k) => setSelected(selected === k ? null : k)} solarKwp={cfg.solarKwp} batteryKwh={Math.round(run.capacityKwh)} />
          </div>

          {/* Clock */}
          <div className="mt-5 rounded-2xl bg-paper px-4 py-4 ring-1 ring-rule sm:px-6">
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => setPlaying(!playing)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-charcoal text-parchment hover:bg-forest" aria-label={playing ? "Pause the simulated day" : "Play the simulated day"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <label htmlFor="lab-clock" className="sr-only">
                  Simulated time of day
                </label>
                <input id="lab-clock" type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="lab-range w-full" style={{ ["--pct" as string]: `${(hour / 23.75) * 100}%` }} aria-valuetext={formatClock(hour)} />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-stone">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>
              <p className="font-mono text-[2rem] leading-none tabular-nums text-charcoal" aria-live="off">
                {formatClock(hour)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOMENTS.map((m) => (
                <button key={m.label} type="button" onClick={() => setHour(m.h)} className={cn("rounded-full border px-3 py-1 text-[12px] transition-colors", Math.abs(hour - m.h) < 0.6 ? "border-charcoal bg-charcoal text-parchment" : "border-rule-strong text-charcoal-2 hover:border-charcoal")}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-4">
          <p className="text-[15px] leading-relaxed text-charcoal" aria-live="polite">
            {state.sentence}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-rule pt-6">
            <Readout label="Solar" value={st.pvKw.toFixed(1)} unit="kW" swatch={COLORS.solar} />
            <Readout label="Demand" value={st.demandKw.toFixed(1)} unit="kW" swatch={COLORS.demand} />
            <Readout label="Battery" value={`${Math.round(soc * 100)}`} unit="%" swatch={COLORS.battery} note={st.batteryKw > 0.05 ? `charging ${fmt.kw(st.batteryKw)}` : st.batteryKw < -0.05 ? `discharging ${fmt.kw(-st.batteryKw)}` : "idle"} />
            <Readout label="Unserved" value={st.unservedKw.toFixed(1)} unit="kW" emphasis={st.unservedKw > 0.01 ? "short" : undefined} note={st.unservedKw > 0.01 ? "▲ demand not supplied" : "all demand supplied"} />
          </dl>
          <div className="mt-6">{selected ? <Details k={selected} run={run} hour={hour} cfg={cfg} level={level} /> : <p className="rounded-xl border border-dashed border-rule-strong px-5 py-4 text-[13px] leading-relaxed text-stone">Select any part of the system — the panels, the battery, the clinic — to see its role and its simulated readings.</p>}</div>

          {level === "engineer" && (
            <div className="mt-6">
              <p className="kicker text-stone">Dispatch at {formatClock(hour)}</p>
              <table className="mt-2 w-full text-left text-[12px]">
                <thead className="text-stone">
                  <tr>
                    <th className="py-1 font-medium">Load</th>
                    <th className="py-1 font-medium">Priority</th>
                    <th className="py-1 text-right font-medium">kW</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {LOADS.map((l) => {
                    const x = st.loads[l.id];
                    const short = x.demand - x.served > 0.005;
                    return (
                      <tr key={l.id} className="border-t border-rule">
                        <td className="py-1 font-sans">{l.short}</td>
                        <td className="py-1 font-sans text-stone" title={PRIORITY_NOTE[l.priority]}>
                          {PRIORITY_LABEL[l.priority]}
                        </td>
                        <td className={cn("py-1 text-right tabular-nums", short && "text-status-critical-ink")}>
                          {x.served.toFixed(2)}
                          {short && ` / ${x.demand.toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Day profile */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <p className="text-sm font-semibold text-charcoal">Power over the simulated day</p>
          <p className="mb-3 text-[12.5px] text-stone">Click the chart to move the clock.</p>
          <TimeChart
            ts={ts}
            step={STEP_H}
            unit="kW"
            yMax={maxKw}
            marker={hour}
            onPick={setHour}
            ariaLabel={`Simulated solar generation and demand over 24 hours. Peak solar ${run.summary.pvAvailableKwh.toFixed(0)} kWh over the day, demand ${run.summary.demandKwh.toFixed(0)} kWh, unserved ${run.summary.unservedKwh.toFixed(1)} kWh.`}
            directLabels={{ solar: peakIdx, demand: demIdx }}
            series={[
              { id: "solar", label: "Solar", color: COLORS.solar, kind: "area", values: run.steps.map((s) => s.pvKw) },
              { id: "demand", label: "Demand", color: COLORS.demand, kind: "line", values: run.steps.map((s) => s.demandKw) },
              { id: "unserved", label: "Unserved", color: COLORS.short, kind: "step-area", values: run.steps.map((s) => s.unservedKw) },
            ]}
          />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <p className="text-sm font-semibold text-charcoal">Battery state of charge</p>
          <p className="mb-3 text-[12.5px] text-stone">Dashed: the reserve held for the clinic.</p>
          <TimeChart
            ts={ts}
            step={STEP_H}
            unit="%"
            yMax={100}
            height={220}
            marker={hour}
            onPick={setHour}
            yTicks={[0, 25, 50, 75, 100]}
            ariaLabel={`Simulated battery state of charge: starts at ${Math.round(run.summary.startSoc * 100)}%, lowest ${Math.round(run.summary.minSoc * 100)}%, ends at ${Math.round(run.summary.endSoc * 100)}%.`}
            series={[
              { id: "soc", label: "Charge", color: COLORS.battery, kind: "area", values: run.steps.map((s) => s.soc * 100), format: (v) => `${v.toFixed(0)}%` },
              { id: "reserve", label: "Reserve", color: COLORS.muted, kind: "line", dashed: true, values: run.steps.map(() => run.reserveSoc * 100), format: (v) => `${v.toFixed(0)}%` },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
