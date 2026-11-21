import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * solid   — charcoal slab, the default call to action on light surfaces
 * amber   — solar slab, for the single most important action on a view
 * light   — parchment slab, for photography and forest sections
 * outline — quiet secondary action
 * line    — text link with a ringed arrow
 */
type Variant = "solid" | "amber" | "light" | "outline" | "line" | "line-light";

const base =
  "group relative inline-flex min-h-12 items-center gap-4 select-none whitespace-nowrap text-[0.9375rem] font-medium tracking-[-0.005em] transition-[background-color,color,border-color] duration-300 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  solid: "bg-charcoal text-parchment pl-6 pr-2 hover:bg-forest",
  amber: "bg-amber text-charcoal pl-6 pr-2 hover:bg-charcoal hover:text-parchment",
  light: "bg-parchment text-charcoal pl-6 pr-2 hover:bg-amber",
  outline: "border border-charcoal/30 text-charcoal pl-6 pr-2 hover:border-charcoal hover:bg-charcoal hover:text-parchment",
  line: "text-charcoal pr-1",
  "line-light": "text-parchment pr-1",
};

function Glyph({ variant, external }: { variant: Variant; external?: boolean }) {
  const Icon = external ? ArrowUpRight : ArrowRight;
  if (variant === "line" || variant === "line-light") {
    return (
      <span
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300",
          variant === "line"
            ? "border-charcoal/25 group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-parchment"
            : "border-parchment/40 group-hover:border-amber group-hover:bg-amber group-hover:text-charcoal",
        )}
      >
        <Icon className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0.5" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300",
        variant === "solid" ? "bg-amber text-charcoal" : variant === "amber" ? "bg-charcoal text-amber group-hover:bg-amber group-hover:text-charcoal" : variant === "light" ? "bg-charcoal text-parchment" : "bg-charcoal/[0.07] group-hover:bg-parchment group-hover:text-charcoal",
      )}
    >
      <Icon className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0.5" aria-hidden />
    </span>
  );
}

type LinkProps = { href: string; variant?: Variant; children: ReactNode; className?: string; external?: boolean } & Omit<
  ComponentProps<"a">,
  "href" | "className" | "children"
>;

export function ButtonLink({ href, variant = "solid", children, className, external, ...rest }: LinkProps) {
  const cls = cn(base, variants[variant], className);
  const inner = (
    <>
      <span className={variant.startsWith("line") ? "link-underline" : undefined}>{children}</span>
      <Glyph variant={variant} external={external} />
    </>
  );
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {inner}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {inner}
    </Link>
  );
}
