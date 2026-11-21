import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Accent } from "@/components/ui/Accent";
import { ButtonLink } from "@/components/ui/Button";
import { ParallaxImage } from "@/components/ui/ParallaxImage";
import { Reveal } from "@/components/ui/Reveal";
import { link, list, text, type C } from "@/lib/cms/content";
import type { Media, TechItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { ActLabel } from "./ActLabel";

export type ActMedia = { main: Media | null; images: (Media & { mosaicCaption?: string })[] };

function Caption({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <p className={cn("mt-3 text-[12.5px] leading-snug", dark ? "text-parchment/60" : "text-stone", className)}>{children}</p>;
}

function Credit({ media, dark }: { media: Media; dark?: boolean }) {
  if (!media.credit) return null;
  return (
    <>
      {" "}
      Photo:{" "}
      <a href={media.credit.source} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2", dark ? "decoration-parchment/40 hover:decoration-parchment" : "decoration-rule-strong hover:text-charcoal")}>
        {media.credit.author}
      </a>
      , {media.credit.license}.
    </>
  );
}

const STATUS_ORDER = ["Prototyped", "Explored", "In design", "Planned", "Long-term"];
const STATUS_TONE: Record<string, string> = {
  Prototyped: "bg-amber text-charcoal",
  Explored: "bg-amber-soft text-charcoal",
  "In design": "bg-parchment text-charcoal",
  Planned: "border border-parchment/40 text-parchment",
  "Long-term": "border border-dashed border-parchment/40 text-parchment/80",
};

export function Act({ content: c, media, capabilities = [], isFirst = false }: { content: C; media: ActMedia; capabilities?: TechItem[]; isFirst?: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const layout = text(c, "layout", "split");
  const numeral = text(c, "numeral");
  const kicker = text(c, "kicker");
  const headline = text(c, "headline");
  const body = text(c, "body");
  const note = text(c, "note");
  const cta = link(c, "cta");
  const stats = list(c, "stats").filter((s) => text(s, "value"));
  const points = list(c, "points").filter((p) => text(p, "title"));
  const links = list(c, "links").filter((l) => text(l, "title") && text(l, "href"));
  const id = `act-${(numeral || kicker || "x").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const caption = text(c, "imageCaption") || media.main?.caption || "";

  /* ── I · Reality: full-bleed photograph, figures with sources ── */
  if (layout === "reality") {
    return (
      <section aria-labelledby={id} className="on-forest relative bg-[#14120e] text-parchment">
        <div className="relative h-[92svh] min-h-[560px]">
          {media.main && <ParallaxImage media={media.main} position={text(c, "imagePosition") || null} className="absolute inset-0 h-full" strength={6} />}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14120e] via-[#14120e]/40 to-[#14120e]/20" />
          <div className="shell absolute inset-x-0 bottom-0 pb-[clamp(3rem,7vw,6rem)]">
            <Reveal>
              <ActLabel numeral={numeral} kicker={kicker} dark />
              <H id={id} className="display mt-7 max-w-[17ch] text-[clamp(2.8rem,6.6vw,7rem)]">
                <Accent text={headline} className="text-amber" />
              </H>
            </Reveal>
          </div>
        </div>
        <div className="shell pb-[clamp(5rem,10vw,8rem)]">
          {stats.length > 0 && (
            <dl className="grid border-t border-parchment/20 md:grid-cols-3">
              {stats.map((s, i) => (
                <Reveal key={i} delay={i * 0.08} className={cn("border-b border-parchment/15 py-10 md:border-b-0 md:py-12", i > 0 && "md:border-l md:pl-10", i < stats.length - 1 && "md:pr-10")}>
                  <dt className="sr-only">{text(s, "label")}</dt>
                  <dd>
                    <p className="display text-[clamp(4rem,8vw,7.5rem)] leading-none text-parchment tabular-nums">
                      {text(s, "value")}
                      {text(s, "unit") && <span className="ml-2 align-top font-sans text-[clamp(1rem,1.6vw,1.375rem)] font-medium tracking-normal text-amber">{text(s, "unit")}</span>}
                    </p>
                    <p className="mt-5 max-w-[34ch] text-[0.9375rem] leading-relaxed text-parchment/80">{text(s, "label")}</p>
                    {text(s, "source") && (
                      <p className="mono mt-4 text-parchment/50">
                        {text(s, "sourceUrl") ? (
                          <a href={text(s, "sourceUrl")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-parchment/30 underline-offset-2 hover:text-parchment">
                            {text(s, "source")} <ArrowUpRight className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          text(s, "source")
                        )}
                      </p>
                    )}
                  </dd>
                </Reveal>
              ))}
            </dl>
          )}
          {(body || caption) && (
            <div className="mt-12 grid gap-8 md:grid-cols-12">
              {body && (
                <Reveal className="md:col-span-7">
                  <p className="serif text-[clamp(1.35rem,2.1vw,1.9rem)] leading-[1.35] text-parchment/90">{body}</p>
                </Reveal>
              )}
              {caption && media.main && (
                <Caption dark className="md:col-span-4 md:col-start-9 md:self-end">
                  {caption}
                  <Credit media={media.main} dark />
                </Caption>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ── IV · Register: the intelligence layer, with the honest status of each capability ── */
  if (layout === "register") {
    const rows = [...capabilities].sort((a, b) => STATUS_ORDER.indexOf(a.statusLabel ?? "") - STATUS_ORDER.indexOf(b.statusLabel ?? ""));
    return (
      <section aria-labelledby={id} className="on-forest contour-light relative bg-forest py-[clamp(6rem,12vw,10rem)] text-parchment">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-28">
            <Reveal>
              <ActLabel numeral={numeral} kicker={kicker} dark />
              <H id={id} className="display mt-7 text-[clamp(2.8rem,5.4vw,5.6rem)]">
                <Accent text={headline} className="text-amber" />
              </H>
              {body && <p className="mt-8 max-w-[44ch] text-lg leading-relaxed text-sage">{body}</p>}
              {cta && (
                <ButtonLink href={cta.href} variant="light" className="mt-10">
                  {cta.label}
                </ButtonLink>
              )}
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal delay={0.08}>
              <div className="flex flex-wrap gap-2 pb-6" aria-label="Status legend">
                {STATUS_ORDER.map((s) => (
                  <span key={s} className={cn("px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]", STATUS_TONE[s])}>
                    {s}
                  </span>
                ))}
              </div>
              <ol className="border-t border-parchment/30">
                {rows.map((r, i) => (
                  <li key={r.id} className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-b border-forest-rule py-5 sm:grid-cols-[2.25rem_1fr_auto] sm:items-baseline">
                    <span className="mono pt-1 text-parchment/50">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="serif text-[1.35rem] leading-snug text-parchment">{r.title}</p>
                      {r.note && <p className="mt-1 text-[0.9375rem] leading-relaxed text-sage">{r.note}</p>}
                    </div>
                    {r.statusLabel && <span className={cn("col-start-2 mt-3 w-fit px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] sm:col-start-3 sm:mt-0", STATUS_TONE[r.statusLabel] ?? STATUS_TONE.Planned)}>{r.statusLabel}</span>}
                  </li>
                ))}
              </ol>
              {note && <p className="mt-8 max-w-[60ch] text-[0.9375rem] leading-relaxed text-parchment/75">{note}</p>}
            </Reveal>
          </div>
        </div>
      </section>
    );
  }

  /* ── V · Mosaic: what energy makes possible ── */
  if (layout === "mosaic") {
    const [a, b, d] = media.images;
    return (
      <section aria-labelledby={id} className="relative bg-paper py-[clamp(6rem,12vw,10rem)]">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <Reveal className="lg:col-span-8">
              <ActLabel numeral={numeral} kicker={kicker} />
              <H id={id} className="display mt-7 max-w-[18ch] text-[clamp(2.8rem,6vw,6.2rem)] text-charcoal">
                <Accent text={headline} className="text-forest" />
              </H>
            </Reveal>
            {body && (
              <Reveal delay={0.08} className="lg:col-span-4">
                <p className="text-lg leading-relaxed text-charcoal-2">{body}</p>
              </Reveal>
            )}
          </div>
          {a && (
            <div className="mt-[clamp(3.5rem,7vw,6rem)] grid gap-6 md:grid-cols-12">
              <figure className="md:col-span-7">
                <ParallaxImage media={a} className="aspect-[4/5] md:aspect-[5/6]" sizes="(min-width: 768px) 58vw, 100vw" />
                <Caption>
                  {a.mosaicCaption || a.caption}
                  <Credit media={a} />
                </Caption>
              </figure>
              <div className="grid content-start gap-6 md:col-span-5 md:pt-[22%]">
                {b && (
                  <figure>
                    <ParallaxImage media={b} className="aspect-[4/3]" sizes="(min-width: 768px) 40vw, 100vw" strength={5} />
                    <Caption>
                      {b.mosaicCaption || b.caption}
                      <Credit media={b} />
                    </Caption>
                  </figure>
                )}
                {d && (
                  <figure className="md:w-[78%] md:justify-self-end">
                    <ParallaxImage media={d} className="aspect-[4/3]" sizes="(min-width: 768px) 32vw, 100vw" strength={5} />
                    <Caption>
                      {d.mosaicCaption || d.caption}
                      <Credit media={d} />
                    </Caption>
                  </figure>
                )}
              </div>
            </div>
          )}
          {points.length > 0 && (
            <ul className="mt-[clamp(4rem,8vw,7rem)] grid border-t-2 border-charcoal sm:grid-cols-2 lg:grid-cols-3">
              {points.map((p, i) => (
                <Reveal as="li" key={i} delay={(i % 3) * 0.06} className="border-b border-rule py-8 sm:pr-8 lg:[&:nth-child(3n+2)]:px-8 lg:[&:nth-child(3n)]:pl-8">
                  <span className="mono text-stone">{String(i + 1).padStart(2, "0")}</span>
                  <p className="display mt-3 text-[clamp(1.7rem,2.4vw,2.3rem)] text-charcoal">{text(p, "title")}</p>
                  {text(p, "body") && <p className="mt-2 max-w-[38ch] leading-relaxed text-stone">{text(p, "body")}</p>}
                </Reveal>
              ))}
            </ul>
          )}
          {note && <p className="mt-10 max-w-[70ch] text-[13px] leading-relaxed text-stone">{note}</p>}
        </div>
      </section>
    );
  }

  /* ── VII · Invitation: the closing image and three ways in ── */
  if (layout === "invitation") {
    return (
      <section aria-labelledby={id} className="on-forest relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#14120e] text-parchment">
        {media.main && <ParallaxImage media={media.main} position={text(c, "imagePosition") || null} className="absolute inset-0 -z-10 h-full" strength={5} />}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_35%,rgb(20_18_14/0.25),rgb(20_18_14/0.8))]" />
        <div className="shell flex flex-1 flex-col items-center justify-center pt-[clamp(7rem,14vw,10rem)] text-center">
          <Reveal>
            <div className="flex justify-center">
              <ActLabel numeral={numeral} kicker={kicker} dark />
            </div>
            <H id={id} className="display mx-auto mt-8 max-w-[14ch] text-[clamp(3.4rem,9vw,10rem)] [text-shadow:0_2px_40px_rgb(20_18_14/0.4)]">
              <Accent text={headline} className="text-amber" />
            </H>
            {body && <p className="mx-auto mt-8 max-w-[52ch] text-lg leading-relaxed text-parchment/90">{body}</p>}
          </Reveal>
        </div>
        {links.length > 0 && (
          <nav aria-label="Ways to work with VoltageAfrica" className="shell pb-8 pt-16">
            <ul className="grid border-t border-parchment/30 md:grid-cols-3">
              {links.map((l, i) => (
                <Reveal as="li" key={i} delay={i * 0.07} className={cn("border-b border-parchment/15 md:border-b-0", i > 0 && "md:border-l md:border-parchment/20")}>
                  <Link href={text(l, "href")} className="group flex h-full items-start justify-between gap-6 py-7 md:px-8 md:first:pl-0">
                    <span>
                      <span className="display block text-[clamp(1.9rem,2.6vw,2.6rem)] transition-colors group-hover:text-amber">{text(l, "title")}</span>
                      {text(l, "body") && <span className="mt-2 block max-w-[34ch] text-[0.9375rem] leading-relaxed text-parchment/75">{text(l, "body")}</span>}
                    </span>
                    <span className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-parchment/40 transition-colors group-hover:border-amber group-hover:bg-amber group-hover:text-charcoal">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
            {caption && media.main && (
              <Caption dark className="mt-6">
                {caption}
                <Credit media={media.main} dark />
              </Caption>
            )}
          </nav>
        )}
      </section>
    );
  }

  /* ── II · Split (default): asymmetric photograph pair, the idea in words ── */
  const second = media.images[0];
  return (
    <section aria-labelledby={id} className="contour relative bg-parchment py-[clamp(6rem,12vw,10rem)]">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5 lg:pt-10">
          <Reveal>
            <ActLabel numeral={numeral} kicker={kicker} />
            <H id={id} className="display mt-7 text-[clamp(2.8rem,5.4vw,5.6rem)] text-charcoal">
              <Accent text={headline} className="text-forest" />
            </H>
            {body && <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{body}</p>}
          </Reveal>
          {points.length > 0 && (
            <ol className="mt-12 border-t-2 border-charcoal">
              {points.map((p, i) => (
                <Reveal as="li" key={i} delay={i * 0.06} className="grid grid-cols-[2.5rem_1fr] border-b border-rule py-5">
                  <span className="mono pt-1.5 text-amber-ink">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="serif text-[1.35rem] leading-snug text-charcoal">{text(p, "title")}</p>
                    {text(p, "body") && <p className="mt-1 text-[0.9375rem] leading-relaxed text-stone">{text(p, "body")}</p>}
                  </div>
                </Reveal>
              ))}
            </ol>
          )}
          {cta && (
            <Reveal delay={0.1} className="mt-10">
              <ButtonLink href={cta.href} variant="solid">
                {cta.label}
              </ButtonLink>
            </Reveal>
          )}
        </div>
        {media.main && (
          <div className="relative lg:col-span-6 lg:col-start-7">
            <figure>
              <ParallaxImage media={media.main} position={text(c, "imagePosition") || null} className="aspect-[4/5]" sizes="(min-width: 1024px) 46vw, 100vw" />
              <Caption>
                {caption}
                <Credit media={media.main} />
              </Caption>
            </figure>
            {second && (
              <figure className="relative -mt-24 ml-auto w-[58%] border-[10px] border-parchment bg-parchment shadow-[0_40px_80px_-50px_rgb(36_36_31/0.6)] lg:absolute lg:-bottom-16 lg:-left-[22%] lg:mt-0 lg:w-[48%]">
                <ParallaxImage media={second} className="aspect-[4/3]" sizes="(min-width: 1024px) 22vw, 58vw" strength={4} />
                <figcaption className="px-1 pt-2 text-[12px] leading-snug text-stone">{second.mosaicCaption || second.caption}</figcaption>
              </figure>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
