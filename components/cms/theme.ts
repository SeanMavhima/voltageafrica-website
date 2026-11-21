/** Background themes an editor can choose for a section. Tokens stay within the design system. */
export type Theme = { section: string; heading: string; accent: string; muted: string; kicker: string; rule: string; dark: boolean };

const THEMES: Record<string, Theme> = {
  parchment: { section: "bg-parchment text-charcoal", heading: "text-charcoal", accent: "text-forest", muted: "text-stone", kicker: "text-amber-ink", rule: "border-rule", dark: false },
  paper: { section: "bg-paper text-charcoal", heading: "text-charcoal", accent: "text-forest", muted: "text-stone", kicker: "text-amber-ink", rule: "border-rule", dark: false },
  forest: { section: "on-forest bg-forest text-parchment", heading: "text-parchment", accent: "text-amber", muted: "text-sage", kicker: "text-amber-soft", rule: "border-forest-rule", dark: true },
  charcoal: { section: "on-forest bg-charcoal text-parchment", heading: "text-parchment", accent: "text-amber", muted: "text-parchment/75", kicker: "text-amber-soft", rule: "border-parchment/15", dark: true },
};

export function themeClass(background: string | undefined, fallback: keyof typeof THEMES = "parchment"): Theme {
  return THEMES[background && THEMES[background] ? background : fallback];
}
