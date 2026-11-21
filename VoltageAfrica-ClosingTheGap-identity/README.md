# VoltageAfrica — "Closing the Gap" identity · v1.0

A heavy charcoal ring (the community, the grid) opened by a gap and closed by one straight
solar-amber facet: the switch that completes the circuit.

## Install in the Next.js site

1. Copy `public/brand/` → `public/brand/`, and `public/favicon.ico` → `public/favicon.ico`.
   Delete `app/favicon.ico` if it exists (Next.js would serve it instead).
2. Copy `components/brand/Logo.tsx` and `app/brand-metadata.ts`; spread the metadata into `app/layout.tsx`.
3. In Vercel, set `NEXT_PUBLIC_SITE_URL` to the production domain.
4. Replace every hard-coded logo `<img>` with `<Logo />`:

| Place            | Use                                                       |
|------------------|-----------------------------------------------------------|
| Desktop nav      | `<Logo height={34} priority />`                           |
| Mobile nav       | `<Logo height={26} priority />`                           |
| Footer (dark)    | `<Logo tone="reverse" height={28} />`                     |
| Admin sign-in    | `<Logo variant="stacked" height={96} />`                  |
| Admin sidebar    | `<Logo variant="symbol" height={28} />`                   |
| Loading state    | `<Logo variant="symbol" height={40} />` (fade the whole mark; never spin it — it would read as a loading ring) |

## Files (`public/brand/`)

- `logo-horizontal-*`, `logo-stacked-*`, `symbol-*`, `wordmark-*` — tones: `primary`, `reverse`,
  `mono-charcoal`, `mono-white`, `on-amber`. SVG + 2400 px PNG.
- `symbol-small-primary.svg` — small-size drawing (wider joints) for 32 px and below.
- `favicon.svg` (follows light/dark browser theme), `favicon-tile.svg`, `../favicon.ico` (16/32/48).
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `app-icon*.svg/png`.
- `og-image.png` / `.svg` — 1200 × 630 social preview. `site.webmanifest`.

Every file is drawn geometry with the wordmark converted to outlines: no fonts to load, no CSS filters,
transparent backgrounds, viewBox tight to the artwork (clear space is applied in layout).

## Tokens

```css
--va-charcoal: #1F2326;   --va-amber: #F2A516;      --va-amber-deep: #9A5F00; /* amber text: 5.2:1 */
--va-graphite: #5E6468;   --va-stone: #E9E7E2;      --va-paper: #F7F6F3;      --va-white: #FFFFFF;
```

Fonts (next/font/google): **Archivo** (variable, width 100–125) and **IBM Plex Mono** 400/500.
Amber on white is 2.1:1 — graphics only, never text.

## Rules

- Clear space: the ring's thickness on every side. Minimum: horizontal 130 px / 32 mm; symbol 16 px / 5 mm.
- The facet is always straight, always amber (or the single colour in mono versions), always at the
  upper right. Never curve it, rotate the mark, recolour the facet, stretch it or add effects.

## Source

`source/` holds the generators (Python, shapely, fontTools). `python3 build7.py` rebuilds every file
from the master geometry. Wordmark set in Archivo (SIL Open Font License).

Before printing equipment, uniforms or signage, run a trademark clearance search (Nice classes 9, 37, 40, 42).
