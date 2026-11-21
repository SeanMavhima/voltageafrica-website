/**
 * VoltageAfrica logo ("Closing the Gap" identity, v1.0): the one place the logo is rendered.
 * All files live in /public/brand; replace them there and every page updates.
 *
 *   <Logo />                                  // primary horizontal, for light backgrounds
 *   <Logo tone="reverse" />                   // on charcoal, forest or photography
 *   <Logo variant="stacked" height={96} />    // square formats
 *   <Logo variant="symbol" height={28} />     // admin sidebar, loading state (never spin it)
 *
 * Rules (identity README): never stretch, rotate, recolour the facet or add effects;
 * keep clear space equal to the ring's thickness.
 */
import { cn } from "@/lib/utils";

export type LogoVariant = "horizontal" | "stacked" | "symbol" | "wordmark";
export type LogoTone = "primary" | "reverse" | "mono-charcoal" | "mono-white" | "on-amber";

// Intrinsic aspect ratios (width / height) of the SVG masters.
const RATIO: Record<LogoVariant, number> = { horizontal: 8.3995, stacked: 2.8549, symbol: 1, wordmark: 15.559 };

// Below these heights the logo loses legibility.
const MIN_HEIGHT: Record<LogoVariant, number> = { horizontal: 16, stacked: 28, symbol: 16, wordmark: 8 };

export function logoSrc(variant: LogoVariant, tone: LogoTone, height: number) {
  // At 32 px and below the primary symbol uses its small-size drawing (wider joints) so the gap never closes.
  if (variant === "symbol" && height <= 32 && tone === "primary") return "/brand/symbol-small-primary.svg";
  const base = variant === "symbol" || variant === "wordmark" ? variant : `logo-${variant}`;
  return `/brand/${base}-${tone}.svg`;
}

type Props = {
  variant?: LogoVariant;
  tone?: LogoTone;
  /** Rendered height in px; width always follows the true aspect ratio. */
  height?: number;
  className?: string;
  /** Set on the above-the-fold navigation logo. */
  priority?: boolean;
  /** Decorative use next to a visible name: hide from assistive tech. */
  decorative?: boolean;
};

export function Logo({ variant = "horizontal", tone = "primary", height = 34, className, priority, decorative }: Props) {
  const h = Math.max(height, MIN_HEIGHT[variant]);
  const w = Math.round(h * RATIO[variant] * 100) / 100;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vector files are already optimal
    <img
      src={logoSrc(variant, tone, h)}
      alt={decorative ? "" : "VoltageAfrica"}
      aria-hidden={decorative || undefined}
      width={w}
      height={h}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={cn("block flex-none select-none", className)}
      style={{ width: w, height: h, objectFit: "contain" }}
    />
  );
}

/**
 * Two tones stacked, crossfading: e.g. reverse over the hero photograph, primary once the header turns solid.
 * In the dark theme, globals.css swaps "primary" for the reverse tone (.logo-swap rules).
 */
export function LogoSwap({ show, height, className, priority }: { show: "primary" | "reverse"; height: number; className?: string; priority?: boolean }) {
  return (
    <span data-show={show} className={cn("logo-swap relative block", className)}>
      <Logo tone="primary" height={height} priority={priority} className={cn("logo-primary transition-opacity duration-500", show === "primary" ? "opacity-100" : "opacity-0")} />
      <Logo tone="reverse" height={height} priority={priority} decorative className={cn("logo-reverse absolute inset-0 transition-opacity duration-500", show === "reverse" ? "opacity-100" : "opacity-0")} />
    </span>
  );
}

export default Logo;
