import Image from "next/image";
import { image, text, type C } from "@/lib/cms/content";
import type { Media, Principle } from "@/lib/cms/types";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

/** The site's one deliberate charcoal section: balance, weight, permanence. */
export function Principles({ content, principles, media, isFirst = false }: { content: C; principles: Principle[]; media: Media | null; isFirst?: boolean }) {
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  const photo = media ?? (image(content, "image") as Media | null);
  const H = isFirst ? "h1" : "h2";
  return (
    <section aria-labelledby="principles-title" className="on-forest relative bg-charcoal text-parchment">
      <div className="grid lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <div className="h-[70vw] max-h-[34rem] lg:sticky lg:top-0 lg:h-[100svh] lg:max-h-none">
            <div className="relative h-full w-full">
            {photo?.src && <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover object-[60%_50%]" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/85 to-transparent p-6 pt-24">
              <PhotoCredit photo={photo} tone="light" />
            </div>
            </div>
          </div>
        </div>
        <div className="px-[clamp(1rem,5vw,5rem)] py-[clamp(5rem,10vw,9rem)] lg:col-span-7">
          <Reveal>
            <p className="kicker text-amber-soft">{c.kicker}</p>
            <H id="principles-title" className="display mt-6 text-[clamp(3.2rem,7vw,7rem)]">
              <Accent text={c.headline} className="text-amber" />
            </H>
            <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-parchment/75">{c.intro}</p>
          </Reveal>
          <ol className="mt-16">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.id} delay={i * 0.04}>
                <div className="group grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-parchment/15 py-8 md:grid-cols-[4.5rem_1fr_1fr] md:gap-x-8">
                  <span className="display text-[2.6rem] leading-none text-parchment/30 transition-colors duration-500 group-hover:text-amber">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display text-[clamp(1.7rem,2.4vw,2.2rem)] leading-[1.05]">{p.title}</h3>
                  <p className="col-start-2 mt-3 leading-relaxed text-parchment/75 md:col-start-3 md:mt-1">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
