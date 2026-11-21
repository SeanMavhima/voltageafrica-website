import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Accent } from "@/components/ui/Accent";
import { Reveal } from "@/components/ui/Reveal";
import { themeClass } from "@/components/cms/theme";
import { link, list, tags, text, type C } from "@/lib/cms/content";
import type { Media, SiteSettings } from "@/lib/cms/types";
import { PhotoPlate } from "@/components/ui/PhotoPlate";
import { pathwaysCopy, partnershipCopy, supportCopy } from "@/lib/engagement/copy";
import type { FormCopy } from "./FormKit";
import { PartnershipForm, SupportForm } from "@/components/ui/lazy";

/** Form wording from the CMS, falling back to the defaults for any empty field. */
export { EngagementHeader, SectionPlate };

export function formCopy(c: C, d: { submitLabel: string; successTitle: string; successMessage: string; nextStep: { label: string; href: string } | null; privacyNote: string }): FormCopy {
  return {
    submitLabel: text(c, "submitLabel", d.submitLabel),
    successTitle: text(c, "successTitle", d.successTitle),
    successMessage: text(c, "successMessage", d.successMessage),
    nextStep: link(c, "nextStep") ?? d.nextStep,
    privacyNote: text(c, "privacyNote", d.privacyNote),
  };
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="kicker flex items-center gap-3 text-amber-ink">
      <span className="h-2 w-2 rounded-full bg-amber" aria-hidden />
      {children}
    </p>
  );
}

