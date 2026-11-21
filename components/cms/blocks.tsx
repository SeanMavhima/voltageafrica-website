/**
 * Generic page-builder sections: awards, projects and the building blocks
 * (text & image, full image, gallery, video, quote, stats, feature list,
 * rich text, split, partners). All render from CMS content and degrade
 * gracefully when fields are empty.
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { ButtonLink } from "@/components/ui/Button";
import { image, isExternal, link, list, num, text, youtubeId, type C } from "@/lib/cms/content";
import { sanitizeRichText } from "@/lib/cms/sanitize";
import type { Award, Project } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { themeClass, type Theme } from "./theme";

type Props = { content: C; background?: string; isFirst?: boolean };

const pad = (isFirst?: boolean) => (isFirst ? "pt-[clamp(8rem,18vh,12rem)] pb-[clamp(5rem,10vw,8rem)]" : "py-[clamp(5rem,10vw,8rem)]");

function Heading({ content, t, isFirst, className }: { content: C; t: Theme; isFirst?: boolean; className?: string }) {
  const H = isFirst ? "h1" : "h2";
  const headline = text(content, "headline");
  return (
    <>
      {text(content, "kicker") && <p className={`kicker ${t.kicker}`}>{text(content, "kicker")}</p>}
      {headline && (
        <H className={cn("display mt-5 text-[clamp(2.6rem,5.6vw,5.6rem)]", t.heading, className)}>
          <Accent text={headline} className={t.accent} />
        </H>
      )}
    </>
  );
}

function Rich({ html, t, className }: { html: string; t: Theme; className?: string }) {
  const safe = sanitizeRichText(html);
  if (!safe) return null;
  return (
    <div
      className={cn(
        "max-w-[64ch] text-lg leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-5 [&_blockquote]:font-serif [&_blockquote]:text-2xl [&_h2]:mt-14 [&_h2]:font-serif [&_h2]:text-[clamp(1.75rem,2.6vw,2.25rem)] [&_h2]:leading-tight [&_h2]:tracking-[-0.01em] [&_h3]:mt-10 [&_h3]:font-serif [&_h3]:text-2xl [&_h4]:mt-6 [&_h4]:font-semibold [&_li]:mt-2 [&_ol]:mt-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:ml-6 [&_ul]:list-disc [&_h2+p]:mt-3 [&_h3+p]:mt-2 [&>*:first-child]:mt-0",
        t.dark ? "text-parchment/90" : "text-charcoal-2",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

/* ─── Awards ─── */
export function AwardsSection({ content, awards, background, isFirst }: Props & { awards: Award[] }) {
  const t = themeClass(background, "paper");
  if (!awards.length) return null;
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Heading content={content} t={t} isFirst={isFirst} />
          </Reveal>
          {text(content, "intro") && (
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:self-end">
              <p className={`text-lg leading-relaxed ${t.muted}`}>{text(content, "intro")}</p>
            </Reveal>
          )}
        </div>
        <ol className={`mt-14 border-t-2 ${t.dark ? "border-parchment" : "border-charcoal"}`}>
          {awards.map((a) => (
            <Reveal as="li" key={a.id}>
              <div className={`grid items-center gap-6 border-b py-7 md:grid-cols-12 ${t.rule}`}>
                <span className={`mono md:col-span-2 ${t.muted}`}>{a.date}</span>
                <div className="md:col-span-6">
                  <h3 className={`display text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.05] ${t.heading}`}>{a.title}</h3>
                  <p className={`mt-2 ${t.muted}`}>
                    {a.organisation}
                    {a.location && <> · {a.location}</>}
                  </p>
                  {a.description && <p className={`mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed ${t.muted}`}>{a.description}</p>}
                </div>
                <div className="flex items-center justify-between gap-4 md:col-span-4 md:justify-end">
                  {a.image && (
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden bg-parchment-3">
                      <Image src={a.image.src} alt={a.image.alt} fill sizes="112px" className="object-cover" />
                    </div>
                  )}
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${t.dark ? "border-parchment/30 hover:bg-amber hover:text-charcoal" : "border-charcoal/25 hover:bg-charcoal hover:text-amber"}`}>
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Source for {a.title} (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Projects ─── */
export function ProjectsSection({ content, projects, background, isFirst }: Props & { projects: Project[] }) {
  const t = themeClass(background, "paper");
  return (
    <section className={`${t.section} ${text(content, "headline") || isFirst ? pad(isFirst) : "pb-[clamp(5rem,10vw,8rem)]"}`}>
      <div className="shell">
        {(text(content, "headline") || text(content, "kicker")) && (
          <Reveal className="mb-12">
            <Heading content={content} t={t} isFirst={isFirst} />
            {text(content, "intro") && <p className={`mt-6 max-w-[50ch] text-lg ${t.muted}`}>{text(content, "intro")}</p>}
          </Reveal>
        )}
        {projects.length === 0 ? (
          <p className={t.muted}>Projects will appear here when they are published.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-14 md:grid-cols-2">
            {projects.map((p) => (
              <Reveal as="li" key={p.id}>
                <Link href={`/projects/${p.slug}`} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden bg-parchment-3">
                    {p.cover ? (
                      <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-[1.04]" />
                    ) : (
                      <div className="contour absolute inset-0 flex items-end bg-parchment p-8">
                        <span className="display text-[clamp(2.4rem,4vw,3.6rem)] leading-none text-charcoal/80">{p.location ?? p.name}</span>
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-amber px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal">{p.stage}</span>
                  </div>
                  <h3 className={`display mt-5 text-[clamp(1.9rem,2.8vw,2.7rem)] transition-colors group-hover:text-forest ${t.heading}`}>{p.name}</h3>
                  <p className={`mt-2 max-w-[52ch] leading-relaxed ${t.muted}`}>{p.summary}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─── Text & image ─── */
export function TextImageSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "parchment");
  const im = image(content, "image");
  const cta = link(content, "cta");
  const left = text(content, "imageSide") === "left";
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell grid items-center gap-12 lg:grid-cols-12">
        <Reveal className={cn("lg:col-span-6", left && im && "lg:order-2 lg:col-start-7")}>
          <Heading content={content} t={t} isFirst={isFirst} />
          <Rich html={text(content, "body")} t={t} className="mt-8" />
          {cta && (
            <div className="mt-8">
              <ButtonLink href={cta.href} variant={t.dark ? "light" : "solid"} external={isExternal(cta.href)}>
                {cta.label}
              </ButtonLink>
            </div>
          )}
        </Reveal>
        {im && (
          <Reveal delay={0.1} className={cn("lg:col-span-6", left ? "lg:order-1" : "")}>
            <div className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
              <Image src={im.src} alt={im.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ─── Full-width image ─── */
export function FullImageSection({ content, isFirst }: Props) {
  const im = image(content, "image");
  if (!im) return null;
  const h = text(content, "height", "tall");
  const overlay = Math.min(100, Math.max(0, num(content, "overlay", 40))) / 100;
  const headline = text(content, "headline");
  const H = isFirst ? "h1" : "h2";
  return (
    <section className={cn("on-dark relative isolate flex items-end overflow-hidden bg-charcoal", h === "screen" ? "min-h-[100svh]" : h === "medium" ? "min-h-[60svh]" : "min-h-[85svh]")}>
      <Image src={im.src} alt={im.alt} fill sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal to-transparent" style={{ opacity: overlay }} aria-hidden />
      {(headline || text(content, "body")) && (
        <div className="shell pb-[clamp(3rem,8vw,6rem)] pt-40 text-parchment">
          {headline && (
            <Reveal>
              <H className="display max-w-[18ch] text-[clamp(2.6rem,6vw,6.4rem)]">
                <Accent text={headline} className="text-amber" />
              </H>
            </Reveal>
          )}
          {text(content, "body") && <p className="mt-6 max-w-[54ch] text-lg text-parchment/90">{text(content, "body")}</p>}
        </div>
      )}
    </section>
  );
}

/* ─── Gallery ─── */
export function GallerySection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "paper");
  const items = list(content, "images").map((x) => ({ im: image(x, "image"), caption: text(x, "caption") })).filter((x) => x.im);
  if (!items.length) return null;
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mb-12">
          <Heading content={content} t={t} isFirst={isFirst} />
        </Reveal>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x, i) => (
            <Reveal as="li" key={i} delay={(i % 3) * 0.05}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
                  <Image src={x.im!.src} alt={x.im!.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
                {x.caption && <figcaption className={`mt-3 text-[13px] ${t.muted}`}>{x.caption}</figcaption>}
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── Video ─── */
export function VideoSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "charcoal");
  const vid = image(content, "video");
  const yt = youtubeId(text(content, "youtubeUrl"));
  const poster = image(content, "poster");
  if (!vid && !yt) return null;
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mb-10">
          <Heading content={content} t={t} isFirst={isFirst} />
        </Reveal>
        <div className="on-dark relative aspect-video overflow-hidden bg-charcoal">
          {yt ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${yt}`}
              title={text(content, "headline").replace(/\*/g, "") || "Video"}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video className="absolute inset-0 h-full w-full object-cover" src={vid!.src} poster={poster?.src} controls preload="metadata" />
          )}
        </div>
        {text(content, "caption") && <p className={`mt-4 text-[13px] ${t.muted}`}>{text(content, "caption")}</p>}
      </div>
    </section>
  );
}

