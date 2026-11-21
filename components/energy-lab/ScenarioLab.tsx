"use client";

import { RotateCcw } from "lucide-react";
import { flexibleSpec, LOAD_MAP } from "@/lib/energy-lab/loads";
import { formatClock } from "@/lib/energy-lab/math";
import { BOUNDS } from "@/lib/energy-lab/schema";
import { WEATHER, WEATHER_ORDER } from "@/lib/energy-lab/solar";
import type { LoadId, ScenarioConfig, Weather } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import type { Level } from "./Console";
import { Segmented, Slider } from "./ui";

export type PresetView = { id: string; index: string; title: string; summary: string };

export const SHORT_WEATHER: Record<Weather, string> = { clear: "Clear", partly: "Partly", afternoon: "Cloudy pm", cloudy: "Overcast", rainy: "Rain" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const doyToMonth = (d: number) => Math.min(11, Math.floor((d - 1) / 30.5));

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 border-t-2 border-charcoal pt-5">
      <legend className="float-left w-full pb-4">
        <span className="serif block text-[1.35rem] text-charcoal">{title}</span>
        {note && <span className="mt-1 block text-[12.5px] leading-snug text-stone">{note}</span>}
      </legend>
      <div className="clear-both grid gap-6">{children}</div>
    </fieldset>
  );
}

export function ScenarioLab({ cfg, setCfg, presets, presetId, onPreset, onReset, level }: { cfg: ScenarioConfig; setCfg: (c: ScenarioConfig) => void; presets: PresetView[]; presetId: string | null; onPreset: (id: string) => void; onReset: () => void; level: Level }) {
  const set = <K extends keyof ScenarioConfig>(k: K, v: ScenarioConfig[K]) => setCfg({ ...cfg, [k]: v });
  const weatherOpts = WEATHER_ORDER.map((w) => ({ value: w, label: SHORT_WEATHER[w], title: WEATHER[w].label }));
  const flexSlider = (id: LoadId, key: "pumpStart" | "millStart" | "workshopStart") => {
    const spec = flexibleSpec(id, cfg);
    const max = spec.latest - spec.runHours;
    const v = Math.min(max, Math.max(spec.earliest, cfg[key]));
    return (
      <Slider
        key={id}
        label={`${LOAD_MAP[id].short} start`}
        value={v}
        min={spec.earliest}
        max={Math.max(spec.earliest + 0.5, max)}
        step={0.5}
        onChange={(x) => set(key, x)}
        format={(x) => `${formatClock(x)}–${formatClock(x + spec.runHours)}`}
        hint={`${spec.powerKw} kW for ${spec.runHours} h, allowed ${formatClock(spec.earliest)}–${formatClock(spec.latest)}`}
      />
    );
  };

  return (
    <div>
      <ol className="grid gap-px overflow-hidden rounded-2xl bg-rule ring-1 ring-rule sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => {
          const on = p.id === presetId;
          return (
            <li key={p.id} className="flex">
              <button type="button" onClick={() => onPreset(p.id)} aria-pressed={on} className={cn("group flex w-full flex-col px-6 py-5 text-left transition-colors", on ? "bg-charcoal text-parchment" : "bg-paper hover:bg-parchment")}>
                <span className={cn("font-mono text-[11px] tracking-[0.1em]", on ? "text-amber" : "text-stone")}>SCENARIO {p.index}</span>
                <span className="serif mt-2 text-[1.45rem] leading-tight">{p.title}</span>
                <span className={cn("mt-2 text-[13px] leading-relaxed", on ? "text-parchment/75" : "text-charcoal-2")}>{p.summary}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-stone">{presetId ? "Adjust any parameter: every figure on the page is recalculated." : "Custom scenario. Every figure on the page reflects these settings."}</p>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-4 py-1.5 text-[13px] text-charcoal hover:border-charcoal">
          <RotateCcw className="h-3.5 w-3.5" /> Reset to the default scenario
        </button>
      </div>

      <div className="mt-10 grid gap-x-12 gap-y-12 md:grid-cols-2 xl:grid-cols-4">
        <Group title="The system" note="Equipment of the simulated hub.">
          <Slider label="Households connected" value={cfg.households} {...BOUNDS.households} onChange={(v) => set("households", v)} format={(v) => `${v}`} />
          <Slider label="Solar capacity" value={cfg.solarKwp} {...BOUNDS.solarKwp} onChange={(v) => set("solarKwp", v)} format={(v) => `${v} kWp`} />
          <Slider label="Battery capacity" value={cfg.batteryKwh} {...BOUNDS.batteryKwh} onChange={(v) => set("batteryKwh", v)} format={(v) => `${v} kWh`} />
          <Slider label="Reserve for the clinic" value={cfg.reservePct} {...BOUNDS.reservePct} onChange={(v) => set("reservePct", v)} format={(v) => `${Math.round(v * 100)}%`} hint="Battery charge only critical loads may use." />
        </Group>

        <Group title="Conditions" note="Weather and the battery's starting charge.">
          <div>
            <p className="text-[13px] font-medium text-charcoal">Weather today</p>
            <div className="mt-2">
              <Segmented size="sm" label="Weather today" value={cfg.weather} onChange={(v: Weather) => set("weather", v)} options={weatherOpts} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-stone">{WEATHER[cfg.weather].description}</p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-charcoal">Weather tomorrow</p>
            <div className="mt-2">
              <Segmented size="sm" label="Weather tomorrow" value={cfg.weatherTomorrow} onChange={(v: Weather) => set("weatherTomorrow", v)} options={weatherOpts} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-stone">Used by the forecast.</p>
          </div>
          <Slider label="Battery charge at midnight" value={cfg.initialSoc} {...BOUNDS.initialSoc} onChange={(v) => set("initialSoc", v)} format={(v) => `${Math.round(v * 100)}%`} />
          {level === "engineer" && (
            <Slider label="Season (sun path)" value={cfg.dayOfYear} min={1} max={365} step={1} onChange={(v) => set("dayOfYear", v)} format={(v) => `day ${v} · ${MONTHS[doyToMonth(v)]}`} hint="Shurugwi, 19.7° S. Winter (June) days are shorter and lower." />
          )}
        </Group>

        <Group title="Demand" note="Multipliers on the reference load profiles.">
          <Slider label="Household demand" value={cfg.householdDemand} {...BOUNDS.householdDemand} onChange={(v) => set("householdDemand", v)} format={(v) => `×${v.toFixed(2)}`} hint="Lighting, appliances, phones, fridges." />
          <Slider label="Business & productive demand" value={cfg.businessDemand} {...BOUNDS.businessDemand} onChange={(v) => set("businessDemand", v)} format={(v) => `×${v.toFixed(2)}`} hint="Shops and cold room; also lengthens milling and workshop hours." />
          <Slider label="School & clinic demand" value={cfg.communityDemand} {...BOUNDS.communityDemand} onChange={(v) => set("communityDemand", v)} format={(v) => `×${v.toFixed(2)}`} />
        </Group>

        <Group title="Flexible schedules" note="When the operator runs flexible loads today. The optimiser may suggest other times.">
          {flexSlider("pump", "pumpStart")}
          {flexSlider("mill", "millStart")}
          {flexSlider("workshop", "workshopStart")}
        </Group>
      </div>
    </div>
  );
}
