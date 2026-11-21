"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { text, type C } from "@/lib/cms/content";
import type { Milestone } from "@/lib/cms/types";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";

const GUTTER = "max(clamp(1rem, 4.5vw, 4rem), calc((100vw - 1520px) / 2 + clamp(1rem, 4.5vw, 4rem)))";

export function Journey({ content, items, isFirst = false }: { content: C; items: Milestone[]; isFirst?: boolean }) {
  const asPage = isFirst;
  const H = isFirst ? "h1" : "h2";
  const milestones = items.filter((m) => !m.isUpcoming);
  const upcoming = items.find((m) => m.isUpcoming) ?? null;
  const yearOf = (m: Milestone) => m.dateLabel.match(/\d{4}/)?.[0] ?? "";
  const years = [...new Set(milestones.map(yearOf).filter(Boolean)), ...(upcoming ? ["Next"] : [])];
  const rail = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };

  const update = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft > max - 8);
  }, []);

  useEffect(() => {
    update();
    const el = rail.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector("li");
    if (!el) return;
    el.scrollBy({ left: dir * (card ? card.getBoundingClientRect().width + 40 : el.clientWidth * 0.8), behavior: "smooth" });
  };

  const jump = (y: string) => {
    const el = rail.current;
    const target = el?.querySelector<HTMLElement>(`[data-year="${y}"]`);
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const navBtn = "flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/25 text-charcoal transition-colors hover:border-charcoal hover:bg-charcoal hover:text-parchment disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-charcoal";

  return (
    <section aria-labelledby="journey-title" className={`relative overflow-hidden bg-parchment pb-[clamp(6rem,12vw,10rem)] ${asPage ? "pt-[clamp(8rem,18vh,12rem)]" : "pt-[clamp(6rem,12vw,10rem)]"}`}>
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="kicker text-amber-ink">{c.kicker}</p>
            <H id="journey-title" className="display mt-6 text-[clamp(3rem,7vw,7.2rem)] text-charcoal">
              <Accent text={c.headline} className="text-forest" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:self-end">
            <p className="text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
          </Reveal>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Jump to year">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => jump(y)}
                className={cn(
                  "min-h-10 rounded-full px-5 text-sm font-medium transition-colors",
                  y === "Next" ? "bg-forest text-parchment hover:bg-charcoal" : "border border-charcoal/20 text-charcoal hover:border-charcoal",
                )}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => scrollByCard(-1)} disabled={atStart} aria-label="Previous milestone" className={navBtn}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scrollByCard(1)} disabled={atEnd} aria-label="Next milestone" className={navBtn}>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-12">
        <div className="pointer-events-none absolute inset-x-0 top-[5.1rem] h-px bg-charcoal/25" aria-hidden />
        <ol ref={rail} className="rail flex snap-x snap-mandatory gap-10 overflow-x-auto scroll-smooth pb-6" style={{ paddingInline: GUTTER, scrollPaddingInline: GUTTER }} aria-label="Milestones" tabIndex={0}>
          {milestones.map((m, i) => {
            const year = yearOf(m);
            const firstOfYear = i === 0 || yearOf(milestones[i - 1]) !== year;
            const [mon, ...rest] = m.dateLabel.split(" ");
            const yr = rest.join(" ");
            return (
              <li key={m.id} data-year={firstOfYear ? year : undefined} className="w-[min(82vw,23rem)] shrink-0 snap-start">
                <article className="group flex h-full flex-col">
                  <div className="flex h-[4.4rem] items-end justify-between">
                    <time className="display text-[3.4rem] leading-none text-charcoal">
                      {mon}
                      <span className="ml-2 font-sans text-base font-medium tracking-normal text-stone">{yr}</span>
                    </time>
                    <span className="kicker mb-2 text-amber-ink">{m.kind}</span>
                  </div>
                  <span className="relative z-10 mt-[0.35rem] block h-3 w-3 rounded-full border-2 border-charcoal bg-parchment transition-colors duration-500 group-hover:bg-amber" aria-hidden />
                  <div className="mt-6 flex flex-1 flex-col">
                    {m.image ? (
                      <div className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
                        <Image
                          src={m.image.src}
                          alt={m.image.alt}
                          fill
                          sizes="(min-width: 768px) 23rem, 82vw"
                          className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-[1.04]"
                          style={{ objectPosition: m.imagePosition ?? undefined }}
                        />
                      </div>
                    ) : (
                      <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-paper p-6">
                        <span className="display absolute -right-3 -top-8 text-[10rem] text-charcoal/[0.05]" aria-hidden>
                          {m.dateLabel.slice(-2)}
                        </span>
                        <p className="display text-[1.9rem] leading-[1.05] text-charcoal">{m.title}</p>
                      </div>
                    )}
                    <h3 className="serif mt-5 text-[1.35rem] leading-snug text-charcoal">{m.title}</h3>
                    <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-stone">{m.body}</p>
                    {m.link && (
                      <a href={m.link.href} target={m.link.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
                        {m.link.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                </article>
              </li>
            );
          })}

          {upcoming && (
          <li data-year="Next" className="w-[min(88vw,34rem)] shrink-0 snap-start">
            <article className="flex h-full flex-col">
              <div className="flex h-[4.4rem] items-end justify-between">
                <span className="display text-[3.4rem] leading-none text-forest">{upcoming.dateLabel || "Next"}</span>
                <span className="kicker mb-2 text-forest">{upcoming.kind === "Upcoming" ? "In preparation" : upcoming.kind}</span>
              </div>
              <span className="pulse-dot relative z-10 mt-[0.35rem] block h-3 w-3 rounded-full bg-amber ring-4 ring-amber/25" aria-hidden />
              <a href={upcoming.link?.href ?? "#"} className="on-forest group mt-6 flex flex-1 flex-col justify-between bg-forest p-8 text-parchment transition-colors duration-500 hover:bg-forest-2">
                <div>
                  <MapPin className="h-6 w-6 text-amber" aria-hidden />
                  <p className="display mt-8 text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.0]">{upcoming.title}</p>
                  <p className="mt-6 max-w-[38ch] leading-relaxed text-sage">{upcoming.body}</p>
                </div>
                {upcoming.link && (
                  <span className="mt-10 inline-flex items-center gap-3 font-medium">
                    {upcoming.link.label}
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
                  </span>
                )}
              </a>
            </article>
          </li>
          )}
        </ol>
      </div>

      <div className="shell mt-6">
        <div className="h-[2px] w-full bg-charcoal/10" aria-hidden>
          <div className="h-[2px] bg-charcoal transition-[width] duration-200" style={{ width: `${Math.max(6, progress * 100)}%` }} />
        </div>
      </div>
    </section>
  );
}
