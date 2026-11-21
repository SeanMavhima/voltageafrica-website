import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { PhotoPlate } from "@/components/ui/PhotoPlate";
import { list, text, type C } from "@/lib/cms/content";
import type { Media } from "@/lib/cms/types";

/** The opening of an inner page: title, one-sentence purpose, an index of what's on it, and an optional photo plate. */
export function PageIntro({ content, media = null, isFirst = true }: { content: C; media?: Media | null; isFirst?: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const index = list(content, "index").filter((i) => text(i, "anchor") && text(i, "label"));
  return (
    <header className="contour relative bg-parchment pb-[clamp(3.5rem,7vw,6rem)] pt-[clamp(8rem,18vh,12rem)]">
      <div className="shell">
        <Reveal>
          {text(content, "kicker") && (
            <p className="kicker flex items-center gap-3 text-amber-ink">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden />
              {text(content, "kicker")}
            </p>
          )}
          <H className="display mt-6 max-w-[16ch] text-[clamp(3.2rem,8.2vw,8.6rem)] text-charcoal">
            <Accent text={text(content, "headline")} className="text-forest" />
          </H>
        </Reveal>
        <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
          {text(content, "intro") && (
            <Reveal delay={0.1} className="md:col-span-6">
              <p className="max-w-[50ch] text-lg leading-relaxed text-charcoal-2">{text(content, "intro")}</p>
            </Reveal>
          )}
          {index.length > 0 && (
            <Reveal delay={0.15} className="md:col-span-5 md:col-start-8">
              <nav aria-label="On this page">
                <p className="kicker text-stone">On this page</p>
                <ol className="mt-3 border-t-2 border-charcoal">
                  {index.map((s, i) => (
                    <li key={i}>
                      <a href={`#${text(s, "anchor")}`} className="group flex items-baseline gap-4 border-b border-rule py-3 transition-colors hover:bg-paper">
                        <span className="mono text-stone">{String(i + 1).padStart(2, "0")}</span>
                        <span className="serif text-xl text-charcoal">{text(s, "label")}</span>
                        <span className="ml-auto pr-2 text-stone transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden>
                          ↓
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </Reveal>
          )}
        </div>
        {media && (
          <PhotoPlate
            media={media}
            caption={text(content, "imageCaption") || null}
            figure={text(content, "figureLabel") || "Fig. 01"}
            position={text(content, "imagePosition") || null}
            priority={isFirst}
            className="mt-[clamp(3rem,6vw,5rem)]"
          />
        )}
      </div>
    </header>
  );
}
