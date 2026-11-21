"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Recommendation, RecommendationKind } from "@/lib/energy-lab/explain";
import { cn } from "@/lib/utils";
import type { Level } from "./Console";

const KIND: Record<RecommendationKind, { label: string; mark: string; cls: string }> = {
  schedule: { label: "Schedule", mark: "◆", cls: "bg-amber/25 text-amber-ink" },
  reserve: { label: "Protect", mark: "●", cls: "bg-forest/10 text-forest" },
  shed: { label: "Shed / defer", mark: "▲", cls: "bg-status-critical/10 text-status-critical-ink" },
  capacity: { label: "Capacity limit", mark: "▲", cls: "bg-status-critical/10 text-status-critical-ink" },
  surplus: { label: "Opportunity", mark: "○", cls: "bg-charcoal/[0.06] text-charcoal-2" },
  evening: { label: "Demand", mark: "◆", cls: "bg-amber/25 text-amber-ink" },
  steady: { label: "No action", mark: "●", cls: "bg-forest/10 text-forest" },
};

function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-rule py-3 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="kicker text-[0.68rem] text-stone">{label}</dt>
      <dd className="text-[14.5px] leading-relaxed text-charcoal">{children}</dd>
    </div>
  );
}

export function Recommendations({ items, level }: { items: Recommendation[]; level: Level }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <ol className="border-b border-rule">
      {items.map((r, i) => {
        const k = KIND[r.kind];
        const isOpen = open === r.id || level === "engineer";
        return (
          <li key={r.id} className="border-t-2 border-charcoal first:border-t-2">
            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={isOpen} className="flex w-full items-start gap-5 py-6 text-left" disabled={level === "engineer"}>
              <span className="mt-1.5 font-mono text-[12px] text-stone">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]", k.cls)}>
                  <span aria-hidden className="text-[8px]">
                    {k.mark}
                  </span>
                  {k.label}
                </span>
                <span className="serif mt-3 block text-[clamp(1.35rem,2.2vw,1.8rem)] leading-tight text-charcoal">{r.title}</span>
              </span>
              {level !== "engineer" && <ChevronDown className={cn("mt-2 h-5 w-5 shrink-0 text-stone transition-transform", isOpen && "rotate-180")} aria-hidden />}
            </button>
            {isOpen && (
              <dl className="pb-6 pl-0 sm:pl-10">
                <Part label="Why?">{r.why}</Part>
                <Part label="Expected effect">{r.effect}</Part>
                <Part label="Trade-off">{r.tradeoff}</Part>
                <Part label="Basis & limitations">
                  <span className="text-charcoal-2">{r.basis}</span>
                  {level === "engineer" && Object.keys(r.figures).length > 0 && (
                    <span className="mt-2 block font-mono text-[11.5px] text-stone">
                      {Object.entries(r.figures)
                        .map(([a, b]) => `${a}=${b}`)
                        .join(" · ")}
                    </span>
                  )}
                </Part>
              </dl>
            )}
          </li>
        );
      })}
    </ol>
  );
}