/** The white sheet the forms sit on. */
export function FormSheet({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id: string }) {
  return (
    <div className="relative border-t-2 border-amber bg-paper p-[clamp(1.5rem,4vw,3.5rem)] shadow-[0_50px_90px_-70px_rgb(36_36_31/0.45)]">
      <h2 id={id} className="serif text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight text-charcoal">
        {title}
      </h2>
      {description && <p className="mt-3 max-w-[52ch] leading-relaxed text-stone">{description}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function sectionPad(isFirst: boolean) {
  return isFirst ? "pt-[clamp(8rem,16vw,11.5rem)] pb-[clamp(5rem,10vw,8rem)]" : "py-[clamp(5rem,10vw,8rem)]";
}

/* ═════════════════════════ Partner with us ═════════════════════════ */

/** Headline row shared by the engagement pages. */
function EngagementHeader({ id, H, kicker, headline, children }: { id: string; H: "h1" | "h2"; kicker: string; headline: string; children: ReactNode }) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
      <Reveal className="lg:col-span-7">
        <Kicker>{kicker}</Kicker>
        <H id={id} className="display mt-6 text-[clamp(3rem,6.4vw,6.6rem)] text-charcoal">
          <Accent text={headline} className="text-forest" />
        </H>
      </Reveal>
      <Reveal delay={0.08} className="lg:col-span-5">
        {children}
      </Reveal>
    </div>
  );
}

function SectionPlate({ media, content: c, aspect, priority }: { media: Media | null; content: C; aspect: "wide" | "banner"; priority: boolean }) {
  if (!media) return null;
  return <PhotoPlate media={media} caption={text(c, "imageCaption") || null} position={text(c, "imagePosition") || null} aspect={aspect} figure="Fig. 01" priority={priority} className="mt-[clamp(3rem,6vw,5rem)]" />;
}

export function PartnershipSection({ content: c, media = null, email, isFirst }: { content: C; media?: Media | null; email: string | null; isFirst: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const d = partnershipCopy;
  const types = tags(c, "partnerTypes").length ? tags(c, "partnerTypes") : d.partnerTypes;
  return (
    <section aria-labelledby="partner-title" className={`contour relative bg-parchment ${sectionPad(isFirst)}`}>
      <div className="shell">
        <EngagementHeader id="partner-title" H={H} kicker={text(c, "kicker", d.kicker)} headline={text(c, "headline", d.headline)}>
          <p className="max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{text(c, "intro", d.intro)}</p>
        </EngagementHeader>
        <SectionPlate media={media} content={c} aspect="wide" priority={isFirst} />
      </div>
      <div className="shell mt-[clamp(3.5rem,7vw,6rem)] grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-28">
          {text(c, "body", d.body) && (
            <Reveal>
              <p className="max-w-[50ch] leading-relaxed text-stone">{text(c, "body", d.body)}</p>
            </Reveal>
          )}
          <Reveal delay={0.08} className="mt-12">
            <p className="kicker text-stone">{text(c, "partnerTypesTitle", d.partnerTypesTitle)}</p>
            <ul className="mt-4 grid border-t-2 border-charcoal sm:grid-cols-2 sm:gap-x-8">
              {types.map((t, i) => (
                <li key={t} className="flex items-baseline gap-3 border-b border-rule py-2.5 text-[0.9375rem] text-charcoal-2">
                  <span className="mono w-5 shrink-0 text-stone-2">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ul>
            {email && (
              <p className="mt-8 text-sm text-stone">
                Prefer email?{" "}
                <a href={`mailto:${email}`} className="font-medium text-charcoal underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
                  {email}
                </a>
              </p>
            )}
          </Reveal>
        </div>
        <Reveal delay={0.12} className="lg:col-span-7">
          <FormSheet id="partner-form-title" title={text(c, "formTitle", d.formTitle)} description={text(c, "formDescription", d.formDescription)}>
            <PartnershipForm copy={formCopy(c, d)} consentLabel={text(c, "consentLabel", d.consentLabel)} />
          </FormSheet>
        </Reveal>
      </div>
    </section>
  );
}

/* ═════════════════════════ Support ═════════════════════════ */

export function SupportSection({ content: c, media = null, email, isFirst }: { content: C; media?: Media | null; email: string | null; isFirst: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const d = supportCopy;
  const areas = list(c, "areas").filter((a) => text(a, "title"));
  const shown = areas.length ? areas.map((a) => ({ title: text(a, "title"), body: text(a, "body") })) : d.areas;
  return (
    <section aria-labelledby="support-title" className={`contour relative bg-parchment ${sectionPad(isFirst)}`}>
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <Kicker>{text(c, "kicker", d.kicker)}</Kicker>
            <H id="support-title" className="display mt-6 text-[clamp(3rem,6vw,6.2rem)] text-charcoal">
              <Accent text={text(c, "headline", d.headline)} className="text-forest" />
            </H>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="max-w-[46ch] text-lg leading-relaxed text-charcoal-2">{text(c, "intro", d.intro)}</p>
            {text(c, "body", d.body) && <p className="mt-5 max-w-[50ch] leading-relaxed text-stone">{text(c, "body", d.body)}</p>}
          </Reveal>
        </div>
        <SectionPlate media={media} content={c} aspect="wide" priority={isFirst} />

        <div className="mt-[clamp(3.5rem,7vw,6rem)] grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-28">
            <Reveal>
              <p className="kicker text-stone">{text(c, "areasTitle", d.areasTitle)}</p>
              <ol className="mt-4 border-t-2 border-charcoal">
                {shown.map((a, i) => (
                  <li key={a.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-rule py-4">
                    <span className="mono pt-1 text-stone-2">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="serif text-[1.25rem] leading-snug text-charcoal">{a.title}</p>
                      {a.body && <p className="mt-1 text-[0.9375rem] leading-relaxed text-stone">{a.body}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.08} className="mt-10">
              <aside aria-labelledby="support-notice" className="border border-charcoal/20 bg-paper/70 p-6">
                <p id="support-notice" className="kicker text-amber-ink">
                  {text(c, "noticeTitle", d.noticeTitle)}
                </p>
                <p className="mt-3 leading-relaxed text-charcoal-2">{text(c, "notice", d.notice)}</p>
                {email && (
                  <p className="mt-4 text-sm text-stone">
                    Questions first?{" "}
                    <a href={`mailto:${email}`} className="font-medium text-charcoal underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
                      {email}
                    </a>
                  </p>
                )}
              </aside>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="lg:col-span-7">
            <FormSheet id="support-form-title" title={text(c, "formTitle", d.formTitle)} description={text(c, "formDescription", d.formDescription)}>
              <SupportForm copy={formCopy(c, d)} consentLabel={text(c, "consentLabel", d.consentLabel)} paymentNote={text(c, "paymentNote", d.paymentNote)} />
            </FormSheet>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════ Engagement pathways (CTA) ═════════════════════════ */

export function EngagementPaths({ content: c, background, isFirst }: { content: C; background?: string; isFirst: boolean }) {
  const H = isFirst ? "h1" : "h2";
  const t = themeClass(background, "paper");
  const d = pathwaysCopy;
  const raw = list(c, "items").filter((i) => text(i, "title") && text(i, "href"));
  const items = raw.length ? raw.map((i) => ({ title: text(i, "title"), body: text(i, "body"), label: text(i, "label", "Learn more"), href: text(i, "href") })) : d.items;
  return (
    <section aria-labelledby="paths-title" className={`${t.section} py-[clamp(5rem,10vw,8rem)]`}>
      <div className="shell">
        <div className={`flex flex-wrap items-end justify-between gap-6 border-b-2 pb-6 ${t.dark ? "border-parchment/60" : "border-charcoal"}`}>
          <Reveal>
            {text(c, "kicker", d.kicker) && <p className={`kicker ${t.kicker}`}>{text(c, "kicker", d.kicker)}</p>}
            <H id="paths-title" className={`display mt-5 max-w-[18ch] text-[clamp(2.6rem,5vw,4.8rem)] ${t.heading}`}>
              <Accent text={text(c, "headline", d.headline)} className={t.accent} />
            </H>
          </Reveal>
          {text(c, "intro") && <p className={`max-w-[42ch] leading-relaxed ${t.muted}`}>{text(c, "intro")}</p>}
        </div>
        <ul className="grid md:grid-cols-3">
          {items.map((it, i) => (
            <Reveal as="li" key={it.href + i} delay={i * 0.06} className={`border-b md:border-b-0 ${t.rule} ${i > 0 ? `md:border-l md:pl-8` : ""} ${i < items.length - 1 ? "md:pr-8" : ""}`}>
              <Link href={it.href} className="group flex h-full flex-col py-8 md:py-10">
                <span className={`mono ${t.muted}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={`display mt-4 text-[clamp(1.9rem,2.6vw,2.6rem)] transition-colors ${t.heading} ${t.dark ? "group-hover:text-amber" : "group-hover:text-forest"}`}>{it.title}</span>
                {it.body && <span className={`mt-3 max-w-[36ch] leading-relaxed ${t.muted}`}>{it.body}</span>}
                <span className={`mt-auto inline-flex items-center gap-3 pt-8 text-[0.9375rem] font-medium ${t.heading}`}>
                  <span className="link-underline">{it.label}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${t.dark ? "border-parchment/40 group-hover:border-amber group-hover:bg-amber group-hover:text-charcoal" : "border-charcoal/25 group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-amber"}`}>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ═════════════════════════ Contact details ═════════════════════════ */

export function ContactDetails({ settings, title }: { settings: Pick<SiteSettings, "contactEmail" | "contactPhone" | "contactLocation" | "socialLinks">; title: string }) {
  const rows: { label: string; node: ReactNode }[] = [];
  if (settings.contactEmail)
    rows.push({
      label: "Email",
      node: (
        <a href={`mailto:${settings.contactEmail}`} className="underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
          {settings.contactEmail}
        </a>
      ),
    });
  if (settings.contactPhone)
    rows.push({
      label: "Phone",
      node: (
        <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
          {settings.contactPhone}
        </a>
      ),
    });
  if (settings.contactLocation) rows.push({ label: "Based in", node: settings.contactLocation });
  if (settings.socialLinks.length)
    rows.push({
      label: "Follow",
      node: (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {settings.socialLinks.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
              {s.label}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </span>
      ),
    });
  if (!rows.length) return null;
  return (
    <div>
      <p className="kicker text-stone">{title}</p>
      <dl className="mt-4 border-t-2 border-charcoal">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-rule py-3.5">
            <dt className="mono pt-1 uppercase text-stone">{r.label}</dt>
            <dd className="min-w-0 font-medium text-charcoal [overflow-wrap:anywhere]">{r.node}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
