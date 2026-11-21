import Image from "next/image";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "@/components/ui/SocialIcons";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/ui/Accent";
import { bool, text, type C } from "@/lib/cms/content";
import { sanitizeRichText } from "@/lib/cms/sanitize";
import type { Person } from "@/lib/cms/types";

const ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = { LinkedIn: LinkedInIcon, Instagram: InstagramIcon, Facebook: FacebookIcon };

export function Founder({ content, founder, team, isFirst = false }: { content: C; founder: Person | null; team: Person[]; isFirst?: boolean }) {
  const c = { kicker: text(content, "kicker"), headline: text(content, "headline") };
  const H = isFirst ? "h1" : "h2";
  if (!founder) return null;
  return (
    <section aria-labelledby="founder-title" className="relative overflow-hidden bg-parchment pb-[clamp(6rem,12vw,10rem)]">
      {/* Pull quote */}
      {founder.quote && (
      <div className="border-y border-rule bg-paper">
        <div className="shell py-[clamp(4rem,9vw,8rem)]">
          <p className="kicker text-amber-ink">{c.kicker}</p>
          <Reveal>
            <blockquote className="mt-8">
              <p className="display max-w-[22ch] text-[clamp(2.4rem,5.6vw,5.8rem)] leading-[1.02] text-charcoal">
                <span className="text-amber" aria-hidden>
                  &ldquo;
                </span>
                {founder.quote}
                <span className="text-amber" aria-hidden>
                  &rdquo;
                </span>
              </p>
              <footer className="mt-8">
                <a href={founder.quoteSource?.href || undefined} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-stone underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
                  {founder.quoteSource?.label} <span className="sr-only">(opens in a new tab)</span>
                </a>
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </div>
      )}

      <div className="shell mt-[clamp(4rem,8vw,7rem)] grid gap-14 lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-12 lg:col-span-6">
          <div>
            <Reveal>
              <H id="founder-title" className="display text-[clamp(2.4rem,4.6vw,4.6rem)] text-charcoal">
                <Accent text={c.headline} className="text-forest" />
              </H>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-10 space-y-5 text-lg leading-relaxed text-charcoal-2 [&_a]:underline [&_h3]:serif [&_h3]:text-2xl [&_li]:ml-5 [&_li]:list-disc" dangerouslySetInnerHTML={{ __html: sanitizeRichText(founder.bio) }} />
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <span className="kicker text-stone">Connect</span>
              {founder.socialLinks.map(({ url: href, label }) => {
                const Icon = ICONS[label];
                return (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium text-charcoal hover:text-forest">
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="link-underline">{label}</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                );
              })}
            </div>
          </Reveal>
        </div>

        <Reveal className="lg:col-span-5 lg:col-start-8">
          <figure>
            <div className="relative aspect-[4/5] overflow-hidden bg-parchment-3">
              {founder.image?.src && <Image src={founder.image.src} alt={founder.image.alt} fill sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover object-[50%_22%]" />}
            </div>
            <figcaption className="mt-4 flex items-baseline justify-between gap-4">
              <span className="serif text-xl text-charcoal">{founder.name}</span>
              <span className="kicker text-stone">{[founder.role, founder.country].filter(Boolean).join(" · ")}</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>

      {bool(content, "showTeam", true) && team.length > 0 && (
      <Reveal className="shell mt-24">
        <p id="team" className="kicker scroll-mt-28 text-stone">{text(content, "teamTitle", "The team")}</p>
        <ul className="mt-5 grid border-t-2 border-charcoal sm:grid-cols-2 lg:grid-cols-4">
          {[founder, ...team].map((m) => (
            <li key={m.id} className="border-b border-rule py-6 sm:pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
              <p className="serif text-2xl text-charcoal">{m.name}</p>
              <p className="mt-1 text-charcoal-2">{m.role}</p>
              <p className="kicker mt-3 text-stone">{m.country}</p>
            </li>
          ))}
        </ul>
      </Reveal>
      )}
    </section>
  );
}