/* ─── Quote ─── */
export function QuoteSection({ content, background }: Props) {
  const t = themeClass(background, "paper");
  const q = text(content, "quote");
  if (!q) return null;
  const href = text(content, "href");
  return (
    <section className={`${t.section} py-[clamp(4rem,9vw,8rem)]`}>
      <div className="shell">
        <Reveal>
          <blockquote>
            <p className={`display max-w-[24ch] text-[clamp(2.2rem,5vw,5.2rem)] leading-[1.04] ${t.heading}`}>
              <span className="text-amber" aria-hidden>
                &ldquo;
              </span>
              {q}
              <span className="text-amber" aria-hidden>
                &rdquo;
              </span>
            </p>
            {text(content, "attribution") && (
              <footer className={`mt-8 text-sm font-medium ${t.muted}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    {text(content, "attribution")}
                  </a>
                ) : (
                  text(content, "attribution")
                )}
              </footer>
            )}
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Statistics ─── */
export function StatsSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "parchment");
  const items = list(content, "items").filter((x) => text(x, "value"));
  if (!items.length) return null;
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mb-10">
          <Heading content={content} t={t} isFirst={isFirst} />
        </Reveal>
        <ul className={`grid border-y md:grid-cols-3 ${t.rule}`}>
          {items.map((s, i) => (
            <Reveal as="li" key={i} delay={i * 0.06} className={`border-b py-10 last:border-b-0 md:border-b-0 md:border-r md:px-10 md:first:pl-0 md:last:border-r-0 ${t.rule}`}>
              <p className={`display text-[clamp(3.4rem,6vw,5.4rem)] ${t.accent}`}>
                {text(s, "value")}
                {text(s, "unit") && <span className={`ml-2 font-sans text-lg font-medium tracking-normal ${t.muted}`}>{text(s, "unit")}</span>}
              </p>
              <p className={`mt-5 max-w-[34ch] leading-relaxed ${t.dark ? "text-parchment/90" : "text-charcoal-2"}`}>{text(s, "label")}</p>
              {text(s, "source") && (
                <a href={text(s, "sourceUrl") || undefined} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-block text-[13px] underline underline-offset-4 ${t.muted}`}>
                  {text(s, "source")}
                </a>
              )}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── Feature list ─── */
export function FeatureListSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "parchment");
  const items = list(content, "items").filter((x) => text(x, "title"));
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <Heading content={content} t={t} isFirst={isFirst} className="text-[clamp(2.4rem,4.4vw,4.4rem)]" />
          {text(content, "intro") && <p className={`mt-6 text-lg leading-relaxed ${t.muted}`}>{text(content, "intro")}</p>}
        </Reveal>
        <ol className="lg:col-span-7 lg:col-start-6">
          {items.map((x, i) => (
            <Reveal as="li" key={i} delay={i * 0.04}>
              <div className={`grid grid-cols-[3.5rem_1fr] gap-x-4 border-t py-7 ${t.rule}`}>
                <span className={`display text-[2.2rem] leading-none ${t.dark ? "text-parchment/30" : "text-charcoal/25"}`}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className={`serif text-2xl ${t.heading}`}>{text(x, "title")}</h3>
                  {text(x, "body") && <p className={`mt-2 leading-relaxed ${t.muted}`}>{text(x, "body")}</p>}
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Rich text ─── */
export function RichTextSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "parchment");
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mx-auto max-w-[64ch]">
          <Heading content={content} t={t} isFirst={isFirst} className="text-[clamp(2.4rem,4.6vw,4.6rem)]" />
          <Rich html={text(content, "body")} t={t} className="mt-8" />
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Split ─── */
export function SplitSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "paper");
  const cta = link(content, "cta");
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mb-10">
          <Heading content={content} t={t} isFirst={isFirst} />
        </Reveal>
        <div className="grid gap-12 md:grid-cols-2">
          <Rich html={text(content, "left")} t={t} />
          <Rich html={text(content, "right")} t={t} />
        </div>
        {cta && (
          <div className="mt-10">
            <ButtonLink href={cta.href} variant={t.dark ? "light" : "solid"} external={isExternal(cta.href)}>
              {cta.label}
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Partners ─── */
export function PartnersSection({ content, background, isFirst }: Props) {
  const t = themeClass(background, "paper");
  const partners = list(content, "partners").filter((x) => text(x, "name"));
  if (!partners.length) return null;
  return (
    <section className={`${t.section} ${pad(isFirst)}`}>
      <div className="shell">
        <Reveal className="mb-10">
          <Heading content={content} t={t} isFirst={isFirst} />
          {text(content, "intro") && <p className={`mt-6 max-w-[50ch] text-lg ${t.muted}`}>{text(content, "intro")}</p>}
        </Reveal>
        <ul className={`grid grid-cols-2 gap-px md:grid-cols-4 ${t.dark ? "bg-parchment/15" : "bg-rule"}`}>
          {partners.map((p, i) => {
            const logo = image(p, "logo");
            const inner = logo ? (
              <div className="relative h-16 w-full">
                <Image src={logo.src} alt={logo.alt || text(p, "name")} fill sizes="200px" className="object-contain" />
              </div>
            ) : (
              <span className={`serif text-xl ${t.heading}`}>{text(p, "name")}</span>
            );
            return (
              <li key={i} className={`flex min-h-32 items-center justify-center p-8 ${t.dark ? "bg-forest" : "bg-paper"}`}>
                {text(p, "url") ? (
                  <a href={text(p, "url")} target="_blank" rel="noopener noreferrer" className="flex w-full justify-center" aria-label={`${text(p, "name")} (opens in a new tab)`}>
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
