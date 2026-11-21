import Link from "next/link";
import { link, text, type C } from "@/lib/cms/content";
import type { TechItem } from "@/lib/cms/types";

type CapabilityStatus = "Prototyped" | "Explored" | "In design" | "Planned" | "Long-term";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";
import { EnergyDashboard } from "./EnergyDashboard";

const STATUS: Record<CapabilityStatus, { cls: string; mark: string }> = {
  Prototyped: { cls: "bg-forest text-parchment", mark: "■" },
  Explored: { cls: "bg-charcoal/[0.07] text-charcoal", mark: "◆" },
  "In design": { cls: "bg-amber text-charcoal", mark: "▲" },
  Planned: { cls: "border border-rule-strong text-charcoal-2", mark: "○" },
  "Long-term": { cls: "border border-dashed border-rule-strong text-stone", mark: "◌" },
};

export function Intelligence({ content, capabilities, isFirst = false }: { content: C; capabilities: TechItem[]; isFirst?: boolean }) {
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  const H = isFirst ? "h1" : "h2";
  return (
    <section aria-labelledby="intel-title" className="relative bg-paper py-[clamp(6rem,12vw,10rem)]">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="kicker text-amber-ink">{c.kicker}</p>
            <H id="intel-title" className="display mt-6 text-[clamp(3rem,6.4vw,6.6rem)] text-charcoal">
              <Accent text={c.headline} className="text-forest" />
            </H>
            <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <EnergyDashboard />
            {text(content, "disclaimer") && <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-stone">{text(content, "disclaimer")}</p>}
            {link(content, "labCta") && (
              <Link href={link(content, "labCta")!.href} className="group mt-6 flex items-center justify-between gap-6 rounded-xl bg-charcoal px-6 py-5 text-parchment transition-colors hover:bg-forest">
                <span>
                  <span className="kicker block text-amber">Interactive · simulated</span>
                  <span className="serif mt-1 block text-[1.45rem] leading-tight">{link(content, "labCta")!.label}</span>
                  <span className="mt-1 block text-[13px] text-parchment/70">Run scenarios, compare optimisation strategies and ask the energy copilot.</span>
                </span>
                <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
            )}
          </Reveal>
        </div>

        {/* Status register */}
        <Reveal className="mt-[clamp(4rem,8vw,7rem)]">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-charcoal pb-4">
            <h3 className="display text-[clamp(1.9rem,3vw,2.8rem)] text-charcoal">{text(content, "registerTitle", "What exists today, and what comes next.")}</h3>
            <p className="kicker text-stone">Capability register</p>
          </div>
          <ul className="grid md:grid-cols-2 md:gap-x-16">
            {capabilities.map((cap) => {
              const status = (cap.statusLabel ?? "Planned") as CapabilityStatus;
              const st = STATUS[status] ?? STATUS.Planned;
              return (
              <li key={cap.id} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-rule py-5">
                <span className="serif text-xl text-charcoal">{cap.title}</span>
                <span className={cn("row-span-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]", st.cls)}>
                  <span aria-hidden className="text-[9px]">
                    {st.mark}
                  </span>
                  {status}
                </span>
                <span className="text-sm text-stone">{cap.note}</span>
              </li>
              );
            })}
          </ul>
          {text(content, "footnote") && <p className="mt-8 max-w-[70ch] text-[0.9375rem] leading-relaxed text-charcoal-2">{text(content, "footnote")}</p>}
        </Reveal>
      </div>
    </section>
  );
}
