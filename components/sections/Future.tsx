"use client";

import { ActKicker } from "@/components/home/ActLabel";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { list, text, type C } from "@/lib/cms/content";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";

/* Network geometry (viewBox 600×600) */
const HUBS = [
  { x: 300, y: 300 },
  { x: 140, y: 170 },
  { x: 470, y: 150 },
  { x: 500, y: 420 },
  { x: 150, y: 450 },
  { x: 320, y: 90 },
];
const sats = (cx: number, cy: number, n: number, r: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + seed;
    return { x: Math.round((cx + Math.cos(a) * r) * 100) / 100, y: Math.round((cy + Math.sin(a) * r) * 100) / 100 };
  });

function NetworkVisual({ stage }: { stage: number }) {
  const t = (n: number) => ({ opacity: stage >= n ? 1 : 0 });
  const tr = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };
  const main = HUBS[0];
  return (
    <svg viewBox="0 0 600 600" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="fv-glow">
          <stop offset="0" stopColor="#e8a344" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e8a344" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* concentric guides */}
      {[80, 160, 240].map((r) => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="rgb(242 235 220 / 0.06)" />
      ))}

      {/* Stage 4: VPP orchestration ring + grid link */}
      <motion.g initial={false} animate={t(4)} transition={tr}>
        <circle cx="300" cy="300" r="270" fill="none" stroke="#e8a344" strokeOpacity="0.5" strokeDasharray="2 8" className="flow-dash" />
        {HUBS.slice(1).map((h, i) => (
          <line key={i} x1="300" y1="300" x2={h.x} y2={h.y} stroke="#e8a344" strokeOpacity="0.35" strokeDasharray="1 6" />
        ))}
        <rect x="270" y="560" width="60" height="16" fill="none" stroke="#f2ebdc" strokeOpacity="0.5" />
        <text x="300" y="594" textAnchor="middle" className="fill-[#b9c6b0] font-mono text-[10px]" letterSpacing="2">
          WIDER GRID
        </text>
        <line x1="300" y1="570" x2="300" y2="330" stroke="#e8a344" strokeOpacity="0.6" className="flow-dash" />
      </motion.g>

      {/* Stage 3: interconnections between hubs */}
      <motion.g initial={false} animate={t(3)} transition={tr}>
        {[
          [0, 1],
          [0, 2],
          [0, 3],
          [0, 4],
          [1, 5],
          [2, 5],
          [3, 4],
          [2, 3],
        ].map(([a, b], i) => (
          <line key={i} x1={HUBS[a].x} y1={HUBS[a].y} x2={HUBS[b].x} y2={HUBS[b].y} stroke="#8fe3a6" strokeOpacity="0.55" className="flow-dash" />
        ))}
      </motion.g>

      {/* Other hubs appear at stage 3 */}
      {HUBS.slice(1).map((h, i) => (
        <motion.g key={i} initial={false} animate={t(3)} transition={{ ...tr, delay: stage >= 3 ? i * 0.08 : 0 }}>
          {sats(h.x, h.y, 5, 30, i).map((s, k) => (
            <g key={k}>
              <line x1={h.x} y1={h.y} x2={s.x} y2={s.y} stroke="rgb(242 235 220 / 0.25)" />
              <rect x={s.x - 3} y={s.y - 3} width="6" height="6" fill="#cdc4b2" />
            </g>
          ))}
          <circle cx={h.x} cy={h.y} r="9" fill="#344b3b" stroke="#e8a344" strokeWidth="1.5" />
        </motion.g>
      ))}

      {/* Stage 0: the first community microgrid */}
      <circle cx={main.x} cy={main.y} r="90" fill="url(#fv-glow)" />
      {sats(main.x, main.y, 9, 70, 0.3).map((s, k) => (
        <g key={k}>
          <line x1={main.x} y1={main.y} x2={s.x} y2={s.y} stroke="#8fe3a6" strokeOpacity="0.5" className="flow-dash" />
          <rect x={s.x - 4} y={s.y - 4} width="8" height="8" fill="#f2ebdc" />
        </g>
      ))}

      {/* Stage 1: intelligence ring */}
      <motion.g initial={false} animate={t(1)} transition={tr}>
        <circle cx={main.x} cy={main.y} r="40" fill="none" stroke="#f2ebdc" strokeOpacity="0.5" strokeDasharray="3 5" />
        {sats(main.x, main.y, 9, 70, 0.3).map((s, k) => (
          <circle key={k} cx={s.x + 8} cy={s.y - 8} r="2.5" fill="#8fe3a6" />
        ))}
      </motion.g>

      {/* Stage 2: connected assets (storage, pumps, mills) */}
      <motion.g initial={false} animate={t(2)} transition={tr}>
        {sats(main.x, main.y, 4, 118, 1.1).map((s, k) => (
          <g key={k}>
            <line x1={main.x} y1={main.y} x2={s.x} y2={s.y} stroke="#e8a344" strokeOpacity="0.45" strokeDasharray="1 4" />
            <rect x={s.x - 9} y={s.y - 6} width="18" height="12" fill="none" stroke="#e8a344" />
            <rect x={s.x - 6} y={s.y - 2} width={6 + k * 2} height="4" fill="#e8a344" />
          </g>
        ))}
      </motion.g>

      <circle cx={main.x} cy={main.y} r="16" fill="#e8a344" />
      <circle cx={main.x} cy={main.y} r="24" fill="none" stroke="#e8a344" strokeOpacity="0.5" />
    </svg>
  );
}

