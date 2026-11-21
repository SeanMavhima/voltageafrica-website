"use client";

import type { Forecast } from "@/lib/energy-lab/forecast";
import { formatClock, formatDayClock } from "@/lib/energy-lab/math";
import { WEATHER } from "@/lib/energy-lab/solar";
import { STEP_H } from "@/lib/energy-lab/types";
import type { Level } from "./Console";
import { COLORS, TimeChart } from "./TimeChart";
import { Flag, Readout, SimTag } from "./ui";

export function ForecastPanel({ f, level }: { f: Forecast; level: Level }) {
  const ts = f.points.map((p) => p.t);
  const yMax = Math.max(5, ...f.points.map((p) => Math.max(p.pvHigh, p.demandHigh))) * 1.08;
  const spans = [
    ...f.surpluses.map((w) => ({ start: w.start, end: w.end, color: COLORS.solar, label: "Solar surplus", opacity: 0.12 })),
    ...f.shortages.map((w) => ({ start: w.start, end: w.end, color: COLORS.short, label: w.case === "central" ? "Shortage expected" : "Shortage in low case", opacity: w.case === "central" ? 0.16 : 0.08 })),
  ];
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-charcoal">
            Next 24 hours from {formatClock(f.from)} · {WEATHER[f.weather[0]].label.toLowerCase()} today, {WEATHER[f.weather[1]].label.toLowerCase()} tomorrow
          </p>
          <SimTag>Simulated forecast</SimTag>
        </div>
        <div className="mt-4">
          <TimeChart
            ts={ts}
            step={STEP_H}
            unit="kW"
            yMax={yMax}
            multiDay
            spans={spans}
            ariaLabel={`Simulated 24-hour forecast of solar generation and demand. Solar ${f.totals.pv.toFixed(0)} kWh central, ${f.totals.pvLow.toFixed(0)} to ${f.totals.pvHigh.toFixed(0)} kWh across the bounds. Demand ${f.totals.demand.toFixed(0)} kWh.`}
            series={[
              { id: "pvband", label: "Solar, low–high case", color: COLORS.solar, kind: "band", values: f.points.map((p) => p.pv), lower: f.points.map((p) => p.pvLow), upper: f.points.map((p) => p.pvHigh), format: (v) => `${v.toFixed(1)}` },
              { id: "pv", label: "Solar, central", color: COLORS.solar, kind: "line", values: f.points.map((p) => p.pv) },
              { id: "demand", label: "Demand", color: COLORS.demand, kind: "line", values: f.points.map((p) => p.demand) },
            ]}
          />
        </div>
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-charcoal">Battery state of charge</p>
          <TimeChart
            ts={ts}
            step={STEP_H}
            unit="%"
            yMax={100}
            height={180}
            multiDay
            yTicks={[0, 25, 50, 75, 100]}
            ariaLabel={`Simulated battery forecast: ends at ${Math.round(f.totals.endSoc * 100)}% in the central case and ${Math.round(f.totals.endSocLow * 100)}% in the low case.`}
            series={[
              { id: "soc", label: "Central case", color: COLORS.battery, kind: "line", values: f.points.map((p) => p.soc * 100), format: (v) => `${v.toFixed(0)}%` },
              { id: "soclow", label: "Low case (less sun, +10% demand)", color: COLORS.alt, kind: "line", dashed: true, values: f.points.map((p) => p.socLow * 100), format: (v) => `${v.toFixed(0)}%` },
            ]}
          />
        </div>
      </div>

      <div className="min-w-0 lg:col-span-4">
        <dl className="grid grid-cols-2 gap-6 border-t-2 border-charcoal pt-5">
          <Readout label="Solar expected" value={f.totals.pv.toFixed(0)} unit="kWh" note={`${f.totals.pvLow.toFixed(0)}–${f.totals.pvHigh.toFixed(0)} kWh across the bounds`} />
          <Readout label="Demand expected" value={f.totals.demand.toFixed(0)} unit="kWh" note="±10% in the bounds" />
          <Readout label="Shortfall" value={f.totals.unserved.toFixed(1)} unit="kWh" emphasis={f.totals.unserved > 0.05 ? "short" : undefined} note={`${f.totals.unservedLow.toFixed(1)} kWh in the low case`} />
          <Readout label="Battery in 24 h" value={`${Math.round(f.totals.endSoc * 100)}`} unit="%" note={`${Math.round(f.totals.endSocLow * 100)}% in the low case`} />
        </dl>

        <div className="mt-8">
          <p className="kicker text-stone">Shortage windows</p>
          {f.shortages.length ? (
            <ul className="mt-2 space-y-2">
              {f.shortages.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-t border-rule pt-2 text-[13px]">
                  <span>
                    {formatDayClock(w.start)} → {formatClock(w.end)}
                  </span>
                  <Flag tone={w.case === "central" ? "short" : "warn"}>
                    {w.kwh.toFixed(1)} kWh{w.case === "low case" ? " · low case" : ""}
                  </Flag>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-charcoal-2">None expected, even in the low case.</p>
          )}
        </div>

        <div className="mt-8">
          <p className="kicker text-stone">Recommended windows for flexible loads</p>
          <ul className="mt-2 space-y-2">
            {f.flexWindows.map((w) => (
              <li key={w.id} className="border-t border-rule pt-2 text-[13px]">
                <span className="flex justify-between gap-3">
                  <span className="font-medium text-charcoal">{w.name}</span>
                  <span className="font-mono">
                    {formatDayClock(w.start)}–{formatClock(w.end)}
                  </span>
                </span>
                <span className="text-[12px] text-stone">
                  {Math.round(w.solarShareCentral * 100)}% covered by surplus solar · {Math.round(w.solarShareLow * 100)}% in the low case
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-rule-strong p-4 text-[12.5px] leading-relaxed text-charcoal-2">
          <p className="font-semibold text-charcoal">How this forecast is made</p>
          <p className="mt-1">{f.method}</p>
          {level === "engineer" && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {f.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          {level !== "engineer" && <p className="mt-2">It is a simulation of what the model expects, not a prediction from real weather data or a deployed forecasting model.</p>}
        </div>
      </div>
    </div>
  );
}
