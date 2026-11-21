/**
 * VoltageAfrica logo — the one place the logo is rendered.
 * All files live in /public/brand; replace them there and every page updates.
 *
 *   <Logo />                                     // primary horizontal, for light backgrounds
 *   <Logo tone="reverse" />                      // on charcoal / dark backgrounds
 *   <Logo variant="stacked" height={96} />       // admin sign-in, square formats
 *   <Logo variant="symbol" height={28} />        // admin sidebar, loading state
 */
import Image from "next/image";

export type LogoVariant = "horizontal" | "stacked" | "symbol" | "wordmark";
export type LogoTone = "primary" | "reverse" | "mono-charcoal" | "mono-white" | "on-amber";

// Intrinsic aspect ratios (width / height) of the SVG masters. Never stretch.
const RATIO: Record<LogoVariant, number> = {
  horizontal: 8.3995,
  stacked: 2.8549,
  symbol: 1,
  wordmark: 15.559,
};

// Below these heights the logo loses legibility: use a smaller variant instead.
const MIN_HEIGHT: Record<LogoVariant, number> = {
  horizontal: 16, // ≈ 130 px wide
  stacked: 28,
  symbol: 16,
  wordmark: 8,
};

function src(variant: LogoVariant, tone: LogoTone, height: number) {
  // At 32 px and below the symbol uses its small-size drawing (wider joints) so the gap never closes.
  if (variant === "symbol" && height <= 32 && tone === "primary") return "/brand/symbol-small-primary.svg";
  const base = variant === "symbol" || variant === "wordmark" ? variant : `logo-${variant}`;
  return `/brand/${base}-${tone}.svg`;
}

type Props = {
  variant?: LogoVariant;
  /** "primary" for light backgrounds, "reverse" for charcoal/dark ones. */
  tone?: LogoTone;
  /** Rendered height in px; width always follows the true aspect ratio. */
  height?: number;
  className?: string;
  /** Set on the above-the-fold navigation logo. */
  priority?: boolean;
};

export function Logo({ variant = "horizontal", tone = "primary", height = 34, className, priority }: Props) {
  const h = Math.max(height, MIN_HEIGHT[variant]);
  const w = Math.round(h * RATIO[variant] * 100) / 100;
  return (
    <Image
      src={src(variant, tone, h)}
      alt="VoltageAfrica"
      width={w}
      height={h}
      priority={priority}
      unoptimized // vector files are already optimal
      className={className}
      style={{ width: w, height: h, objectFit: "contain", display: "block", flex: "none" }}
    />
  );
}

export default Logo;
