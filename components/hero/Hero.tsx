"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { ArrowRight, Moon, Pause, Play, Sun, SunMoon, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { bool, image, link, num, text, type C } from "@/lib/cms/content";
import type { Media } from "@/lib/cms/types";
import { gridComponents as defaultComponents, type ComponentId, type GridComponent } from "@/lib/data/microgrid";
import { useGpuTier, useInView, useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { CHAPTER_ORDER, type ChapterId } from "./chapters";

const HeroWorld = dynamic(() => import("./HeroWorld"), { ssr: false });

export type HeroScene = Media & { title: string; sceneCaption: string; position: string; motion: string };
type Mode = "film" | "3d";
const STORE = "va-hero-mode";
const EASE = [0.16, 1, 0.3, 1] as const;

/* ═════════════════════════ Headline: word-by-word entrance ═════════════════════════ */

function RevealHeadline({ text: t, as: H, reduce, delay = 0.25 }: { text: string; as: "h1" | "h2"; reduce: boolean; delay?: number }) {
  const parts = t.split("*");
  let n = 0;
  return (
    <H id="hero-title" className="display mt-6 max-w-[14ch] text-[clamp(2.75rem,8.4vw,9.2rem)] text-parchment [text-shadow:0_2px_40px_rgb(20_18_14/0.35)]">
      {parts.map((p, pi) => {
        const words = p.split(/(\s+)/);
        const W = pi % 2 === 1 ? "em" : Fragment;
        return (
          <W key={pi} {...(pi % 2 === 1 ? { className: "text-amber" } : {})}>
            {words.map((w, wi) => {
              if (!w.trim()) return w;
              const i = n++;
              return (
                <span key={wi} className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
                  <motion.span
                    className="inline-block"
                    initial={reduce ? false : { y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 1.15, delay: delay + i * 0.07, ease: EASE }}
                  >
                    {w}
                  </motion.span>
                </span>
              );
            })}
          </W>
        );
      })}
    </H>
  );
}

/* ═════════════════════════ Film mode ═════════════════════════ */

const DRIFT: Record<string, { s: [number, number]; x: [number, number]; y: [number, number] }> = {
  in: { s: [1.04, 1.12], x: [0, 0], y: [0, -1] },
  out: { s: [1.13, 1.04], x: [0, 0], y: [-1, 0] },
  left: { s: [1.1, 1.1], x: [2.2, -2.2], y: [0, 0] },
  right: { s: [1.1, 1.1], x: [-2.2, 2.2], y: [0, 0] },
  rise: { s: [1.08, 1.11], x: [0, 0], y: [2, -1.5] },
};

function Film({ scenes, index, prev, duration, paused, reduce }: { scenes: HeroScene[]; index: number; prev: number | null; duration: number; paused: boolean; reduce: boolean }) {
  // Load scenes progressively: the first one with priority, then only the next one while the current plays,
  // instead of downloading every full-screen photograph up front. Scenes stay mounted once loaded.
  const [reach, setReach] = useState(0);
  if (index > reach) setReach(index);
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {scenes.map((s, i) => {
        const live = i === index || i === prev;
        const d = DRIFT[s.motion] ?? DRIFT[["in", "left", "out", "right", "rise"][i % 5]];
        return (
          <div key={`${s.src}-${i}`} className="absolute inset-0 transition-opacity ease-[cubic-bezier(0.45,0,0.2,1)]" style={{ opacity: i === index ? 1 : 0, transitionDuration: reduce ? "1200ms" : "2600ms", zIndex: i === index ? 2 : i === prev ? 1 : 0 }}>
            <div
              className="absolute inset-0 will-change-transform"
              style={
                live && !reduce
                  ? ({
                      animation: `hero-drift ${duration + 3}s linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                      "--s0": d.s[0],
                      "--s1": d.s[1],
                      "--x0": `${d.x[0]}%`,
                      "--x1": `${d.x[1]}%`,
                      "--y0": `${d.y[0]}%`,
                      "--y1": `${d.y[1]}%`,
                    } as React.CSSProperties)
                  : { transform: reduce ? "scale(1.02)" : `scale(${d.s[0]})` }
              }
            >
              {(i <= reach + 1 || i === index || i === prev) && <Image
                src={s.src}
                alt=""
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : "eager"}
                quality={90}
                sizes="100vw"
                className="object-cover [filter:saturate(0.9)_contrast(1.05)_brightness(0.96)]"
                style={{ objectPosition: s.position || "50% 50%" }}
              />}
            </div>
          </div>
        );
      })}
      {/* Shared grade so every scene reads as one film */}
      {/* Warm darkening grade; a plain tint (≈ the former 12% multiply) so the moving film is not re-blended every frame. */}
      <div className="absolute inset-0 z-[3] bg-[#120a02]/[0.11]" />
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgb(20_18_14/0.45)_100%)]" />
    </div>
  );
}

/* ═════════════════════════ Experience toggle ═════════════════════════ */

function ExperienceToggle({ mode, onChange, can3d, loading3d }: { mode: Mode; onChange: (m: Mode) => void; can3d: boolean; loading3d: boolean }) {
  const opts: { id: Mode; label: string; sub: string }[] = [
    { id: "film", label: "Film", sub: "Photographic" },
    { id: "3d", label: "3D", sub: "Living world" },
  ];
  return (
    <div className="flex items-center gap-3">
      <span className="kicker hidden text-[0.625rem] text-parchment/70 lg:inline">3D experience</span>
      <div role="radiogroup" aria-label="Hero experience" className="relative flex rounded-full border border-parchment/30 bg-charcoal/35 p-1 backdrop-blur-md">
        {opts.map((o) => {
          const on = mode === o.id;
          const disabled = o.id === "3d" && !can3d;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              title={disabled ? "3D is not available on this device" : `${o.sub} experience`}
              onClick={() => onChange(o.id)}
              className={cn("relative z-10 flex h-9 min-w-[4.5rem] items-center justify-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40", on ? "text-charcoal" : "text-parchment/85 hover:text-parchment")}
            >
              {on && <motion.span layoutId="hero-toggle-thumb" className="absolute inset-0 -z-10 rounded-full bg-parchment" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
              {o.id === "3d" ? (
                <span className="flex items-center gap-1.5">
                  {o.label}
                  <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full transition-colors", on ? (loading3d ? "animate-pulse bg-amber" : "bg-forest") : "bg-parchment/40")} />
                </span>
              ) : (
                o.label
              )}
              <span className="sr-only">: {o.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════ 3D chapter copy ═════════════════════════ */

const CHAPTER_SOURCE: Record<ChapterId, { step: string; ids: ComponentId[] }> = {
  solar: { step: "Generation", ids: ["solar"] },
  battery: { step: "Storage", ids: ["battery"] },
  intelligence: { step: "Intelligence", ids: ["meters", "inverter"] },
  distribution: { step: "Distribution", ids: ["distribution"] },
  community: { step: "Homes & productive use", ids: ["household", "productive"] },
};

/* ═════════════════════════ Hero ═════════════════════════ */

export function Hero({ content, scenes: cmsScenes, components, isFirst = true }: { content: C; scenes: HeroScene[]; components?: GridComponent[]; isFirst?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  // Hydration-safe: renders the server value first, then updates. (motion's hook reads the
  // preference synchronously while hydrating, which leaves server-rendered styles stale.)
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const tier = useGpuTier();
  const coarse = useMediaQuery("(pointer: coarse)");
  const inView = useInView(ref, "0px");
  const comps = components?.length ? components : defaultComponents;

  const poster = image(content, "image") as Media | null;
  const scenes = useMemo<HeroScene[]>(
    () => (cmsScenes.length ? cmsScenes : poster ? [{ ...poster, title: "", sceneCaption: "", position: "50% 45%", motion: "in" }] : []),
    [cmsScenes, poster],
  );
  const duration = Math.min(20, Math.max(5, num(content, "sceneDuration", 8)));
  const overlay = Math.min(100, Math.max(0, num(content, "overlay", 55))) / 100;
  const enable3d = bool(content, "enable3d", true);
  const primary = link(content, "primaryCta");
  const secondary = link(content, "secondaryCta");
  const H = isFirst ? "h1" : "h2";
  const stillParam = process.env.NEXT_PUBLIC_ENABLE_RENDER_STILLS === "1";

  /* Mode */
  const can3d = enable3d && tier !== null && tier !== "none";
  const [mode, setMode] = useState<Mode>("film");
  const [ready3d, setReady3d] = useState(false);
  const [failed3d, setFailed3d] = useState(false);
  useEffect(() => {
    if (tier === null) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(STORE);
    } catch {}
    const preferred = (saved as Mode | null) ?? (text(content, "defaultMode") === "3d" && tier === "high" && !reduce ? "3d" : "film");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(preferred === "3d" && can3d ? "3d" : "film");
  }, [tier, can3d, content, reduce]);
  const choose = (m: Mode) => {
    setMode(m);
    try {
      sessionStorage.setItem(STORE, m);
    } catch {}
  };
  const show3d = mode === "3d" && can3d && !failed3d;
  const world3dVisible = show3d && ready3d;

  /* Film timeline */
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const go = useCallback(
    (i: number) => {
      setIndex((cur) => {
        if (i === cur) return cur;
        setPrev(cur);
        return i;
      });
    },
    [],
  );
  const filmRunning = mode === "film" && !paused && inView && scenes.length > 1;
  useEffect(() => {
    if (!filmRunning) return;
    const t = setTimeout(() => go((index + 1) % scenes.length), duration * 1000);
    return () => clearTimeout(t);
  }, [filmRunning, index, scenes.length, duration, go]);
  const scene = scenes[index];

  /* 3D world state */
  const hourRef = useRef(17.4);
  const scrollRef = useRef(0);
  const [light, setLight] = useState<"auto" | "day" | "night">("auto");
  const [chapter, setChapter] = useState<ChapterId | null>(null);
  const pinEls = useRef<Partial<Record<ChapterId, HTMLElement | null>>>({});
  const [still, setStill] = useState<{ cam: [number, number, number]; target: [number, number, number] } | null>(null);
  useEffect(() => {
    if (!stillParam) return;
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("still");
    if (!raw) return;
    const [cx, cy, cz, tx, ty, tz, hr] = raw.split(",").map(Number);
    hourRef.current = hr;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill({ cam: [cx, cy, cz], target: [tx, ty, tz] });
    setMode("3d");
  }, [stillParam]);

  useEffect(() => {
    if (!show3d || !inView || still) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const want = light === "day" ? 16.2 : light === "night" ? 19.3 : 17.55 + 1.2 * Math.sin((t / 90) * Math.PI * 2 - Math.PI / 2);
      hourRef.current += (want - hourRef.current) * (light === "auto" ? 1 : reduce ? 1 : 0.025);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show3d, inView, light, reduce, still]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setChapter(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  /* Scroll: text lifts and fades as the hero leaves */
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollRef.current = v;
  });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-18%"]);
  const textO = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  /* First-visit intro veil */
  const [veil, setVeil] = useState(false);
  useEffect(() => {
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem("va-intro")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVeil(true);
        sessionStorage.setItem("va-intro", "1");
      }
    } catch {}
  }, [reduce]);

  const chapterCopy = chapter
    ? (() => {
        const src = CHAPTER_SOURCE[chapter];
        const items = src.ids.map((id) => comps.find((c) => c.id === id)).filter(Boolean) as GridComponent[];
        return { step: src.step, items };
      })()
    : null;

  if (still) {
    return (
      <section ref={ref} className="on-dark fixed inset-0 z-[200] bg-charcoal">
        <HeroWorld hourRef={hourRef} focus={null} pinEls={pinEls} quality="high" interactive={false} reducedMotion={false} scrollRef={scrollRef} still={still} active onReady={() => document.body.setAttribute("data-still-ready", "1")} />
      </section>
    );
  }

  return (
    <section ref={ref} aria-labelledby="hero-title" className="on-dark relative isolate flex min-h-[max(100svh,680px)] flex-col overflow-hidden bg-charcoal text-parchment">
      {/* ── Visual layers ── */}
      <div className="absolute inset-0 -z-10">
        <div className={cn("absolute inset-0 transition-opacity duration-[1600ms] ease-[cubic-bezier(0.45,0,0.2,1)]", world3dVisible ? "opacity-0" : "opacity-100")}>
          <Film scenes={scenes} index={index} prev={prev} duration={duration} paused={paused || mode !== "film" || !inView} reduce={reduce} />
        </div>
        {show3d && (
          <div className={cn("absolute inset-0 transition-[opacity,filter] duration-[1800ms] ease-[cubic-bezier(0.45,0,0.2,1)]", world3dVisible ? "opacity-100 [filter:none]" : "opacity-0 [filter:blur(8px)]")}>
            <ErrorBoundary fallback={null} onError={() => setFailed3d(true)}>
              <HeroWorld
                hourRef={hourRef}
                focus={chapter}
                pinEls={pinEls}
                quality={tier === "high" ? "high" : "low"}
                interactive={!coarse}
                reducedMotion={reduce}
                scrollRef={scrollRef}
                active={inView}
                onReady={() => setReady3d(true)}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
      {/* Legibility: top for the menu, bottom for the text */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-[45%] bg-gradient-to-b from-[#14120e]/70 to-transparent" style={{ opacity: 0.6 + overlay * 0.4 }} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-[70%] bg-gradient-to-t from-[#14120e] via-[#14120e]/55 to-transparent" style={{ opacity: Math.min(1, 0.45 + overlay * 0.7) }} aria-hidden />

      {/* 3D loading line */}
      <AnimatePresence>
        {show3d && !ready3d && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-[44%] z-10 flex -translate-x-1/2 flex-col items-center gap-3" role="status">
            <span className="relative h-px w-44 overflow-hidden bg-parchment/25">
              <span className="absolute inset-y-0 left-0 w-1/3 bg-amber [animation:scroll-cue_1.6s_var(--ease-quart)_infinite]" />
            </span>
            <span className="kicker text-[0.625rem] text-parchment/80">Composing the landscape</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D chapter pins */}
      {world3dVisible && !coarse && (
        <div className="pointer-events-none absolute inset-0 z-[5] hidden md:block" aria-hidden>
          {CHAPTER_ORDER.map((id, i) => (
            <button
              key={id}
              ref={(el) => {
                pinEls.current[id] = el;
              }}
              type="button"
              tabIndex={-1}
              onClick={() => setChapter(chapter === id ? null : id)}
              style={{ opacity: 0 }}
              className="group pointer-events-auto absolute left-0 top-0 flex flex-col items-center transition-opacity duration-500 will-change-transform"
            >
              <span className={cn("flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_8px_24px_-10px_rgb(0_0_0/0.6)] backdrop-blur transition-colors", chapter === id ? "bg-amber text-charcoal" : "bg-parchment/90 text-charcoal group-hover:bg-parchment")}>
                <span className="font-mono text-[10px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                {CHAPTER_SOURCE[id].step}
              </span>
              <span className="h-6 w-px bg-parchment/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber ring-4 ring-amber/30" />
            </button>
          ))}
        </div>
      )}

      {/* ── Copy ── */}
      <motion.div style={{ y: textY, opacity: textO }} className={cn("shell relative z-[6] flex flex-1 flex-col pt-[clamp(6.5rem,15vh,10rem)] transition-opacity duration-700", show3d && chapter && "md:[&>*:not(:last-child)]:opacity-25")}>
        {text(content, "kicker") && (
          <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }} className="kicker flex items-center gap-3 text-parchment">
            <span className="h-2 w-2 rounded-full bg-amber ring-4 ring-amber/30" aria-hidden />
            {text(content, "kicker")}
          </motion.p>
        )}
        <RevealHeadline text={text(content, "headline", "VoltageAfrica")} as={H} reduce={reduce} delay={veil ? 0.9 : 0.25} />

        <div className="mt-auto grid gap-8 pb-6 pt-10 md:grid-cols-12 md:items-end">
          <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: veil ? 1.4 : 0.8, ease: EASE }} className="md:col-span-6">
            {text(content, "body") && <p className="max-w-[50ch] text-base leading-relaxed text-parchment/95 sm:text-[1.0625rem] md:text-lg">{text(content, "body")}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              {primary && (
                <ButtonLink href={primary.href} variant="amber">
                  {primary.label}
                </ButtonLink>
              )}
              {secondary && (
                <ButtonLink href={secondary.href} variant="line-light">
                  {secondary.label}
                </ButtonLink>
              )}
            </div>
          </motion.div>

          {/* 3D: the energy chain doubles as accessible chapter navigation */}
          <div className="md:col-span-6 md:justify-self-end">
            <AnimatePresence mode="wait">
              {show3d && (
                <motion.nav key="chain" aria-label="Explore the energy system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.6, ease: EASE }}>
                  <p className="kicker mb-3 text-[0.625rem] text-parchment/70">Follow the energy</p>
                  <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[0.8125rem]">
                    <li className="flex items-center gap-1.5 text-parchment/70">
                      <Sun className="h-3.5 w-3.5 text-amber" aria-hidden /> Sun
                    </li>
                    {CHAPTER_ORDER.map((id) => (
                      <li key={id} className="flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3 text-parchment/40" aria-hidden />
                        <button type="button" onClick={() => setChapter(chapter === id ? null : id)} aria-pressed={chapter === id} className={cn("rounded-full border px-2.5 py-1 transition-colors", chapter === id ? "border-amber bg-amber text-charcoal" : "border-parchment/25 text-parchment hover:border-parchment/70")}>
                          {CHAPTER_SOURCE[id].step}
                        </button>
                      </li>
                    ))}
                  </ol>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 3D chapter panel */}
      <AnimatePresence>
        {show3d && chapterCopy && (
          <motion.aside
            key={chapter}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: EASE }}
            aria-live="polite"
            className="absolute right-4 top-24 z-[8] max-h-[calc(100%-14rem)] w-[min(92vw,24rem)] overflow-y-auto bg-parchment p-6 text-charcoal shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] md:right-8 md:top-28"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="kicker text-amber-ink">
                {String(CHAPTER_ORDER.indexOf(chapter!) + 1).padStart(2, "0")} · {chapterCopy.step}
              </p>
              <button type="button" onClick={() => setChapter(null)} aria-label="Close" className="-mr-2 -mt-2 p-2 text-stone hover:text-charcoal">
                <X className="h-4 w-4" />
              </button>
            </div>
            {chapterCopy.items.map((c, i) => (
              <div key={c.id} className={i ? "mt-5 border-t border-rule pt-5" : "mt-3"}>
                <h3 className="display text-[1.9rem] leading-none">{c.name}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-charcoal-2">{c.summary}</p>
              </div>
            ))}
            <p className="tag-sim mt-5 text-amber-ink">Illustrative model · not an operating installation</p>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Bottom bar: chapter progress · caption · controls ── */}
      <div className="shell relative z-[7] pb-5">
        <div className="flex flex-col-reverse gap-4 border-t border-parchment/20 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            {mode === "film" || !show3d ? (
              <>
                {scenes.length > 1 && (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play the film" : "Pause the film"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-parchment/30 text-parchment hover:border-parchment">
                      {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    </button>
                    <ol className="flex flex-1 gap-2" aria-label="Scenes">
                      {scenes.map((s, i) => (
                        <li key={i} className="min-w-0 flex-1">
                          <button type="button" onClick={() => go(i)} aria-current={i === index ? "true" : undefined} aria-label={`Scene ${i + 1}${s.title ? `: ${s.title}` : ""}`} className="group block w-full text-left">
                            <span className="relative block h-[2px] overflow-hidden bg-parchment/25">
                              <span
                                key={i === index ? `on-${index}` : "off"}
                                className="absolute inset-y-0 left-0 bg-amber"
                                style={
                                  i === index
                                    ? { animation: `hero-progress ${duration}s linear forwards`, animationPlayState: paused || !inView ? "paused" : "running" }
                                    : { width: i < index ? "100%" : "0%", opacity: i < index ? 0.55 : 1 }
                                }
                              />
                            </span>
                            {s.title && (
                              <span className={cn("mt-2 hidden truncate text-[11px] font-medium uppercase tracking-[0.12em] transition-colors sm:block", i === index ? "text-parchment" : "text-parchment/50 group-hover:text-parchment/80")}>
                                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> {s.title}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <p className="mt-3 min-h-[2.5em] text-[12px] leading-snug text-parchment/70" aria-live="off">
                  {scene?.sceneCaption || scene?.caption}
                  {scene?.credit && (
                    <>
                      {" "}
                      Photo:{" "}
                      <a href={scene.credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-parchment/40 underline-offset-2 hover:decoration-parchment">
                        {scene.credit.author}
                      </a>
                      ,{" "}
                      <a href={scene.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-parchment/40 underline-offset-2 hover:decoration-parchment">
                        {scene.credit.license}
                      </a>
                      .
                    </>
                  )}
                </p>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="tag-sim text-amber-soft">Illustrative world · simulated energy flow</span>
                <div role="radiogroup" aria-label="Light" className="flex items-center gap-1 rounded-full border border-parchment/25 p-0.5">
                  {(
                    [
                      ["auto", "Golden hour to dusk", SunMoon],
                      ["day", "Afternoon", Sun],
                      ["night", "Evening", Moon],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button key={id} type="button" role="radio" aria-checked={light === id} aria-label={label} title={label} onClick={() => setLight(id)} className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-colors", light === id ? "bg-parchment text-charcoal" : "text-parchment/80 hover:text-parchment")}>
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                {!coarse && <span className="hidden text-[12px] text-parchment/60 xl:inline">Drag to look around. Select a stage to learn what it does.</span>}
              </div>
            )}
          </div>
          {enable3d && <ExperienceToggle mode={mode} onChange={choose} can3d={can3d} loading3d={show3d && !ready3d} />}
        </div>
      </div>

      {/* First-visit veil */}
      {veil && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-parchment"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={() => setVeil(false)}
        >
          <motion.span className="block h-px w-40 origin-left bg-amber" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.55, ease: EASE }} />
        </motion.div>
      )}
    </section>
  );
}
