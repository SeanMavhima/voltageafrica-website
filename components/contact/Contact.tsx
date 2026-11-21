import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { ContactDetails, EngagementHeader, FormSheet, SectionPlate, formCopy, sectionPad } from "@/components/engagement/sections";
import { list, tags, text, type C } from "@/lib/cms/content";
import type { Media, SiteSettings } from "@/lib/cms/types";
import { contactCopy } from "@/lib/engagement/copy";
import { ContactForm } from "@/components/ui/lazy";

export function Contact({ content: c, media = null, settings, isFirst = false }: { content: C; media?: Media | null; settings: SiteSettings; isFirst?: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const d = contactCopy;
  const audiences = tags(c, "audiences");
  const rawPaths = list(c, "pathways").filter((p) => text(p, "title") && text(p, "href"));
  const pathways = rawPaths.length ? rawPaths.map((p) => ({ title: text(p, "title"), body: text(p, "body"), href: text(p, "href") })) : d.pathways;
  return (
    <section aria-labelledby="contact-title" className={`contour relative bg-parchment ${sectionPad(isFirst)}`}>
      <div className="shell">
        <EngagementHeader id="contact-title" H={H} kicker={text(c, "kicker", d.kicker)} headline={text(c, "headline", d.headline)}>
          <p className="max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{text(c, "intro", d.intro)}</p>
        </EngagementHeader>
        <SectionPlate media={media} content={c} aspect="banner" priority={isFirst} />
      </div>
      <div className="shell mt-[clamp(3.5rem,7vw,6rem)] grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-28">
          {audiences.length > 0 && (
            <Reveal>
              <p className="kicker text-stone">We would love to hear from</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {audiences.map((a) => (
                  <li key={a} className="border border-charcoal/20 px-3 py-1.5 text-sm text-charcoal-2">
                    {a}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          <Reveal delay={0.08} className={`space-y-12 ${audiences.length ? "mt-12" : ""}`}>
            <ContactDetails settings={settings} title={text(c, "detailsTitle", d.detailsTitle)} />
            {pathways.length > 0 && (
              <nav aria-label={text(c, "pathwaysTitle", d.pathwaysTitle)}>
                <p className="kicker text-stone">{text(c, "pathwaysTitle", d.pathwaysTitle)}</p>
                <ul className="mt-4 border-t-2 border-charcoal">
                  {pathways.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} className="group flex items-center justify-between gap-4 border-b border-rule py-4 transition-colors hover:bg-paper/60">
                        <span>
                          <span className="serif block text-xl text-charcoal transition-colors group-hover:text-forest">{p.title}</span>
                          {p.body && <span className="mt-0.5 block text-[0.9375rem] text-stone">{p.body}</span>}
                        </span>
                        <ArrowRight className="mr-2 h-4 w-4 shrink-0 text-charcoal transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </Reveal>
        </div>
        <Reveal delay={0.12} className="lg:col-span-7">
          <FormSheet id="contact-form-title" title={text(c, "formTitle", d.formTitle)} description={text(c, "formDescription", d.formDescription)}>
            <ContactForm copy={formCopy(c, d)} />
          </FormSheet>
        </Reveal>
      </div>
    </section>
  );
}
