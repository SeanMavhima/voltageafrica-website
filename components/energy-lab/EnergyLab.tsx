"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { Accent } from "@/components/ui/Accent";
import type { LabSettings } from "@/lib/energy-lab/cms";
import { analyse } from "@/lib/energy-lab/explain";
import { forecast24h } from "@/lib/energy-lab/forecast";
import { PRESET_MAP } from "@/lib/energy-lab/presets";
import { NO_STRESS, RESILIENCE_PRESETS, runResilience, type ResilienceInput } from "@/lib/energy-lab/resilience";
import type { ScenarioConfig } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import { Comparison } from "./Comparison";
import { Console, type Level, type View } from "./Console";
import { Copilot, type ChatMessage } from "./Copilot";
import type { NodeKey } from "./FlowDiagram";
import { ForecastPanel } from "./ForecastPanel";
import { Methods } from "./Methods";
import { Recommendations } from "./Recommendations";
import { ResiliencePanel } from "./ResiliencePanel";
import { ScenarioLab } from "./ScenarioLab";
import { LabSection, Segmented, SimTag } from "./ui";

const NAV = [
  { id: "lab-console", label: "System" },
  { id: "lab-whatif", label: "What if?" },
  { id: "lab-compare", label: "Before & after" },
  { id: "lab-recommend", label: "Recommendations" },
  { id: "lab-forecast", label: "Forecast" },
  { id: "lab-resilience", label: "Resilience" },
  { id: "lab-methods", label: "Methods" },
];

const configFor = (id: string, defaults: ScenarioConfig): ScenarioConfig => ({ ...defaults, ...(PRESET_MAP[id]?.config ?? {}) });

