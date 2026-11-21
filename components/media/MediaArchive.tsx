"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Publication } from "@/lib/cms/types";
import { useMediaQuery } from "@/lib/hooks";

export function MediaArchive({ publications }: { publications: Publication[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const listRef = useRef<HTMLOListElement>(null);
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");

  const onMove = (e: React.MouseEvent) => {
    const r = listRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const current = hover !== null ? publications[hover] : null;

  return (
    <div className="relative">
      <ol ref={listRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="relative border-t-2 border-charcoal">
        {publications.map((p, i) => (
          <li key={p.id} onMouseEnter={() => setHover(i)}>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-4 border-b border-rule py-9 transition-colors duration-500 hover:bg-paper md:grid-cols-12 md:items-baseline md:gap-8 md:px-5"
            >
              <span className="mono text-stone md:col-span-2">{p.date}</span>
              <span className="md:col-span-7">
                <span className="kicker block text-amber-ink">{p.outlet}</span>
                <span className="display mt-3 block text-[clamp(1.9rem,3.4vw,3.1rem)] leading-[1.02] text-charcoal transition-transform duration-700 ease-[var(--ease-expo)] md:group-hover:translate-x-2">
                  {p.headline}
                </span>
                <span className="mt-3 block max-w-[60ch] text-[0.9375rem] leading-relaxed text-stone">{p.description}</span>
              </span>
              <span className="kicker text-stone md:col-span-2">{p.category}</span>
              <span className="flex items-center justify-start md:col-span-1 md:justify-end">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/25 text-charcoal transition-all duration-500 group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-amber">
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
                <span className="sr-only">Read on {p.outlet} (opens in a new tab)</span>
              </span>
            </a>
          </li>
        ))}

        {/* Cursor-following preview (desktop) */}
        <AnimatePresence>
          {fine && current && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1, x: pos.x + 32, y: pos.y - 120 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.6 }}
              className="pointer-events-none absolute left-0 top-0 z-20 hidden w-[18rem] overflow-hidden bg-paper shadow-[0_30px_60px_-25px_rgb(36_36_31/0.45)] lg:block"
              aria-hidden
            >
              {current.image ? (
                <div className="relative aspect-[4/3]">
                  <Image src={current.image.src} alt="" fill sizes="17rem" className="object-cover" />
                </div>
              ) : (
                <div className="contour flex aspect-[4/3] flex-col justify-between bg-parchment p-5">
                  <span className="kicker text-amber-ink">{current.outlet}</span>
                  <span className="display text-2xl leading-[1.05] text-charcoal">{current.headline}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-rule px-4 py-2">
                <span className="kicker text-stone">{current.category}</span>
                <span className="mono text-stone">{current.date}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ol>
    </div>
  );
}
