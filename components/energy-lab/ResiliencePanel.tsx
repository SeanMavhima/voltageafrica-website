"use client";

import { PRIORITY_LABEL } from "@/lib/energy-lab/loads";
import { formatDayClock } from "@/lib/energy-lab/math";
import { NO_STRESS, RESILIENCE_PRESETS, type ResilienceInput, type ResilienceResult } from "@/lib/energy-lab/resilience";
import { WEATHER } from "@/lib/energy-lab/solar";
import { STEP_H, type ScenarioConfig } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import type { Level } from "./Console";
import { COLORS, TimeChart } from "./TimeChart";
import { Flag, Readout, Segmented, SimTag, Slider } from "./ui";

const kwh = (v: number) => `${v.toFixed(1)} kWh`;

export function ResiliencePanel({ input, setInput, result, cfg, level, stale }: { input: ResilienceInput; setInput: (r: ResilienceInput) => void; result: ResilienceResult; cfg: ScenarioConfig; level: Level; stale: boolean }) {
  const set = <K extends keyof ResilienceInput>(k: K, v: ResilienceInput[K]) => setInput({ ...input, [k]: v });
  const b = result.baseline;
  const m = result.intelligent;
  const ts = m.run.steps.map((s) => s.t);
  const activePreset = RESILIENCE_PRESETS.find((p) => Object.entries({ ...NO_STRESS, ...p.input }).every(([k, v]) => input[k as keyof ResilienceInput] === v))?.id ?? null;
  const critical = m.affected.filter((a) => a.priority === "critical" || a.priority === "essential");
  const critB = b.affected.filter((a) => a.priority === "critical");
  const dayCount = result.hours / 24;

  return (
    <div className={cn("transition-opacity duration-300", stale && "opacity-70")}>
      <div className="flex flex-wrap gap-2">
        {RESILIENCE_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => setInput({ ...NO_STRESS, ...p.input })} aria-pressed={activePreset === p.id} title={p.description} className={cn("rounded-full border px-4 py-1.5 text-[13px] transition-colors", activePreset === p.id ? "border-charcoal bg-charcoal text-parchment" : "border-rule-strong text-charcoal hover:border-charcoal")}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setInput(NO_STRESS)} className="rounded-full px-4 py-1.5 text-[13px] text-stone underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
          Clear stresses
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="grid content-start gap-6 min-w-0 lg:col-span-4">
          <div>
            <p className="text-[13px] font-medium text-charcoal">Bad-weather run</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Segmented size="sm" label="Type of bad weather" value={input.cloudType} onChange={(v) => set("cloudType", v)} options={[{ value: "cloudy", label: "Overcast" }, { value: "rainy", label: "Rain" }]} />
            </div>
          </div>
          <Slider label="Consecutive bad-weather days" value={input.cloudyDays} min={0} max={4} step={1} onChange={(v) => set("cloudyDays", v)} format={(v) => (v === 0 ? "none" : `${v} day${v > 1 ? "s" : ""}`)} />
          <Slider label="Unexpected demand increase" value={input.demandIncrease} min={0} max={0.6} step={0.05} onChange={(v) => set("demandIncrease", v)} format={(v) => `+${Math.round(v * 100)}%`} />
          <Slider label="Higher evening demand" value={input.eveningIncrease} min={0} max={0.8} step={0.05} onChange={(v) => set("eveningIncrease", v)} format={(v) => `+${Math.round(v * 100)}%`} hint="Household use 17:00–23:00." />
          <Slider label="New household connections" value={input.extraHouseholds} min={0} max={100} step={5} onChange={(v) => set("extraHouseholds", v)} format={(v) => `+${v}`} />
          <Slider label="Battery health" value={input.batteryHealth} min={0.5} max={1} step={0.05} onChange={(v) => set("batteryHealth", v)} format={(v) => `${Math.round(v * 100)}%`} hint="Degradation reduces usable capacity." />
          <Slider label="Solar array available" value={input.solarAvailable} min={0.4} max={1} step={0.05} onChange={(v) => set("solarAvailable", v)} format={(v) => `${Math.round(v * 100)}%`} hint="Faulty strings, soiling or shading." />
          <Slider label="Battery outage" value={input.batteryOutageHours} min={0} max={12} step={1} onChange={(v) => set("batteryOutageHours", v)} format={(v) => (v === 0 ? "none" : `${v} h from 18:00`)} hint="Battery bank offline on day 1." />
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-charcoal">
              {dayCount}-day stress run · {result.input.cloudyDays ? `${result.input.cloudyDays} ${WEATHER[result.input.cloudType].label.toLowerCase()} day${result.input.cloudyDays > 1 ? "s" : ""}, then clear` : `${WEATHER[cfg.weather].label.toLowerCase()} first day, then clear`}
            </p>
            <SimTag>Simulated experiment</SimTag>
          </div>
          <div className="mt-4">
            <TimeChart
              ts={ts}
              step={STEP_H}
              unit="%"
              yMax={100}
              height={220}
              multiDay
              yTicks={[0, 25, 50, 75, 100]}
              spans={result.stressEnd > 0 ? [{ start: 0, end: result.stressEnd, color: "var(--color-stone-2)", label: "Stress period", opacity: 0.1 }] : []}
              ariaLabel={`Battery charge over ${dayCount} simulated days. Intelligent management: lowest ${Math.round(m.run.summary.minSoc * 100)}%. Uncontrolled: lowest ${Math.round(b.run.summary.minSoc * 100)}%.`}
              series={[
                { id: "m", label: "Intelligent management", color: COLORS.battery, kind: "line", values: m.run.steps.map((s) => s.soc * 100), format: (v) => `${v.toFixed(0)}%` },
                { id: "b", label: "Uncontrolled", color: COLORS.alt, kind: "line", dashed: true, values: b.run.steps.map((s) => s.soc * 100), format: (v) => `${v.toFixed(0)}%` },
              ]}
            />
          </div>

          <div className="relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[12.5px]">
              <caption className="sr-only">Share of demand served per simulated day</caption>
              <thead>
                <tr className="border-b-2 border-charcoal text-[11px] uppercase tracking-[0.08em] text-stone">
                  <th className="py-2 font-semibold">Day</th>
                  {m.days.map((d) => (
                    <th key={d.day} className="py-2 text-right font-semibold">
                      {d.day + 1} · {WEATHER[d.weather].label.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {[
                  ["Uncontrolled", b],
                  ["Intelligent", m],
                ].map(([label, o]) => (
                  <tr key={label as string} className="border-b border-rule">
                    <th scope="row" className="py-2 font-sans font-normal text-charcoal">
                      {label as string}
                    </th>
                    {(o as typeof m).days.map((d) => {
                      const share = d.servedKwh / Math.max(d.demandKwh, 0.01);
                      return (
                        <td key={d.day} className="py-2 text-right">
                          <span className="relative inline-block min-w-[3.5rem]">
                            <span className={cn(share < 0.995 && "text-status-critical-ink")}>{(share * 100).toFixed(0)}%</span>
                            {d.criticalUnservedKwh > 0.05 && (
                              <span className="block text-[10px] text-status-critical-ink" title="Clinic demand unserved">
                                ▲ clinic {d.criticalUnservedKwh.toFixed(1)}
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] text-stone">Share of each day&apos;s demand served. ▲ clinic: kWh of critical demand unserved.</p>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-rule pt-6 sm:grid-cols-4">
            <Readout label="Energy deficit" value={m.run.summary.unservedKwh.toFixed(0)} unit="kWh" emphasis={m.run.summary.unservedKwh > 0.5 ? "short" : undefined} note={`uncontrolled: ${b.run.summary.unservedKwh.toFixed(0)} kWh`} />
            <Readout label="Hours fully served" value={m.run.summary.hoursFullyServed.toFixed(0)} unit={`of ${result.hours} h`} note={`uncontrolled: ${b.run.summary.hoursFullyServed.toFixed(0)} h`} />
            <Readout label="Clinic unserved" value={m.run.summary.unservedByPriority.critical.toFixed(1)} unit="kWh" note={`uncontrolled: ${b.run.summary.unservedByPriority.critical.toFixed(1)} kWh`} />
            <Readout label="Recovered" value={m.recoveredAt === null ? "—" : formatDayClock(m.recoveredAt).replace("Day ", "D")} note={m.recoveredAt === null ? "battery not back above reserve in this run" : "battery back above the reserve"} />
          </dl>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <p className="kicker text-stone">Loads affected (intelligent)</p>
              {m.affected.length ? (
                <ul className="mt-2">
                  {m.affected.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 border-t border-rule py-1.5 text-[13px]">
                      <span>
                        {a.name} <span className="text-[11px] text-stone">· {PRIORITY_LABEL[a.priority]}</span>
                      </span>
                      <span className="font-mono text-[12px]">
                        {kwh(a.unservedKwh)} · {a.outageHours.toFixed(1)} h
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-charcoal-2">None. Every load is fully supplied through this test.</p>
              )}
              <p className="mt-3 text-[12.5px] leading-relaxed text-charcoal-2">
                {critB.length ? (
                  <>
                    Without management the clinic loses {kwh(critB[0].unservedKwh)} over {critB[0].outageHours.toFixed(1)} h, because the whole network trips with the battery.
                    {m.run.summary.unservedByPriority.critical < 0.05 ? " With management it never loses supply." : ""}
                  </>
                ) : critical.length ? (
                  "Essential services lose some supply even with management: the shortage is physical."
                ) : (
                  "Critical and essential services keep supply throughout."
                )}
              </p>
            </div>
            <div>
              <p className="kicker text-stone">Potential interventions</p>
              <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-charcoal">
                {m.run.summary.unservedKwh <= 0.01 * m.run.summary.demandKwh ? (
                  <li className="border-t border-rule pt-2">None needed: intelligent management keeps unserved energy below 1% of demand.</li>
                ) : (
                  <>
                    <li className="border-t border-rule pt-2">
                      <strong className="font-semibold">Add solar:</strong> {result.sizing.addKwp != null ? `about +${result.sizing.addKwp} kWp (to ${cfg.solarKwp + result.sizing.addKwp} kWp)` : `not enough on its own within +${result.sizing.searchedUpToKwp} kWp`}
                    </li>
                    <li className="border-t border-rule pt-2">
                      <strong className="font-semibold">Add storage:</strong> {result.sizing.addKwh != null ? `about +${result.sizing.addKwh} kWh (to ${cfg.batteryKwh + result.sizing.addKwh} kWh nominal)` : `not enough on its own within +${result.sizing.searchedUpToKwh} kWh`}
                    </li>
                    <li className="border-t border-rule pt-2">
                      <strong className="font-semibold">Manage demand:</strong> defer flexible loads during the stress period and hold a larger reserve before forecast bad weather.
                    </li>
                  </>
                )}
              </ul>
              <p className="mt-3 text-[11.5px] leading-relaxed text-stone">Sizing: smallest addition (each on its own) that keeps unserved energy ≤ 1% of demand in this run, found by bisection on simulated runs. A screening estimate, not a design.</p>
            </div>
          </div>
          {level === "engineer" && (
            <p className="mt-6 text-[12px] leading-relaxed text-stone">
              First time the battery reached its floor or the network tripped: intelligent {m.depletedAt === null ? "never" : formatDayClock(m.depletedAt)}, uncontrolled {b.depletedAt === null ? "never" : formatDayClock(b.depletedAt)}. Stresses other than weather and outages persist for the whole run. Battery health scales usable capacity; ageing during the run is not modelled.
            </p>
          )}
        </div>
      </div>
      {m.run.summary.unservedByPriority.critical < 0.05 && b.run.summary.unservedByPriority.critical > 0.05 && (
        <div className="mt-12 flex items-start gap-3 border-l-2 border-forest pl-5">
          <Flag tone="ok">Resilience</Flag>
          <p className="max-w-[70ch] text-[15px] leading-relaxed text-charcoal">Same panels, same battery, same weather. The difference is intelligence: deciding what to supply, when, and what to protect.</p>
        </div>
      )}
    </div>
  );
}
