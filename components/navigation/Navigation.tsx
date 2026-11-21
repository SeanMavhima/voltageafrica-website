"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeartHandshake } from "lucide-react";
import { LogoSwap } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { LinkValue, NavItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

/** The funding band on /support. Its button goes to the payment page once one is set in the CMS. */
const DONATE_HREF = "/support#donate";

function DonateButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href={DONATE_HREF}
      onClick={onClick}
      className={cn(
        "group inline-flex h-11 items-center gap-2 whitespace-nowrap bg-amber px-3.5 text-[0.8125rem] font-semibold text-charcoal transition-colors duration-300 hover:bg-charcoal hover:text-parchment sm:px-5",
        className,
      )}
    >
      <HeartHandshake className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-110" aria-hidden />
      Donate
    </Link>
  );
}

export function Navigation({ items: nav, cta, secondary = null, engage = [] }: { items: NavItem[]; cta: LinkValue; secondary?: LinkValue | null; engage?: NavItem[] }) {
  const contactHref = cta.href;
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // Over a dark opening section (the homepage photograph, or a forest/charcoal band such as the
  // donate band on /support) the bar is transparent with parchment type. Detected from the page
  // itself so it stays correct when editors reorder sections in the CMS.
  const [darkTop, setDarkTop] = useState(false);
  useEffect(() => {
    const first = document.querySelector("#main > [data-section]")?.firstElementChild;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkTop(!!first?.matches(".on-forest, .on-dark"));
  }, [pathname]);
  const onPhoto = (pathname === "/" || darkTop) && !scrolled && !open;
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 600 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The full-screen microgrid has its own minimal chrome.
  if (pathname === "/microgrid") return null;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-charcoal focus:px-4 focus:py-2 focus:text-parchment">
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-expo)] print:hidden",
          onPhoto && "on-dark",
          scrolled && !open ? "border-b border-rule bg-parchment/90 backdrop-blur-lg" : "border-b border-transparent",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
          <Link href="/" aria-label="VoltageAfrica home" className="relative z-10 py-2" onClick={() => setOpen(false)}>
            <LogoSwap show={onPhoto ? "reverse" : "primary"} height={22} priority className="sm:hidden" />
            <LogoSwap show={onPhoto ? "reverse" : "primary"} height={26} priority className="hidden sm:block md:hidden" />
            <LogoSwap show={onPhoto ? "reverse" : "primary"} height={32} priority className="hidden md:block" />
          </Link>

          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-5 2xl:gap-7">
              {nav.map((n) => {
                const current = isCurrent(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      target={n.external ? "_blank" : undefined}
                      rel={n.external ? "noopener noreferrer" : undefined}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "relative whitespace-nowrap text-[0.875rem] font-medium transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:bg-amber after:transition-all after:duration-500",
                        current ? "after:w-full" : "after:w-0 hover:after:w-full",
                        onPhoto ? "text-parchment/90 hover:text-parchment" : current ? "text-charcoal" : "text-charcoal-2 hover:text-charcoal",
                      )}
                    >
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* On phones the theme toggle lives in the menu, leaving room for Donate. */}
            <span className="hidden sm:block">
              <ThemeToggle tone={onPhoto ? "light" : "auto"} className="relative z-10" />
            </span>
            {secondary && (
              <Link
                href={secondary.href}
                aria-current={isCurrent(secondary.href) ? "page" : undefined}
                className={cn(
                  "mr-2 hidden whitespace-nowrap text-[0.8125rem] font-medium underline decoration-amber decoration-2 underline-offset-[6px] transition-colors 2xl:block",
                  onPhoto ? "text-parchment/90 hover:text-parchment" : "text-charcoal-2 hover:text-charcoal",
                )}
              >
                {secondary.label}
              </Link>
            )}
            {/* With the full desktop nav, "Get in touch" becomes a text link so Donate fits beside it. */}
            <Link
              href={contactHref}
              aria-current={isCurrent(contactHref) ? "page" : undefined}
              className={cn(
                "mr-1 hidden whitespace-nowrap text-[0.8125rem] font-medium underline decoration-rule-strong decoration-1 underline-offset-[6px] transition-colors hover:decoration-amber xl:block",
                onPhoto ? "text-parchment/90 hover:text-parchment" : "text-charcoal-2 hover:text-charcoal",
              )}
            >
              {cta.label}
            </Link>
            <span className="hidden md:block xl:hidden">
              <ButtonLink href={contactHref} variant={onPhoto ? "light" : "solid"} className="min-h-11 text-[0.8125rem]">
                {cta.label}
              </ButtonLink>
            </span>
            <DonateButton className="relative z-10 max-[359px]:hidden" onClick={() => setOpen(false)} />
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="relative z-10 flex h-11 w-11 items-center justify-center xl:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden className="relative block h-3 w-6">
                <span className={cn("absolute left-0 top-0 h-px w-6 transition-[transform,background-color] duration-500", onPhoto ? "bg-parchment" : "bg-charcoal", open && "translate-y-1.5 rotate-45")} />
                <span className={cn("absolute bottom-0 left-0 h-px w-6 transition-[transform,background-color] duration-500", onPhoto ? "bg-parchment" : "bg-charcoal", open && "-translate-y-1.5 -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-parchment pt-[4.5rem] xl:hidden"
          >
            <nav aria-label="Mobile" className="shell flex flex-1 flex-col justify-center">
              <ol className="flex flex-col">
                {nav.map((n, i) => (
                  <motion.li
                    key={n.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-rule"
                  >
                    <Link href={n.href} target={n.external ? "_blank" : undefined} rel={n.external ? "noopener noreferrer" : undefined} onClick={() => setOpen(false)} aria-current={isCurrent(n.href) ? "page" : undefined} className="flex items-baseline gap-5 py-3.5">
                      <span className="mono text-stone">0{i + 1}</span>
                      <span className={cn("display text-[2.3rem]", isCurrent(n.href) ? "text-forest" : "text-charcoal")}>{n.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
              {engage.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + nav.length * 0.05, duration: 0.6 }} className="mt-8">
                  <p className="kicker text-stone">Get involved</p>
                  <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {engage.map((n) => (
                      <li key={n.id}>
                        <Link href={n.href} onClick={() => setOpen(false)} aria-current={isCurrent(n.href) ? "page" : undefined} className="serif text-xl text-charcoal underline decoration-amber decoration-2 underline-offset-[6px]">
                          {n.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <ButtonLink href={DONATE_HREF} variant="amber" onClick={() => setOpen(false)}>
                  Donate to the pilot
                </ButtonLink>
                <ButtonLink href={contactHref} variant="outline" onClick={() => setOpen(false)}>
                  {cta.label}
                </ButtonLink>
                <span className="flex items-center gap-3 sm:hidden">
                  <ThemeToggle />
                  <span className="text-sm text-stone">Light / dark</span>
                </span>
              </div>
            </nav>
            <p className="shell kicker pb-8 text-stone">Intelligent energy infrastructure for Africa</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
