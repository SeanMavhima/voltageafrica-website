"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Expand, Minus, Moon, Pause, Play, Plus, RotateCcw, Sun, Tags, Waypoints, X } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useGpuTier, useInView, useMediaQuery } from "@/lib/hooks";
import { gridComponents as defaultComponents, type ComponentId, type GridComponent } from "@/lib/data/microgrid";
import { activeConnections, daylight, formatHour, MODEL, sampleAt, stateOf } from "@/lib/sim/energy";
import { cn } from "@/lib/utils";
import { metricsFor } from "./metrics";
import { MicrogridSchematic } from "./MicrogridSchematic";
import type { SceneCommands } from "./MicrogridScene";

const MicrogridScene = dynamic(() => import("./MicrogridScene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-stone">
        <span className="relative h-px w-40 overflow-hidden bg-rule-strong">
          <span className="absolute inset-y-0 left-0 w-1/3 bg-amber [animation:scroll-cue_1.6s_var(--ease-quart)_infinite]" />
        </span>
        <span className="kicker">Assembling the model</span>
      </div>
    </div>
  );
}

type Mode = "embedded" | "full";

function IconButton({ label, onClick, active, children, className }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200",
        active ? "border-charcoal bg-charcoal text-amber" : "border-rule-strong bg-paper text-charcoal hover:border-charcoal",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MicrogridExperience({ mode = "embedded", components }: { mode?: Mode; components?: GridComponent[] }) {
  const gridComponents = components?.length ? components : defaultComponents;
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, "200px");
  const nearView = useInView(wrap, "900px", true); // mount the 3D bundle shortly before it scrolls in
  const tier = useGpuTier();
  const reduce = useReducedMotion() ?? false;
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const coarse = useMediaQuery("(pointer: coarse)");

  const [selected, setSelected] = useState<ComponentId | null>(null);
  const [hour, setHour] = useState(10.5);
  const hourRef = useRef(10.5);
  const [playing, setPlaying] = useState(false);
  const [flowOn, setFlowOn] = useState(true);
  const [labels, setLabels] = useState(true);
  const [failed, setFailed] = useState(false);
  const [engaged, setEngaged] = useState(mode === "full");
  const commands = useRef<SceneCommands | null>(null);
  const labelEls = useRef<Partial<Record<ComponentId, HTMLElement | null>>>({});

  // Touch devices: in the embedded view, require a tap before the canvas captures gestures.
  const interactive = mode === "full" || !coarse || engaged;

  const setTime = useCallback((h: number) => {
    hourRef.current = h;
    setHour(h);
  }, []);

  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      hourRef.current = (hourRef.current + dt * 0.9) % 24;
      if (now - lastUi > 90) {
        lastUi = now;
        setHour(hourRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sim = useMemo(() => sampleAt(hour), [hour]);
  const d = daylight(hour);
  const night = d < 0.5;
  const comp = selected ? gridComponents.find((g) => g.id === selected) ?? null : null;
  const use3d = tier !== null && tier !== "none" && !failed;
  const showSchematic = tier === "none" || failed;

  // Gallery backdrop: warm paper by day, deep dusk blue by night.
  const bg = night
    ? "radial-gradient(90% 70% at 50% 45%, #2b3346 0%, #1c2230 55%, #141925 100%)"
    : "radial-gradient(90% 70% at 50% 45%, #ffffff 0%, #f6f2ea 45%, #e9e3d5 100%)";

  return (
    <div
      ref={wrap}
      className={cn("theme-light relative isolate w-full overflow-hidden text-charcoal", mode === "full" ? "h-[100svh] min-h-[620px]" : "h-[min(92svh,900px)] min-h-[640px]")}
      style={{ background: bg, transition: "background 1.2s ease" }}
    >
      {/* Scene */}
      <div className="absolute inset-0">
        {use3d && (nearView || mode === "full") && (
          <ErrorBoundary fallback={null} onError={() => setFailed(true)}>
            <MicrogridScene
              hourRef={hourRef}
              flowOn={flowOn}
              selected={selected}
              onSelect={setSelected}
              labelEls={labelEls}
              quality={tier === "high" ? "high" : "low"}
              commands={commands}
              active={inView}
              allowZoom={mode === "full"}
              interactive={interactive}
              reducedMotion={reduce}
            />
          </ErrorBoundary>
        )}
        {showSchematic && (
          <div className="absolute inset-x-4 bottom-44 top-24 lg:inset-x-[22rem] lg:bottom-32">
            <MicrogridSchematic selected={selected} onSelect={setSelected} hour={hour} flowOn={flowOn} components={gridComponents} />
          </div>
        )}
      </div>

      {/* Projected component labels (desktop) */}
      {use3d && labels && desktop && (
        <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden" aria-hidden>
          {gridComponents.map((c) => {
            const sel = selected === c.id;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  labelEls.current[c.id] = el;
                }}
                type="button"
                tabIndex={-1}
                onClick={() => setSelected(sel ? null : c.id)}
                style={{ visibility: "hidden" }}
                className={cn(
                  "group absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-[0_6px_18px_-8px_rgb(36_36_31/0.45)] transition-colors duration-300 will-change-transform",
                  interactive ? "pointer-events-auto" : "pointer-events-none",
                  sel ? "bg-amber text-charcoal" : "bg-paper text-charcoal hover:bg-charcoal hover:text-parchment",
                )}
              >
                <span className="font-mono">{c.index}</span>
                <span className={sel ? "inline" : "hidden group-hover:inline"}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Touch gate */}
      {!interactive && use3d && (
        <button type="button" onClick={() => setEngaged(true)} className="absolute inset-0 z-10 flex items-center justify-center" aria-label="Activate the 3D microgrid">
          <span className="rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-parchment shadow-xl">Tap to explore in 3D</span>
        </button>
      )}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="pointer-events-auto flex flex-col gap-2">
          {mode === "full" && (
            <Link href="/#microgrid" className={cn("kicker mb-2 inline-flex items-center gap-2", night ? "text-parchment/80 hover:text-parchment" : "text-stone hover:text-charcoal")}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> VoltageAfrica
            </Link>
          )}
          {mode === "full" && <p className={cn("display text-3xl", night ? "text-parchment" : "text-charcoal")}>Inside a VoltageAfrica microgrid</p>}
          <span className={cn("tag-sim w-fit", night ? "text-amber" : "text-amber-ink")}>Conceptual model · simulated values</span>
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">
          {use3d && (
            <>
              <IconButton label="Zoom out" onClick={() => commands.current?.zoom(1.25)}>
                <Minus className="h-4 w-4" />
              </IconButton>
              <IconButton label="Zoom in" onClick={() => commands.current?.zoom(0.8)}>
                <Plus className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Reset view"
                onClick={() => {
                  setSelected(null);
                  commands.current?.reset();
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </IconButton>
              {desktop && (
                <IconButton label="Toggle labels" active={labels} onClick={() => setLabels((v) => !v)}>
                  <Tags className="h-4 w-4" />
                </IconButton>
              )}
            </>
          )}
          <IconButton label="Toggle energy flow" active={flowOn} onClick={() => setFlowOn((v) => !v)}>
            <Waypoints className="h-4 w-4" />
          </IconButton>
          {mode === "embedded" && (
            <Link
              href="/microgrid"
              className="flex h-10 items-center gap-2 rounded-full border border-charcoal bg-charcoal px-4 text-sm font-medium text-parchment transition-colors hover:bg-forest"
            >
              <Expand className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Full screen</span>
              <span className="sr-only sm:hidden">Open full screen</span>
            </Link>
          )}
        </div>
      </div>

      {/* Exhibit index (desktop) */}
      <nav aria-label="Microgrid components" className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
        <ol className="w-60 rounded-2xl bg-paper/90 p-2 shadow-[0_24px_50px_-30px_rgb(36_36_31/0.5)] backdrop-blur">
          {gridComponents.map((c) => {
            const sel = selected === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(sel ? null : c.id)}
                  aria-pressed={sel}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-[0.5rem] text-left text-sm transition-colors duration-200",
                    sel ? "bg-charcoal text-parchment" : "text-charcoal-2 hover:bg-parchment",
                  )}
                >
                  <span className={cn("font-mono text-[10px]", sel ? "text-amber" : "text-stone")}>{c.index}</span>
                  <span className="font-medium">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Exhibit plaque */}
      <AnimatePresence mode="wait">
        {comp ? (
          <motion.aside
            key={comp.id}
            initial={{ opacity: 0, x: desktop ? 24 : 0, y: desktop ? 0 : 24 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: desktop ? 12 : 0, y: desktop ? 0 : 12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
            className={cn(
              "absolute z-30 overflow-y-auto rounded-2xl bg-paper shadow-[0_30px_70px_-30px_rgb(36_36_31/0.55)]",
              desktop ? "bottom-36 right-6 top-28 w-[23rem] p-7" : "inset-x-3 bottom-[9rem] max-h-[48%] p-5",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker text-amber-ink">
                  Exhibit {comp.index} · {comp.kicker}
                </p>
                <h3 className="display mt-3 text-[2.2rem] leading-none">{comp.name}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="-mr-2 -mt-1 rounded-full p-2 text-stone hover:bg-parchment hover:text-charcoal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-charcoal-2">{comp.summary}</p>
            <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-rule">
              {metricsFor(comp.metric, sim, hour).map((m) => (
                <div key={m.label} className="bg-parchment px-3 py-3">
                  <dt className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-stone">{m.label}</dt>
                  <dd className="mt-1.5 text-sm font-medium tabular-nums text-charcoal">{m.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mono mt-2 text-stone">Simulated at {formatHour(hour)}</p>
            <ul className="mt-5 space-y-3">
              {comp.points.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-charcoal-2">
                  <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </motion.aside>
        ) : (
          desktop && (
            <motion.aside
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-6 top-28 z-30 w-[23rem] rounded-2xl bg-paper/92 p-7 shadow-[0_30px_70px_-40px_rgb(36_36_31/0.5)] backdrop-blur"
            >
              <p className="kicker text-stone">How to explore</p>
              <p className="display mt-4 text-[1.9rem] leading-[1.05]">A complete energy system for one community.</p>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-2">
                Drag to orbit. Select any part of the model, or a number on the left, to see what it does. Scrub the day to watch the system respond.
              </p>
              <div className="mt-5 flex items-center gap-5 text-xs text-stone">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber" /> DC solar power
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2f9a63]" /> AC to the community
                </span>
              </div>
            </motion.aside>
          )
        )}
      </AnimatePresence>

      {/* Bottom console */}
      <div className="absolute inset-x-0 bottom-0 z-20 md:inset-x-6 md:bottom-6">
        <div className="bg-paper/95 shadow-[0_24px_60px_-30px_rgb(36_36_31/0.55)] backdrop-blur md:rounded-2xl">
          <div className="rail flex gap-1.5 overflow-x-auto border-b border-rule px-3 py-2 lg:hidden">
            {gridComponents.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                aria-pressed={selected === c.id}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium",
                  selected === c.id ? "border-charcoal bg-charcoal text-parchment" : "border-rule-strong text-charcoal-2",
                )}
              >
                <span className="font-mono text-[10px]">{c.index}</span>
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-5 md:py-4">
            <div className="flex items-center gap-2">
              <IconButton label={playing ? "Pause the day" : "Play the day"} active={playing} onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </IconButton>
              <IconButton label="Jump to midday" active={!night} onClick={() => setTime(12)}>
                <Sun className="h-4 w-4" />
              </IconButton>
              <IconButton label="Jump to night" active={night} onClick={() => setTime(21)}>
                <Moon className="h-4 w-4" />
              </IconButton>
              <div className="ml-2 w-[4.5rem]">
                <p className="font-mono text-lg tabular-nums leading-none">{formatHour(hour)}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone">Time of day</p>
              </div>
            </div>

            <label className="relative flex flex-1 items-center">
              <span className="sr-only">Time of day</span>
              <input
                type="range"
                min={0}
                max={23.75}
                step={0.25}
                value={hour}
                onChange={(e) => {
                  setPlaying(false);
                  setTime(Number(e.target.value));
                }}
                aria-valuetext={formatHour(hour)}
                className="h-10 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-charcoal [&::-moz-range-thumb]:bg-amber [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(90deg,#1c2230,#e8a344_30%,#f6dcb2_50%,#e8a344_70%,#1c2230)] [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,#1c2230,#e8a344_30%,#f6dcb2_50%,#e8a344_70%,#1c2230)] [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-[17px] [&::-webkit-slider-thumb]:w-[17px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-charcoal [&::-webkit-slider-thumb]:bg-amber"
              />
              <span className="pointer-events-none absolute inset-x-0 -bottom-1 hidden justify-between font-mono text-[9px] text-stone md:flex" aria-hidden>
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
              </span>
            </label>

            <dl className="grid grid-cols-4 gap-x-4 md:flex md:gap-6">
              {[
                { k: "Solar", v: `${sim.pvKw.toFixed(1)}`, u: "kW", c: "bg-series-gen" },
                { k: "Battery", v: `${Math.round(sim.soc * 100)}`, u: "%", c: "bg-series-battery" },
                { k: "Demand", v: `${sim.demandKw.toFixed(1)}`, u: "kW", c: "bg-series-demand" },
                { k: "Active", v: `${activeConnections(sim)}`, u: `/${MODEL.connections}`, c: "bg-stone" },
              ].map((m) => (
                <div key={m.k} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone">
                    <span className={cn("h-1.5 w-1.5 rounded-full", m.c)} aria-hidden />
                    {m.k}
                  </dt>
                  <dd className="mt-1 font-mono text-base tabular-nums text-charcoal">
                    {m.v}
                    <span className="ml-0.5 text-[11px] text-stone">{m.u}</span>
                  </dd>
                </div>
              ))}
              <div className="hidden min-w-[11rem] xl:block">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone">System status</dt>
                <dd className="mt-1 text-sm font-medium text-forest">{stateOf(sim)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
