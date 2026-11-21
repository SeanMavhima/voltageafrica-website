import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { themeClass } from "@/components/cms/theme";
import { list, text, type C } from "@/lib/cms/content";
import { cn } from "@/lib/utils";

/**
 * "At a glance": the handful of verifiable facts an evaluator looks for first.
 * A ruled ledger, not cards: big figures, short labels, one line of detail.
 */
export function KeyFacts({ content: c, background, isFirst = false }: { content: C; background?: string; isFirst?: boolean }) {
  const t = themeClass(background, "paper");
  const H = isFirst ? "h1" : "h2";
  const items = list(c, "items").filter((i) => text(i, "value") && text(i, "label"));
  if (!items.length) return null;
  const headline = text(c, "headline");
  return (
    <section aria-labelledby="key-facts-title" className={cn(t.section, isFirst ? "pt-[clamp(8rem,16vw,11rem)]" : "pt-[clamp(4rem,8vw,6.5rem)]", "pb-[clamp(4rem,8vw,6.5rem)]")}>
      <div className="shell">
        <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b-2 pb-5", t.dark ? "border-parchment/50" : "border-charcoal")}>
          <div>
            <p className={cn("kicker", t.kicker)}>{text(c, "kicker", "At a glance")}</p>
            {headline ? (
              <H id="key-facts-title" className={cn("display mt-4 max-w-[22ch] text-[clamp(2rem,3.6vw,3.4rem)]", t.heading)}>
                <Accent text={headline} className={t.accent} />
              </H>
            ) : (
              <H id="key-facts-title" className="sr-only">
                VoltageAfrica at a glance
              </H>
            )}
          </div>
          {text(c, "note") && <p className={cn("max-w-[48ch] text-[13px] leading-relaxed", t.muted)}>{text(c, "note")}</p>}
        </div>
        {/* A list rather than <dl>: each fact may be wrapped in a link, which <dl> does not allow. */}
        <ul className={cn("grid grid-cols-2 gap-px lg:grid-cols-3", t.dark ? "bg-parchment/15" : "bg-rule")}>
          {items.map((it, i) => {
            const href = text(it, "href");
            const body = (
              <>
                <p className={cn("kicker text-[0.6875rem]", t.muted)}>{text(it, "label")}</p>
                <p className={cn("display mt-3 text-[clamp(2rem,3.4vw,3.2rem)] leading-none tabular-nums", t.heading)}>{text(it, "value")}</p>
                {text(it, "detail") && <p className={cn("mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed", t.muted)}>{text(it, "detail")}</p>}
              </>
            );
            return (
              <Reveal
                as="li"
                key={i}
                delay={(i % 3) * 0.05}
                className={cn(t.section, "px-4 py-7 sm:px-7 sm:py-8")}
              >
                {href && /\.[a-z0-9]{2,5}$/i.test(href) ? (
                  // Files (e.g. a PDF report) open directly rather than through client navigation
                  <a href={href} target="_blank" rel="noopener" className="group block">
                    {body}
                  </a>
                ) : href ? (
                  <Link href={href} className="group block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
