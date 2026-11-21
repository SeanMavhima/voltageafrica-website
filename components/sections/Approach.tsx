"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { image, text, type C } from "@/lib/cms/content";
import type { TechItem } from "@/lib/cms/types";
import { useInView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";

/** Bespoke line drawings for each station (64×64). */
function Glyph({ k, active }: { k: string; active: boolean }) {
  const s = active ? "#e8a344" : "#f3efe5";
  const common = { fill: "none", stroke: s, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (k) {
    case "sun":
      return (
        <g {...common}>
          <circle cx="32" cy="32" r="11" fill={active ? "#e8a344" : "none"} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r2 = (v: number) => Math.round(v * 100) / 100;
            return <line key={i} x1={r2(32 + Math.cos(a) * 17)} y1={r2(32 + Math.sin(a) * 17)} x2={r2(32 + Math.cos(a) * 24)} y2={r2(32 + Math.sin(a) * 24)} />;
          })}
        </g>
      );
    case "generation":
      return (
        <g {...common}>
          <path d="M12 40 L22 18 H54 L44 40 Z" />
          <path d="M28.7 18 L18.7 40 M35.3 18 L25.3 40 M42 18 L32 40 M48.7 18 L38.7 40 M17 29 H49" />
          <path d="M33 40 V52 M24 52 H42" />
        </g>
      );
    case "storage":
      return (
        <g {...common}>
          <rect x="10" y="22" width="44" height="24" />
          <path d="M16 22 V46 M22 22 V46 M28 22 V46 M34 22 V46 M40 22 V46 M46 22 V46" strokeOpacity="0.45" />
          <rect x="14" y="16" width="20" height="3" fill={active ? "#e8a344" : "none"} />
          <path d="M8 50 H56" />
        </g>
      );
    case "intelligence":
      return (
        <g {...common}>
          <rect x="18" y="18" width="28" height="28" />
          <path d="M24 38 L29 30 L34 34 L40 25" />
          <path d="M24 18 V12 M32 18 V12 M40 18 V12 M24 46 V52 M32 46 V52 M40 46 V52 M18 26 H12 M18 38 H12 M46 26 H52 M46 38 H52" />
        </g>
      );
    case "distribution":
      return (
        <g {...common}>
          <path d="M20 54 V14 M12 18 H28 M44 54 V22 M37 25 H51" />
          <path d="M12 18 Q 28 30 37 25 M28 18 Q 40 32 51 25" />
        </g>
      );
    default:
      return <circle cx="32" cy="32" r="14" fill="none" stroke={s} strokeWidth={1.6} />;
    case "community":
      return (
        <g {...common}>
          <path d="M8 52 H56" />
          <path d="M12 52 V32 L24 22 L36 32 V52" />
          <rect x="20" y="40" width="7" height="12" />
          <path d="M38 52 V36 H54 V52 M38 36 L46 30 L54 36" />
          <rect x="43" y="41" width="6" height="5" fill={active ? "#e8a344" : "none"} />
        </g>
      );
  }
}

export function Approach({ content, steps, isFirst = false }: { content: C; steps: TechItem[]; isFirst?: boolean }) {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "-20% 0px");
  const reduce = useReducedMotion();
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  const approach = steps.map((s) => ({ key: s.key, title: s.title, kicker: s.kicker ?? "", body: s.body }));
  const figure = image(content, "figureImage");
  const H = isFirst ? "h1" : "h2";

  useEffect(() => {
    if (!inView || touched || reduce) return;
    if (!approach.length) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % approach.length), 3800);
    return () => window.clearInterval(t);
  }, [inView, touched, reduce, approach.length]);

  if (!approach.length) return null;
  const step = approach[active % approach.length];
  const choose = (i: number) => {
    setTouched(true);
    setActive(i);
  };
  const n = approach.length;

  return (
    <section aria-labelledby="approach-title" className="on-forest contour-light relative overflow-hidden bg-forest py-[clamp(6rem,12vw,10rem)] text-parchment">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="kicker text-sage">{c.kicker}</p>
            <H id="approach-title" className="display mt-6 text-[clamp(2.7rem,6.2vw,6.4rem)]">
              <Accent text={c.headline} className="text-amber" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:self-end">
            <p className="max-w-[44ch] text-lg leading-relaxed text-sage">{c.intro}</p>
          </Reveal>
        </div>

        {/* Schematic */}
        <div ref={ref} className="mt-[clamp(4rem,8vw,7rem)]">
          <div className="relative" role="tablist" aria-label="Energy chain">
            {/* line */}
            <div className="absolute left-[8%] right-[8%] top-[2.75rem] hidden h-px bg-parchment/25 md:block" aria-hidden />
            <motion.div
              className="absolute left-[8%] top-[2.75rem] hidden h-[2px] bg-amber md:block"
              animate={{ width: `${(active / (n - 1)) * 84}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
            <ol className="grid grid-cols-3 gap-y-10 md:grid-cols-6">
              {approach.map((s, i) => {
                const cur = i === active;
                const on = i <= active;
                return (
                  <li key={s.key} className="flex justify-center">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cur}
                      aria-controls="approach-panel"
                      id={`approach-tab-${s.key}`}
                      onClick={() => choose(i)}
                      onMouseEnter={() => choose(i)}
                      onFocus={() => choose(i)}
                      className="group flex flex-col items-center gap-4 text-center"
                    >
                      <span
                        className={cn(
                          "relative z-10 flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border transition-all duration-500",
                          cur ? "scale-105 border-amber bg-forest-2" : on ? "border-amber/50 bg-forest" : "border-parchment/25 bg-forest group-hover:border-parchment/60",
                        )}
                      >
                        <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden>
                          <Glyph k={s.key} active={cur} />
                        </svg>
                      </span>
                      <span className="mono text-sage">{String(i + 1).padStart(2, "0")}</span>
                      <span className={cn("serif text-xl transition-colors", cur ? "text-parchment" : "text-parchment/70")}>{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-16 grid gap-12 border-t border-forest-rule pt-12 lg:grid-cols-12">
            <div id="approach-panel" role="tabpanel" aria-labelledby={`approach-tab-${step.key}`} aria-live="polite" className="min-h-[12rem] lg:col-span-7">
              <AnimatePresence mode="wait">
                <motion.div key={step.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <p className="kicker text-amber">{step.kicker}</p>
                  <p className="display mt-5 max-w-[26ch] text-[clamp(1.9rem,3.3vw,3.1rem)] leading-[1.08]">{step.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            {figure && (
            <Reveal className="lg:col-span-4 lg:col-start-9">
              <figure className="bg-parchment p-3 text-charcoal shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)] lg:rotate-[1.2deg]">
                <div className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
                  <Image src={figure.src} alt={figure.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
                </div>
                {(text(content, "figureCaption") || text(content, "figureYear")) && (
                  <figcaption className="flex items-start justify-between gap-4 px-1 pb-1 pt-3 text-[13px] leading-snug text-stone">
                    <span>
                      <span className="font-semibold text-charcoal">Fig. 1</span> {text(content, "figureCaption")}
                    </span>
                    <span className="mono shrink-0">{text(content, "figureYear")}</span>
                  </figcaption>
                )}
              </figure>
            </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
