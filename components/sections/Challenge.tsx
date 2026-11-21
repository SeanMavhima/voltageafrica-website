import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { image, list, text, type C } from "@/lib/cms/content";
import type { Media } from "@/lib/cms/types";

export function Challenge({ content, media, isFirst = false }: { content: C; media: Media | null; isFirst?: boolean }) {
  const stats = list(content, "stats").map((x) => ({ value: text(x, "value"), unit: text(x, "unit"), label: text(x, "label"), source: text(x, "source"), href: text(x, "sourceUrl") }));
  const [lead, ...rest] = stats;
  const beyondLighting = list(content, "beyond").map((x) => ({ title: text(x, "title"), body: text(x, "body") }));
  const c = { kicker: text(content, "kicker"), interlude: text(content, "interlude"), body: text(content, "body"), beyond: text(content, "beyondTitle"), beyondKicker: text(content, "beyondKicker") };
  const photo = media ?? (image(content, "image") as Media | null);
  const H = isFirst ? "h1" : "h2";
  return (
    <section aria-labelledby="challenge-title" className="relative bg-parchment">
      {/* Photographic interlude */}
      <div className="on-dark relative isolate flex min-h-[92svh] items-end overflow-hidden">
        {photo?.src && <Image src={photo.src} alt={photo.alt} fill sizes="100vw" className="-z-10 object-cover object-[50%_55%]" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal/85 via-charcoal/45 to-charcoal/10" aria-hidden />
        <div className="shell w-full pb-[clamp(3rem,8vw,6rem)] pt-40">
          <p className="kicker text-parchment/85">{c.kicker}</p>
          <Reveal>
            <H id="challenge-title" className="display mt-6 max-w-[17ch] text-[clamp(2.8rem,6.6vw,7rem)] text-parchment">
              <Accent text={c.interlude} className="text-amber" />
            </H>
          </Reveal>
          <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal delay={0.1}>
              <p className="max-w-[54ch] text-lg leading-relaxed text-parchment/90">{c.body}</p>
            </Reveal>
            <PhotoCredit photo={photo} tone="light" />
          </div>
        </div>
      </div>

      {/* Figures */}
      {(lead || beyondLighting.length > 0) && (
      <div className="shell py-[clamp(5rem,11vw,10rem)]">
        {lead && (
        <>
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="display text-[clamp(7rem,24vw,23rem)] leading-[0.78] tracking-[-0.05em] text-charcoal">
              {lead.value}
              <span className="ml-4 align-top font-sans text-[clamp(1.25rem,2.4vw,2.2rem)] font-medium tracking-normal text-amber-ink">{lead.unit}</span>
            </p>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4">
            <p className="serif text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.2] text-charcoal">{lead.label}</p>
            <a href={lead.href || undefined} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm text-stone underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
              {lead.source} <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Reveal>
        </div>

        <ul className="mt-20 grid border-y border-rule md:grid-cols-3">
          {rest.map((s, i) => (
            <Reveal as="li" key={s.label} delay={i * 0.08} className="border-b border-rule py-10 last:border-b-0 md:border-b-0 md:border-r md:px-10 md:first:pl-0 md:last:border-r-0">
              <p className="display text-[clamp(3.6rem,6vw,5.6rem)] text-forest">
                {s.value}
                <span className="ml-2 font-sans text-lg font-medium tracking-normal text-stone">{s.unit}</span>
              </p>
              <p className="mt-5 max-w-[34ch] leading-relaxed text-charcoal-2">{s.label}</p>
              <a href={s.href || undefined} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-[13px] leading-snug text-stone underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
                {s.source} <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Reveal>
          ))}
        </ul>

        </>
        )}
        {/* Beyond lighting */}
        <div className="mt-[clamp(5rem,10vw,9rem)] grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="kicker text-amber-ink">{c.beyondKicker}</p>
            <p className="display mt-6 text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1.02] text-charcoal">{c.beyond}</p>
          </Reveal>
          <ol className="grid gap-x-12 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {beyondLighting.map((b, i) => (
              <Reveal as="li" key={b.title} delay={(i % 2) * 0.06} className="border-t border-rule py-7">
                <div className="flex items-baseline gap-4">
                  <span className="mono text-stone">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="serif text-2xl text-charcoal">{b.title}</h3>
                    <p className="mt-2 leading-relaxed text-stone">{b.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
      )}
    </section>
  );
}
