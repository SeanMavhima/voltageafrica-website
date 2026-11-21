import Link from "next/link";

import { Accent } from "@/components/ui/Accent";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "@/components/ui/SocialIcons";
import type { Media, NavItem, SiteSettings } from "@/lib/cms/types";

const ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = { LinkedIn: LinkedInIcon, Instagram: InstagramIcon, Facebook: FacebookIcon };

export function Footer({ settings, links, engage = [], credits }: { settings: SiteSettings; links: NavItem[]; engage?: NavItem[]; credits: Media[] }) {
  const year = new Date().getFullYear();
  const copyright = (settings.footerCopyright || `© {year} ${settings.siteName}.`).replace("{year}", String(year));
  return (
    <footer className="relative overflow-hidden bg-parchment-2 text-charcoal print:hidden">
      <div className="shell pt-24">
        <div className="grid gap-14 md:grid-cols-12">
          <div className={engage.length ? "md:col-span-4" : "md:col-span-5"}>
            {settings.footerStatement && (
              <p className="display max-w-[16ch] text-[clamp(2.2rem,3.8vw,3.6rem)] leading-[1.02]">
                <Accent text={settings.footerStatement} className="text-forest" />
              </p>
            )}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="mt-8 inline-block text-lg font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-charcoal">
                {settings.contactEmail}
              </a>
            )}
          </div>
          {links.length > 0 && (
            <nav aria-label="Footer" className={engage.length ? "md:col-span-2 md:col-start-6" : "md:col-span-3 md:col-start-7"}>
              <p className="kicker mb-5 text-stone">Explore</p>
              <ul className="space-y-2.5">
                {links.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      target={n.external ? "_blank" : undefined}
                      rel={n.external ? "noopener noreferrer" : undefined}
                      className="link-underline font-medium text-charcoal-2 hover:text-charcoal"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {engage.length > 0 && (
            <nav aria-label="Get involved" className="md:col-span-2">
              <p className="kicker mb-5 text-stone">Get involved</p>
              <ul className="space-y-2.5">
                {engage.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} target={n.external ? "_blank" : undefined} rel={n.external ? "noopener noreferrer" : undefined} className="link-underline font-medium text-charcoal-2 hover:text-charcoal">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="md:col-span-3">
            {settings.socialLinks.length > 0 && (
              <>
                <p className="kicker mb-5 text-stone">Follow</p>
                <div className="flex flex-wrap gap-2">
                  {settings.socialLinks.map(({ label, url }) => {
                    const Icon = ICONS[label];
                    return (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label} (opens in a new tab)`}
                        className="flex h-11 min-w-11 items-center justify-center rounded-full border border-charcoal/25 px-3 text-sm font-medium transition-colors hover:border-charcoal hover:bg-charcoal hover:text-parchment"
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : label}
                      </a>
                    );
                  })}
                </div>
              </>
            )}
            {credits.length > 0 && (
              <>
                <p className="kicker mb-3 mt-10 text-stone">Photography</p>
                <ul className="space-y-2 text-[12px] leading-snug text-stone">
                  {credits.map((p) => (
                    <li key={p.id ?? p.src}>
                      {p.caption ? `${p.caption}: ` : ""}
                      <a href={p.credit!.source} target="_blank" rel="noopener noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-charcoal">
                        {p.credit!.author}
                      </a>
                      {p.credit!.license && (
                        <>
                          ,{" "}
                          <a href={p.credit!.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-charcoal">
                            {p.credit!.license}
                          </a>
                        </>
                      )}
                      .
                    </li>
                  ))}
                  <li>All other photographs: {settings.siteName}.</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-20 pt-16">
        {/* Energy trace runs above the logo, never through it (identity rule: no effects on the mark) */}
        <svg className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 30 H600 L630 8 L660 52 L690 30 H1440" fill="none" stroke="#e8a344" strokeWidth="1.5" className="flow-dash" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="shell relative py-[clamp(1.5rem,3vw,3rem)]">
          {/* The full horizontal logo at monumental scale; the ring's thickness is kept clear on every side. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-primary.svg" alt="" aria-hidden width={739} height={88} loading="lazy" className="show-light block h-auto w-full select-none" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-reverse.svg" alt="" aria-hidden width={739} height={88} loading="lazy" className="show-dark h-auto w-full select-none" draggable={false} />
        </div>
      </div>

      <div className="shell flex flex-col gap-3 border-t border-rule py-6 text-[13px] text-stone sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>{copyright}</span>
          <Link href="/privacy" className="underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
            Privacy policy
          </Link>
          <Link href="/press" className="underline decoration-rule-strong underline-offset-4 hover:text-charcoal">
            Funders &amp; press
          </Link>
        </p>
        <div className="flex items-center gap-5">
          {settings.footerRegions && <p className="kicker">{settings.footerRegions}</p>}
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
