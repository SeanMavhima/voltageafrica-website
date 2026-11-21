# VoltageAfrica: pre-launch audit, 21 November 2026

## A. Verdict: READY AFTER MINOR FIXES

The code is in good shape. Security, data handling, forms, routing, SEO and accessibility tested well, and every defect found in those areas was fixed and retested.

What stands between the site and launch is mostly configuration you have to do in your hosting environment:
- **Production site address:** set `NEXT_PUBLIC_SITE_URL` to the real domain (it is currently `localhost`).
- **Email:** configure the email provider settings.
- **Database:** apply one small migration.

There are also two things I could not verify:
- **The admin dashboard:** I had no administrator login, so no CMS editing was tested.
- **Real-phone performance:** this machine has no GPU and its timings were too noisy to trust.

Both need a short manual check before you announce the site.

### How it was tested
- **Production build:** I built and ran the site (`next build` + `next start`).
- **Writes impossible:** the test server ran with the database write key blanked, so nothing could reach your live data.
- **Live database:** checked through read-only requests using only the public key.
- **Database behaviour:** tested against the project's disposable local Postgres harness (PGlite).
- **Browser tests:** a real headless Chromium driven by scripts.
- **Lighthouse:** run with mobile settings.

Nothing was deployed, no live data was changed, no submissions were sent to your inbox, and no secrets were printed.

## B. Testing summary

| Category | Tests performed | Passed | Failed | Status |
|---|---:|---:|---:|---|
| Build & types | `tsc`, production build ×4, `npm audit` | 6 | 0 | PASS (0 vulnerabilities) |
| Routes | 23 public routes, 4 unknown URLs, 7 admin URLs (signed out), 22 internal links, 21 external links | 76 | 0 | PASS (LinkedIn blocks link checkers; works in a browser) |
| Frontend (browser) | 153 page loads (17 pages × 9 widths), then 48-load regression pass | 152 + 48 | 1 → fixed | PASS after fix |
| Responsive | widths 320, 375, 390, 430, 768, 1024, 1366, 1440, 1920 | — | 1 (`/contact` at 320px) | FIXED, retested |
| Interactions | 3D/film toggle ×10, film scenes, keyboard, mobile menu, theme, reduced motion, donate flow | 15 | 0 | PASS |
| 3D | canvas mounts and unmounts over 10 cycles, memory growth, errors | 5 | 0 | PASS (software rendering; frame rate on a real GPU not measured) |
| Forms API | 13 abuse and validation cases, plus the 34-case engagement suite | 47 | 0 | PASS |
| Supabase / RLS | 134 database tests (local Postgres), 9 read-only probes of the live project | 143 | 0 | PASS |
| Security | secrets scan, server-action auth review (28/28 guarded), redirect checks | — | 1 (open redirect) | FIXED, retested |
| Authentication | signed-out redirects, preview without a session | 8 | 0 | PARTIAL: real login/logout NOT TESTED (no credentials) |
| CMS / admin | — | — | — | NOT TESTED (no admin credentials) |
| Email | failure path only (an honest 503 when it cannot store or send) | 1 | 0 | NOT TESTED: delivery (`RESEND_API_KEY` is empty) |
| AI Energy Lab | 26 engine tests, 12 copilot prompts, 6 edge cases, rate limit | 44 | 0 | PASS: offline mode only; LLM mode NOT TESTED (no API key) |
| Accessibility | Lighthouse, 4 pages × 2 themes | 8 | 0 | 100 on 3 pages, 98 on /pilot (was 93–98) |
| SEO | metadata on 16 pages, sitemap, robots, noindex on admin | — | 2 → fixed | PASS (100), except the site-URL setting |
| Performance | Lighthouse mobile ×3, CPU profiles, A/B tests | — | 3 | BELOW TARGET in this environment (40–51); see E |

## C. Issues found