export function EnergyLab({ settings, aiConfigured, isFirst = false }: { settings: LabSettings; aiConfigured: boolean; isFirst?: boolean }) {
  const [level, setLevel] = useState<Level>(settings.defaultLevel);
  const [presetId, setPresetId] = useState<string | null>(settings.defaultPreset);
  const [cfg, setCfgState] = useState<ScenarioConfig>(() => configFor(settings.defaultPreset, settings.defaults));
  const [hour, setHour] = useState<number>(PRESET_MAP[settings.defaultPreset]?.focusHour ?? 12.5);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>("intelligent");
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const [stressInput, setStressInput] = useState<ResilienceInput>({ ...NO_STRESS, ...RESILIENCE_PRESETS[0].input });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const setCfg = (c: ScenarioConfig) => {
    setCfgState(c);
    setPresetId(null);
  };
  const applyPreset = (id: string) => {
    setCfgState(configFor(id, settings.defaults));
    setPresetId(id);
    setHour(PRESET_MAP[id]?.focusHour ?? 12.5);
    setPlaying(false);
  };

  // Heavy work runs on deferred values so sliders stay responsive.
  const dCfg = useDeferredValue(cfg);
  const dStress = useDeferredValue(stressInput);
  const analysis = useMemo(() => analyse(dCfg), [dCfg]);
  const forecast = useMemo(() => forecast24h(dCfg, analysis.intelligent, hour, analysis.optimisation.schedule), [dCfg, analysis, hour]);
  const resilience = useMemo(() => runResilience(dCfg, dStress), [dCfg, dStress]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setHour((h) => (h >= 23.75 ? 0 : h + 0.25)), 240);
    return () => window.clearInterval(id);
  }, [playing]);

  const closeCopilot = useCallback(() => setCopilotOpen(false), []);
  const H = isFirst ? "h1" : "h2";
  const copilot = !settings.copilotOff;

  return (
    <div className="overflow-x-clip bg-parchment">
      {/* Opening */}
      <header className="relative overflow-hidden border-b border-rule pb-16 pt-[clamp(7.5rem,14vw,11rem)]">
        <div className="contour pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="shell relative">
          <div className="flex flex-wrap items-center gap-3">
            <p className="kicker text-amber-ink">{settings.kicker}</p>
            <SimTag>Simulation · not live data</SimTag>
          </div>
          <H className="display mt-7 max-w-[16ch] text-[clamp(3.2rem,8vw,8rem)] text-charcoal">
            <Accent text={settings.headline} className="text-forest" />
          </H>
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <p className="max-w-[54ch] text-[1.15rem] leading-relaxed text-charcoal-2 min-w-0 lg:col-span-6">{settings.intro}</p>
            <ul className="grid gap-6 sm:grid-cols-3 min-w-0 lg:col-span-6">
              {settings.features.map((f, i) => (
                <li key={i} className="border-t border-rule-strong pt-3">
                  <p className="font-mono text-[11px] text-stone">0{i + 1}</p>
                  <p className="mt-1 text-[15px] font-semibold text-charcoal">{f.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-charcoal-2">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-10 max-w-[90ch] border-l-2 border-amber pl-4 text-[13px] leading-relaxed text-stone">{settings.disclaimer}</p>
        </div>
      </header>

      {/* Lab bar */}
      <div className="sticky top-0 z-40 border-b border-rule bg-parchment/92 backdrop-blur-lg">
        <div className="shell flex items-center gap-4 py-2.5">
          <nav aria-label="Energy Lab sections" className="relative rail -mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] text-charcoal-2 hover:bg-charcoal/[0.06] hover:text-charcoal">
                {n.label}
              </a>
            ))}
          </nav>
          <Segmented
            size="sm"
            label="Level of detail"
            value={level}
            onChange={setLevel}
            options={[
              { value: "explore", label: "Explore", title: "Simple and visual" },
              { value: "engineer", label: "Engineer", title: "Parameters, equations and full metrics" },
            ]}
          />
          {copilot && (
            <button type="button" onClick={() => setCopilotOpen(true)} className="hidden items-center gap-2 rounded-full bg-charcoal px-4 py-1.5 text-[12.5px] font-medium text-parchment hover:bg-forest sm:inline-flex">
              <MessageSquareText className="h-3.5 w-3.5" /> Ask the copilot
            </button>
          )}
        </div>
      </div>

      <LabSection
        id="lab-console"
        index="01"
        kicker="The system"
        title="One village. *Every kilowatt, accounted for.*"
        intro={level === "engineer" ? "Live state of the dispatch simulation at the selected time: 15-minute steps, energy-conserving, with every flow drawn to scale from the simulator's output." : "Press play to watch a day unfold. Line thickness shows how much power is flowing. Select any part of the system to see what it does."}
      >
        <Console analysis={analysis} cfg={dCfg} view={view} setView={setView} hour={hour} setHour={setHour} playing={playing} setPlaying={setPlaying} level={level} selected={selected} setSelected={setSelected} stale={dCfg !== cfg} />
      </LabSection>

      <LabSection id="lab-whatif" index="02" tone="paper" kicker="Scenario lab" title="What *if?*" intro="Start from a scenario, then change anything: the weather, the size of the panels and battery, how many homes connect, when the mill runs. The whole lab recalculates.">
        <ScenarioLab cfg={cfg} setCfg={setCfg} presets={settings.presets} presetId={presetId} onPreset={applyPreset} onReset={() => applyPreset(settings.defaultPreset)} level={level} />
      </LabSection>

      <LabSection id="lab-compare" index="03" kicker="Before & after" title="Same sun. Same battery. *Different decisions.*" intro="The uncontrolled system and intelligent management face the identical simulated day. Every figure below is calculated, and where management makes no difference, the table says so.">
        <div className={cn("transition-opacity", dCfg !== cfg && "opacity-70")}>
          <Comparison analysis={analysis} level={level} />
        </div>
      </LabSection>

      <LabSection id="lab-recommend" index="04" tone="paper" kicker="Explainable intelligence" title="What to do, *and why.*" intro="Each recommendation shows its reasoning, its simulated effect, what it costs someone, and the assumptions behind it. No confidence scores: just the data and its limits.">
        <Recommendations key={analysis.recommendations.map((r) => r.id).join()} items={analysis.recommendations} level={level} />
      </LabSection>

      <LabSection id="lab-forecast" index="05" kicker="Forecast" title="The next *24 hours.*" intro="Where the surplus and the shortages are likely to fall, and the best windows to run flexible loads. Move the clock above to forecast from a different moment.">
        <ForecastPanel f={forecast} level={level} />
      </LabSection>

      <LabSection id="lab-resilience" index="06" tone="paper" kicker="Resilience lab" title="Installing solar is not enough. *Design for the bad days.*" intro="Push the system: days of cloud, ageing equipment, a battery trip, a growing community. See what breaks, what is protected, how it recovers, and what it would take to ride it out.">
        <ResiliencePanel input={stressInput} setInput={setStressInput} result={resilience} cfg={dCfg} level={level} stale={dStress !== stressInput || dCfg !== cfg} />
      </LabSection>

      <LabSection id="lab-methods" index="07" kicker="Methods & assumptions" title="The engineering *behind the lab.*" intro={level === "engineer" ? "The model in full. Switch to Explore for the plain-language version." : "How the simulation works, in plain language. Switch to Engineer for the equations."}>
        <Methods level={level} education={settings.education} />
        <div className="mt-14 flex flex-wrap gap-4 border-t border-rule pt-8 text-[14px]">
          <Link href="/microgrid" className="link-underline text-charcoal">
            Explore the 3D microgrid model →
          </Link>
          <Link href="/technology" className="link-underline text-charcoal">
            VoltageAfrica&apos;s technology →
          </Link>
          <Link href="/partner" className="link-underline text-charcoal">
            Partner with us →
          </Link>
        </div>
      </LabSection>

      {copilot && (
        <>
          <button type="button" onClick={() => setCopilotOpen(true)} className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-[13px] font-medium text-parchment shadow-[0_20px_40px_-20px_rgb(36_36_31/0.6)] hover:bg-forest sm:hidden" aria-label="Ask the energy copilot">
            <MessageSquareText className="h-4 w-4" /> Ask
          </button>
          <Copilot open={copilotOpen} onClose={closeCopilot} cfg={cfg} hour={hour} level={level} aiConfigured={aiConfigured} intro={settings.copilotIntro} suggestions={settings.suggestions} messages={messages} setMessages={setMessages} />
        </>
      )}
    </div>
  );
}