export function Future({ content, isFirst = false }: { content: C; isFirst?: boolean }) {
  const [stage, setStage] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  const futureStages = list(content, "stages").map((x) => ({ title: text(x, "title"), horizon: text(x, "horizon"), body: text(x, "body") }));
  const H = isFirst ? "h1" : "h2";

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-labelledby="future-title" className="on-forest contour-light relative bg-forest py-[clamp(6rem,12vw,10rem)] text-parchment">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <ActKicker text={c.kicker} dark fallbackClass="kicker text-amber-soft" />
            <H id="future-title" className="display mt-6 text-[clamp(2.9rem,6.6vw,7rem)]">
              <Accent text={c.headline} className="text-amber" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:self-end">
            <p className="text-lg leading-relaxed text-sage">{c.intro}</p>
          </Reveal>
        </div>

        <div className="mt-[clamp(3rem,7vw,6rem)] grid gap-10 lg:grid-cols-12">
          {/* Sticky visual */}
          <div className="sticky top-[4.5rem] z-10 -mx-4 h-[42svh] bg-forest/95 px-4 backdrop-blur-sm lg:order-2 lg:col-span-6 lg:col-start-7 lg:mx-0 lg:h-[calc(100svh-7rem)] lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <NetworkVisual stage={stage} />
              </div>
              <div className="flex items-center justify-between border-t border-forest-rule py-3">
                <span className="kicker text-sage">Stage {stage + 1} / {futureStages.length}</span>
                <span className="kicker text-amber-soft">{futureStages[stage]?.horizon}</span>
              </div>
            </div>
          </div>

          {/* Stage narrative */}
          <ol className="lg:order-1 lg:col-span-5">
            {futureStages.map((s, i) => (
              <li
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-stage={i}
                className="flex min-h-[48svh] flex-col justify-center border-l border-forest-rule py-10 pl-6 lg:min-h-[70svh] lg:pl-10"
              >
                <div className={cn("transition-opacity duration-700", stage === i ? "opacity-100" : "opacity-35")}>
                  <p className="mono text-sage">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="display mt-4 text-[clamp(2.3rem,4vw,3.8rem)] leading-[1.0] text-parchment">{s.title}</h3>
                  <p className="kicker mt-5 text-amber-soft">{s.horizon}</p>
                  <p className="mt-5 max-w-[40ch] text-[1.0625rem] leading-relaxed text-sage">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
