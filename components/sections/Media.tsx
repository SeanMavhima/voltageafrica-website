import Image from "next/image";
import { MediaArchive } from "@/components/media/MediaArchive";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { image, list, text, type C } from "@/lib/cms/content";
import type { Publication } from "@/lib/cms/types";

function Shot({ src, alt, caption, date, className, sizes, position }: { src: string; alt: string; caption: string; date: string; className?: string; sizes: string; position?: string }) {
  return (
    <figure className={className}>
      <div className="group relative h-full min-h-[16rem] overflow-hidden bg-parchment-3">
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-[1.03]" style={{ objectPosition: position }} />
      </div>
      <figcaption className="mt-3 flex justify-between gap-4 text-[13px] leading-snug text-stone">
        <span>{caption}</span>
        <span className="mono shrink-0">{date}</span>
      </figcaption>
    </figure>
  );
}

export function Media({ content, publications, isFirst = false }: { content: C; publications: Publication[]; isFirst?: boolean }) {
  const asPage = isFirst;
  const H = isFirst ? "h1" : "h2";
  const spread = list(content, "spread").map((x) => ({ img: image(x, "image"), caption: text(x, "caption"), date: text(x, "date") })).filter((x) => x.img);
  const community = list(content, "communityImages").map((x) => image(x, "image")).filter((x): x is NonNullable<typeof x> => !!x);
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline"), intro: text(content, "intro") };
  return (
    <section aria-labelledby="media-title" className={`relative bg-parchment pb-[clamp(6rem,12vw,10rem)] ${asPage ? "pt-[clamp(8rem,18vh,12rem)]" : "pt-[clamp(6rem,12vw,10rem)]"}`}>
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="kicker text-amber-ink">{c.kicker}</p>
            <H id="media-title" className="display mt-6 text-[clamp(3rem,7vw,7.2rem)] text-charcoal">
              <Accent text={c.headline} className="text-forest" />
            </H>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:self-end">
            <p className="text-lg leading-relaxed text-charcoal-2">{c.intro}</p>
          </Reveal>
        </div>

        {/* Spread */}
        {spread.length > 0 && (
          <div className="mt-[clamp(3.5rem,7vw,6rem)] grid gap-6 md:grid-cols-12 md:grid-rows-[22rem_18rem]">
            {spread.map((x, i) => (
              <Reveal key={i} delay={i * 0.06} className={i === 0 ? "md:col-span-7 md:row-span-2" : "md:col-span-5"}>
                <Shot className="flex h-full flex-col [&>div]:flex-1" src={x.img!.src} alt={x.img!.alt} caption={x.caption} date={x.date} sizes={i === 0 ? "(min-width: 768px) 56vw, 100vw" : "(min-width: 768px) 40vw, 100vw"} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-24">
          <MediaArchive publications={publications} />
        </div>
      </div>

      {/* Community feature */}
      {community.length > 0 && (
        <div className="mt-[clamp(5rem,10vw,9rem)] grid lg:grid-cols-2">
          <div className="relative min-h-[60vw] lg:min-h-[44rem]">
            <Image src={community[0].src} alt={community[0].alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[50%_45%]" />
          </div>
          <div className="flex flex-col justify-center bg-paper px-[clamp(1rem,5vw,5rem)] py-16">
            <Reveal>
              <p className="kicker text-amber-ink">{text(content, "communityKicker")}</p>
              <h3 className="display mt-5 text-[clamp(2.4rem,4vw,4rem)] leading-[1.0] text-charcoal">
                <Accent text={text(content, "communityTitle")} className="text-forest" />
              </h3>
              <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-charcoal-2">{text(content, "communityBody")}</p>
              {community.length > 1 && (
                <div className="mt-10 grid grid-cols-2 gap-4">
                  {community.slice(1, 3).map((im, i) => (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden bg-parchment-3">
                      <Image src={im.src} alt={im.alt} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        </div>
      )}
    </section>
  );
}