| # | Issue | Severity | Location | Root cause | Fix | Retest |
|---|---|---|---|---|---|---|
| 1 | Sitemap, robots.txt, canonical links and share URLs all point to `http://localhost:3000` | HIGH | `.env.local` → `NEXT_PUBLIC_SITE_URL` | This value is baked in at build time | You set the real domain in hosting (step F1). I added a loud build warning while it's localhost (`next.config.ts`) | Warning confirmed in build output |
| 2 | 14 of 16 pages had no social preview image; the one that existed was 840 KB, too heavy for WhatsApp | HIGH | `lib/cms/metadata.ts`, `app/opengraph-image.tsx` | Page metadata replaced the root `openGraph` object, image included; the generator only outputs PNG | Shared `shareMetadata()` helper; a 102 KB JPEG of the same design (`public/brand/og-share.jpg`); generator moved to `scripts/og/` with notes | Every page carries `og:image` and `twitter:image`; image returns 200 |
| 3 | Open redirect: `/api/preview?path=/%09/evil.com` sent visitors to evil.com | MEDIUM (needs a signed-in admin to click a crafted link) | `app/api/preview/route.ts` | Prefix checks; URL parsers drop tabs and treat `\` as `/` | Resolve the URL and require the same origin | 12 bypass cases checked, all stay on site |
| 4 | Email notifications are off | MEDIUM | env | `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` are empty | Configuration (F2). Submissions are still stored; the admin inbox works without email | n/a |
| 5 | `/contact` was 11px too wide on 320px phones | LOW | `components/engagement/sections.tsx` | The email address is one unbreakable word | Allowed it to wrap; made the form grids min-width safe | 0 overflow at 320/375/390 |
| 6 | Dark mode: amber text on a light chip (1.8:1 contrast); leftover hardcoded reds | LOW (my own regression from the dark-mode work) | `globals.css`, Energy Lab components | Charcoal chips turn light in dark mode | Deep-amber rule for those chips; reds moved to theme tokens | Lighthouse contrast passes in both themes |
| 7 | Invalid `<dl>` markup in key facts and Energy Lab readouts | LOW | `KeyFacts.tsx`, `energy-lab/ui.tsx` | Links and paragraphs placed directly in `<dl>` | Valid list and `<dd>` markup, same visuals | Audits pass |
| 8 | Copilot hashed IP addresses with no salt when `IP_HASH_SALT` is unset (reversible) | LOW | `app/api/energy-lab/copilot/route.ts` | Missing fallback | Same salt fallback as the forms; you should still set a salt (F2) | Typecheck and tests pass |
| 9 | Privacy policy didn't mention that the theme choice is stored | LOW | privacy page | Theme preference added later | Seed text updated, plus migration `011` for the live page (only replaces the unedited sentence) | Migration applies and re-runs cleanly |
| 10 | Heading-level skips (h1 → h3) on /pilot, /journey, /impact, /projects, project page | LOW | section components | Section headings promote to h1 but sub-headings stay h3 | Not fixed: needs context-aware heading levels in several components | Open |
| 11 | The offline copilot can't answer 5 of the 10 standard prompts (e.g. "what if demand doubles", pump scheduling, "what data do you have"); "technical" and "non-technical" give the same answer | LOW | `lib/energy-lab/fallback.ts` | Limited intent coverage | Not fixed (feature work). It refuses honestly and never invents | Open |
| 12 | Rate limits are per server instance (in memory) | INFO | `lib/rate-limit.ts` | By design, documented in code | Fine at current traffic; use a shared store if you get spam | Open |
| 13 | The project is not a git repository | INFO | repo | — | Put it under git before deploying, so you can roll back | Open |

Verified safe (no change needed):
- **Server actions:** all 28 admin actions check for an administrator before acting.
- **Admin pages:** signed-out visitors are redirected to the login page.
- **Live database:** RLS denies anonymous reads of messages, inquiries and settings, and `is_admin()` is false for the public.
- **Secrets:** the service-role key is absent from the shipped browser code and the source tree.
- **Forms:**
  - Cross-site posts are rejected (403).
  - Invalid input returns 422, malformed JSON 400, oversized bodies 413, and repeat posts are rate-limited (429).
  - The honeypot and too-fast checks fake success without storing anything.
  - With storage down, a submission returns an honest 503, never a fake "ok".
- **Copilot:** prompt injection is refused; invalid input is rejected (400) and cross-site requests (403).

## D. Fixes completed

1. Social previews on every page: a 102 KB share image, plus per-page titles for the microgrid and project pages.
2. Open-redirect fix in the preview route.
3. Build warning while the site URL is localhost.
4. 320px overflow fix on /contact; form grids are min-width safe.
5. Dark-mode contrast fixes and theme tokens for the critical-red colour.
6. Valid list markup in key facts and the Energy Lab.
7. Salted IP hashing in the copilot.
8. Privacy policy: theme preference (seed plus `supabase/migrations/20261121000011_privacy_theme.sql`).

All of these passed retesting: typecheck, the full test suite (134 database, 223 CMS, 34 engagement and 26 Energy Lab tests), the production build, browser checks and Lighthouse.

## E. Remaining risks

- **Mobile performance is unverified.**
  - Lighthouse mobile scored 40 (home), 51 (pilot) and 50 (Energy Lab) here.
  - Profiling showed most of the time was the browser's own painting and layout work, which this GPU-less machine does in software.
  - A/B tests (hero filters, drift animation, grain, blur, WebGL probe, AVIF) were all within run-to-run noise: the same baseline ranged from 6.5s to 12.3s of blocking time.
  - Real phones may do much better, but I cannot claim that. Measure the deployed site (F5).
- **The admin dashboard is untested.** Login, editing, publishing, uploads and the inbox were not exercised (F4).
- **Email delivery is untested** until it's configured.
- **The AI copilot's LLM mode is untested.** No `ANTHROPIC_API_KEY` is set; visitors get the offline engine, which works but answers fewer questions.
- **Content to confirm** (claims I can't verify from the project): "5 awards", "2nd place at the BRICS+ Youth Innovation Summit 2026", "Team: 4 people". The site is otherwise careful to label the pilot "in preparation, not yet operational". On /press, the pitch deck, venture overview and venture description have no files attached.

## F. Manual steps before hosting

1. **Hosting environment variables:** `NEXT_PUBLIC_SITE_URL` = your real `https://` domain, then redeploy. It's baked in at build time.
2. **Also set these:**
   - `RESEND_API_KEY`, plus `NOTIFICATION_FROM_EMAIL` (an address on a domain you've verified in Resend) and `ADMIN_NOTIFICATION_EMAIL`.
   - `IP_HASH_SALT` (any long random string).
   - Optionally `ANTHROPIC_API_KEY` for the AI copilot.
   - Copy the Supabase URL, anon key and service-role key from `.env.local`.
3. **Apply migration `20261121000011_privacy_theme.sql`.** Migration 010 (donate) is already live.
4. **Supabase dashboard → Authentication → URL configuration:** set the Site URL and add `https://<domain>/admin/auth/callback` as a redirect URL. Without this, magic-link sign-in breaks on the real domain.
5. **Fifteen-minute admin smoke test on the deployed site:**
   - Sign in, then edit and publish one section and see it on the public page.
   - Upload an image, then open the inbox.
   - Send one real test of each form (contact, partner, support), confirm it arrives in the inbox and by email, then delete the test records.
6. **Measure performance:**
   - Run PageSpeed Insights on the deployed homepage.
   - Open the site on a mid-range Android phone over mobile data.
   - If it feels slow, the first lever is hero photo quality (90 → 75).
7. **Version control:** `git init` and commit before the first deploy.
8. **Close leftover test servers:** my test servers are still listening on ports 3005–3008 on this machine (stopping their task didn't end the Node processes, and I wasn't permitted to kill them). End them in Task Manager. Port 3000 is yours.

## G. Production checklist

| Item | Status |
|---|---|
| Typecheck, build, tests, `npm audit` | PASS |
| No secrets in source or browser bundle; `.env*.local` git-ignored | PASS |
| RLS on live database (read probes) | PASS |
| Admin routes protected when signed out | PASS |
| Admin login and CMS editing | NOT TESTED |
| Forms: validation, spam, CSRF, rate limit, honest failure | PASS |
| Form email notifications | NOT CONFIGURED |
| All public pages render without errors at 9 widths | PASS |
| Mobile menu, keyboard, focus, reduced motion | PASS |
| 3D toggle: no leaks, clean unmount | PASS (software GPU) |
| Accessibility (Lighthouse) | PASS (98–100) |
| SEO metadata, sitemap, robots, social previews | PASS, once `NEXT_PUBLIC_SITE_URL` is set |
| `NEXT_PUBLIC_SITE_URL` = production domain | FAIL (manual step F1) |
| Supabase Auth redirect URLs for production domain | NOT TESTED (manual step F4) |
| Migration 011 applied | PENDING (F3) |
| Mobile performance ≥ 90 | NOT MET in this environment; verify on deployed site |

## H. Recommendation

Yes, I would launch this site, once steps F1–F5 are done. The code side is ready.

The engineering underneath is solid:
- **Data model:** clean, with RLS that really is enforced and real form protection.
- **Honesty:** form failures are reported truthfully, and claims are careful about what is built versus planned.
- **Breakage:** no errors across 200 page loads.

Nothing found in the code blocks launch. What I would not do is announce it widely before two things:
- **Admin check:** five minutes in the admin dashboard on the real domain.
- **Speed check:** a PageSpeed run on the deployed site. If the score stays in the 40s on a real phone, spend a day on mobile performance before a big push. If it's in the 70s or above, launch and optimise afterwards.
