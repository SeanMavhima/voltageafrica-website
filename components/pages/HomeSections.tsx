import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { ButtonLink } from "@/components/ui/Button";
import { bool, image, link, list, text, type C } from "@/lib/cms/content";
import { themeClass } from "@/components/cms/theme";

/** One large statement with a source and a link. */
export function HomeStatement({ content, background }: { content: C; background?: string }) {
  const cta = link(content, "cta");
  const t = themeClass(background, "parchment");
  return (
    <section aria-label="Statement" className={`${t.section} py-[clamp(5rem,11vw,9rem)]`}>
      <div className="shell grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-10">
          <p className={`display text-[clamp(2.2rem,4.6vw,4.8rem)] leading-[1.04] ${t.heading}`}>
            <Accent text={text(content, "text")} className={t.accent} />
          </p>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
          {text(content, "sourceLabel") ? (
            <a href={text(content, "sourceUrl") || undefined} target="_blank" rel="noopener noreferrer" className={`text-sm underline underline-offset-4 ${t.muted}`}>
              Source: {text(content, "sourceLabel")} <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span />
          )}
          {cta && (
            <ButtonLink href={cta.href} variant={t.dark ? "line-light" : "line"}>
              {cta.label}
            </ButtonLink>
          )}
        </Reveal>
      </div>
    </section>
  );
}

const SPANS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7", "lg:col-span-6", "lg:col-span-6"];

function ContourGlyph() {
  return (
    <div className="contour absolute inset-0 flex items-center justify-center bg-parchment">
      <svg viewBox="0 0 200 140" className="h-3/4 w-3/4" aria-hidden>
        {[0, 1, 2, 3, 4].map((k) => (
          <ellipse key={k} cx={100 + k * 3} cy={72 - k * 2} rx={22 + k * 16} ry={14 + k * 11} fill="none" stroke="var(--color-charcoal)" strokeOpacity={0.14} />
        ))}
        {[
          [50, 40],
          [150, 38],
          [165, 95],
          [100, 122],
          [38, 98],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line x1="100" y1="72" x2={x} y2={y} stroke="#e8a344" strokeWidth="1.5" strokeDasharray="2 5" />
            <circle cx={x} cy={y} r="4" fill="var(--color-charcoal)" />
          </g>
        ))}
        <circle cx="100" cy="72" r="8" fill="#e8a344" stroke="var(--color-charcoal)" />
      </svg>
    </div>
  );
}

/** Editorial contents grid linking to pages. */
export function ExploreIndex({ content }: { content: C }) {
  const items = list(content, "items").filter((i) => text(i, "href") && text(i, "title"));
  if (!items.length) return null;
  return (
    <section aria-labelledby="explore-title" className="bg-paper py-[clamp(6rem,12vw,10rem)]">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-charcoal pb-6">
          <h2 id="explore-title" className="display text-[clamp(2.8rem,6vw,6rem)] text-charcoal">
            <Accent text={text(content, "headline")} className="text-forest" />
          </h2>
          {text(content, "kicker") && <p className="kicker text-stone">{text(content, "kicker")}</p>}
        </div>
        <ul className="mt-10 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-12">
          {items.map((e, i) => {
            const im = image(e, "image");
            return (
              <Reveal as="li" key={i} delay={(i % 3) * 0.06} className={SPANS[i % SPANS.length]}>
                <Link href={text(e, "href")} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden bg-parchment-3">
                    {im ? (
                      <Image src={im.src} alt={im.alt} fill sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-[1.04]" />
                    ) : (
                      <ContourGlyph />
                    )}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-6">
                    <div>
                      <p className="mono text-stone">{String(i + 1).padStart(2, "0")}</p>
                      <h3 className="display mt-2 text-[clamp(1.9rem,2.8vw,2.7rem)] text-charcoal transition-colors group-hover:text-forest">{text(e, "title")}</h3>
                      {text(e, "blurb") && <p className="mt-2 max-w-[40ch] leading-relaxed text-stone">{text(e, "blurb")}</p>}
                    </div>
                    <span className="mt-8 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-charcoal/25 transition-colors group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-amber">
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Closing call to action band. */
export function ContactBand({ content, email, background }: { content: C; email: string | null; background?: string }) {
  const cta = link(content, "primaryCta");
  const t = themeClass(background, "forest");
  return (
    <section aria-label={text(content, "headline").replace(/\*/g, "") || "Call to action"} className={`${t.section} contour-light py-[clamp(5rem,10vw,8rem)]`}>
      <div className="shell grid gap-10 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-7">
          {text(content, "kicker") && <p className={`kicker ${t.kicker}`}>{text(content, "kicker")}</p>}
          <h2 className={`display mt-6 text-[clamp(3rem,6.6vw,6.8rem)] ${t.heading}`}>
            <Accent text={text(content, "headline")} className={t.accent} />
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-5">
          {text(content, "body") && <p className={`max-w-[44ch] text-lg leading-relaxed ${t.muted}`}>{text(content, "body")}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            {cta && (
              <ButtonLink href={cta.href} variant={t.dark ? "light" : "solid"}>
                {cta.label}
              </ButtonLink>
            )}
            {bool(content, "showEmail") && email && (
              <a href={`mailto:${email}`} className="font-medium underline decoration-current/40 underline-offset-4 hover:decoration-current">
                {email}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
