# VoltageAfrica — website

The digital home of VoltageAfrica: intelligent renewable energy infrastructure for rural Africa.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS v4, Three.js / React Three Fiber / Drei, Motion, Lucide and Zod. Content is managed in a Supabase-backed CMS at `/admin` (Postgres, Auth, Storage).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm start          # serve the production build
npm test           # database, RLS and CMS validation tests
```

Node 20+ is required.

## Deploy to Vercel

1. Push this folder to a GitHub repository. The original media folders (`/Images`, `/VoltageAfrica_Prototype and Evidence and media`) are git-ignored on purpose. They contain private documents (phone numbers, emails, certificates). Only the web-optimised copies in `public/images` are published.
2. In Vercel: **Add New → Project → Import** the repository. The framework preset is detected automatically; no build settings need changing.
3. Add the environment variables below (Project → Settings → Environment Variables), for Production **and** Preview.
4. Deploy, or **Redeploy** after adding or changing variables: `NEXT_PUBLIC_*` values are baked in at build time.

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical URL for metadata, sitemap, social cards and auth email links. Defaults to `https://www.voltageafrica.africa`. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon / publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also accepted). Row Level Security limits it to published content. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Stores partnership, support and contact submissions; used by `scripts/create-admin.mjs`. It bypasses RLS: never prefix it with `NEXT_PUBLIC_` and never use it in client code. It is only imported from `lib/supabase/service.ts`, which is marked `server-only`. |
| `RESEND_API_KEY` | server only | Optional. Email notifications for new engagement submissions ([resend.com](https://resend.com)). |
| `NOTIFICATION_FROM_EMAIL` | server only | Verified sender, e.g. `VoltageAfrica <notifications@voltageafrica.africa>`. `CONTACT_FROM_EMAIL` is still accepted. |
| `ADMIN_NOTIFICATION_EMAIL` | server only | Fallback recipient. The recipient set in **Site settings → Engagement notifications** takes precedence. `CONTACT_TO_EMAIL` is still accepted. |
| `IP_HASH_SALT` | server only | Optional salt for the hashed IP stored with each submission. |

Copy `.env.example` to `.env.local` for development. `.env*` files are git- and Vercel-ignored.

**Without Supabase configured,** the public site still works:
- It renders the bundled seed content (`lib/cms/seed.ts`).
- `/admin/login` shows a setup screen instead of a login form.
- Nothing pretends to be connected.

If Supabase is configured but unreachable, the public site falls back to the same content and logs a warning.

## CMS setup (Supabase): step by step

1. **Create a project** at [supabase.com](https://supabase.com). Copy the project URL, the anon/publishable key and the service-role key (Project Settings → API).
2. **Run the migrations, in order.** Either paste each file into the SQL Editor and run it, or use the CLI (`npx supabase link --project-ref <ref>`, then `npx supabase db push`):
   1. `supabase/migrations/20261120000001_schema.sql` creates the tables, enums and triggers.
   2. `supabase/migrations/20261120000002_security.sql` adds `is_admin()` and Row Level Security policies on every table.
   3. `supabase/migrations/20261120000003_storage.sql` creates the `media` (public) and `private` storage buckets and their policies.
   4. `supabase/migrations/20261120000004_engagement.sql` adds the Engagement Inbox: `partnership_inquiries`, `support_inquiries`, private `admin_settings`, extends `contact_messages` (subject, admin notes, six-stage workflow) and adds contact/header fields to `site_settings`. It never drops data and can be re-run. If you ever re-run `002_security.sql`, re-run `004` afterwards (002 resets all policies).
   5. `supabase/migrations/20261120000005_page_imagery.sql` adds photo plates to the page openings and the Partner, Support and Contact pages. It only fills in a photo where a section has none, so images you choose in the CMS are never replaced.
   6. `supabase/migrations/20261120000006_cinematic_homepage.sql` turns the homepage into the seven-act story with the film / 3D hero. It adds the new sections and renders, fills in the hero's film scenes only where missing, updates the hero buttons only if they still have their original wording, and hides (never deletes) the superseded homepage sections.
   7. `supabase/migrations/20261120000007_hero_photographs.sql` swaps hero film scenes 3–5 for credited photographs (only where a scene still shows its original image).
   8. `supabase/migrations/20261120000008_press_privacy.sql` adds the Funders & press page (`/press`), the privacy policy (`/privacy`), the "Funders & press" link and the homepage key-facts strip.
3. **Seed the existing website content:** run `supabase/seed.sql` in the SQL Editor (or `psql "$DATABASE_URL" -f supabase/seed.sql`).
   - It is idempotent (fixed IDs, `on conflict do nothing`), so re-running it never duplicates or overwrites your edits.
   - To regenerate it from `lib/cms/seed.ts`, run `npm run db:seed:generate`.
4. **Close public sign-ups:** Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
   - The site has no sign-up form, and the magic-link login uses `shouldCreateUser: false`.
   - Even so, an account only gets admin rights when it has a row in `public.profiles`.
5. **Set the auth URLs** under Authentication → URL Configuration:
   - Site URL: your production URL, e.g. `https://www.voltageafrica.africa`
   - Redirect URLs:
     - `https://www.voltageafrica.africa/admin/auth/callback`
     - `http://localhost:3000/admin/auth/callback`
     - for previews, `https://*-<your-team>.vercel.app/admin/auth/callback`
6. **Create the first administrator** from your own machine (no credentials are hard-coded anywhere):
   ```bash
   node --env-file=.env.local scripts/create-admin.mjs you@example.org "a-long-unique-password"
   # or omit the password to send an invitation email instead
   ```
   Alternatively, create the user under Authentication → Users, then run this in the SQL Editor:
   ```sql
   insert into public.profiles (id, email, role)
   select id, email, 'admin' from auth.users where email = 'you@example.org'
   on conflict (id) do update set role = 'admin';
   ```
   To remove someone's access, delete their `profiles` row (or the auth user).
7. **Add the environment variables** in Vercel (and `.env.local`), then **redeploy**.
8. Sign in at `/admin/login`.

**Optional: email notifications.** To get an email for each partnership request, support inquiry and contact message, set up Resend:
1. Verify your domain.
2. Create an API key.
3. Set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`, then choose the recipient in **Site settings → Engagement notifications** (or set `ADMIN_NOTIFICATION_EMAIL`).

Submissions are always stored first; email is sent after the response and its failure can never lose a submission.

## Using the admin dashboard

| Area | What you can do |
|---|---|
| **Overview** | Engagement figures (total and new partnership, support and contact submissions) and recent submissions; content counts and recent edits. |
| **Engagement Inbox** | Partnership Requests, Support & Donations, Contact Messages. Filter by status, search by name/organisation/email/keyword, sort, open a submission beside the list, change status (New, Reviewed, In discussion, Accepted, Declined, Completed), add private notes, reply by email, delete. |
| **Homepage / Pages** | Page builder: add sections from the library, reorder by dragging (or with the keyboard), duplicate, hide, delete, edit; page title, address and SEO. Create new pages. |
| **Sections** | Every section on every page, filterable by type. |
| **Navigation** | Header and footer links, order, visibility. |
| **Timeline, Publications, Awards, Projects, Technology, Founder & team, Principles** | Create, edit, duplicate, reorder, publish, archive, delete. Projects have galleries, milestones and linked publications. |
| **Media library** | Drag-and-drop upload (large images are downscaled in the browser), alt text, captions, credits and licences, categories, and a usage check before deletion. Private files go to the private bucket and are only shown through expiring links. |
| **Site settings** | Name, tagline, contact email/phone/location, socials, header button and secondary link, default SEO, footer text; engagement notification recipient and per-form toggles. |

### Draft → preview → publish

- **Draft:** editing a section saves a draft, stored in the admin-only `page_section_drafts` table. Visitors keep seeing the published version.
- **Preview:** after an admin check, this turns on Next.js Draft Mode for your browser only. It shows the page with drafts applied, under a banner. Use **Exit preview** to leave.
- **Publish:** per section, or "Publish all changes" on a page. This copies drafts live and revalidates the site immediately.
- **Order and visibility:** reordering and hiding apply immediately, without a draft.
- **Collection items** (milestones, awards…) have a status, and only `published` rows are visible to the public. RLS enforces this, not just the UI.
- **Caching:** public pages are otherwise cached and refreshed every 5 minutes.

## The homepage

The homepage is a seven-act story, all editable in **Admin → Homepage**:

| Section | Type | What it is |
|---|---|---|
| Hero | Cinematic hero | Two experiences behind a **Film / 3D** toggle (remembered per session). *Film*: up to eight full-screen scenes that dissolve with a slow camera move; set image, title, caption, focal point and move per scene, and the seconds per scene. *3D*: a real-time landscape (`components/hero/HeroWorld.tsx`) with golden-hour → dusk light, a drifting camera and five chapters (Generation → Storage → Intelligence → Distribution → Homes & productive use) whose texts come from **Technology → 3D microgrid components**. |
| I · The reality | Story act (Reality) | Full-bleed photograph with up to three sourced figures. |
| II · The idea | Story act (Split) | Text, points and an asymmetric photo pair. |
| III · The system | 3D microgrid exhibit | The interactive tabletop model. |
| IV · The intelligence | Story act (Register) | Capabilities and their real status, from **Technology → Capabilities**. |
| V · The impact | Story act (Mosaic) | Three photographs and what energy makes possible. |
| VI · The ambition | Future stages | The scroll-driven network roadmap. |
| VII · Invitation | Story act (Invitation) | Full-screen closing with partner / support / contact pathways. |

An eyebrow written as `Act III · The system` on any section is drawn as an act marker.

**3D behaviour.** The 3D bundle (three.js) loads only when a visitor chooses 3D. Devices without WebGL2, with data-saver or very little memory always get the film; touch devices get 3D without drag (so the page still scrolls), and the film is the default on everything but capable desktops. Reduced-motion visitors get still scenes and no camera drift. Rendering pauses when the hero is off-screen. Everything in the 3D world is labelled as illustrative; nothing is presented as an operating installation.

**Renders.** `public/images/renders/*` are stills of the 3D world, captioned as illustrative renders. To make new ones, build with `NEXT_PUBLIC_ENABLE_RENDER_STILLS=1` and open `/?still=camX,camY,camZ,targetX,targetY,targetZ,hour` (e.g. `/?still=42,7.5,26,6,2.6,-4,18.8`); leave the variable unset in production.

## Security model

- **RLS on every table.** Anonymous visitors can read only published content. Writes require `public.is_admin()`, which checks that the signed-in user has a row in `profiles`.
- **Engagement submissions** (`partnership_inquiries`, `support_inquiries`, `contact_messages`, `admin_settings`). There is no public insert policy and `anon` has no table privileges. `/api/partnership`, `/api/support` and `/api/contact` validate each submission and insert it with the server-only service-role client. Only admins can read, update or delete.
- **Storage.** Uploads require an admin.
  - The `media` bucket is public, with an image/video/PDF allowlist and no SVG.
  - The `private` bucket is never public.
  - Do not put sensitive documents in the public `media` bucket.
- **Server actions.**
  - Every action re-checks the admin session (`withAdmin`).
  - Input is validated with Zod schemas generated from the same field definitions as the forms.
  - Rich text is sanitised against an allowlist (`lib/cms/sanitize.ts`).
  - Links must be relative, `#`, `mailto:` or http(s).
- **Admin routes.** `/admin` responses are `noindex`, and `proxy.ts` refreshes the session cookie.

### Engagement forms (partner, support, contact)

The pages are CMS pages (`/partner`, `/support`, `/contact`) built from the **Engagement** section types, so every heading, text, button label and confirmation message is editable, and page visibility is the page's publish status. The **Engagement pathways** section adds a three-way call to action to any page. "Get involved" links (mobile menu and footer) are Navigation items in the *Get involved* menu.

The support form records a support **inquiry / pledge** only. No payment is taken and the site makes no charitable or tax-deductible claim.

Built-in protection (`lib/engagement/submit.ts`):
- Zod validation shared with the browser (`lib/validation/engagement.ts`), control/bidi character stripping, HTML-escaped email bodies
- A honeypot field and a minimum fill time
- CSRF: same-origin and `Sec-Fetch-Site` checks, JSON-only bodies, size limits
- Per-IP rate limits (5 per form per 10 minutes, 12 per hour overall). In memory per server instance; back `lib/rate-limit.ts` with Upstash or Vercel KV for global limits.
- Duplicate suppression (same email and message within 10 minutes) and a client-side submit lock
- Stored IPs are hashed.

Behaviour:
- **Stored:** the visitor sees the confirmation; the notification email is sent afterwards (if configured).
- **Storage unavailable but email configured:** the email becomes the record; success is shown only if it was delivered.
- **Neither works:** the API returns 503 with a friendly message. It never claims a submission was received when it was not, and never exposes internal errors.

## Tests

```bash
npm test
```

This runs four steps:
- `db:seed:generate` regenerates `supabase/seed.sql`.
- `db:test` applies the migrations and seed to an in-process Postgres (PGlite) with stub Supabase roles. It checks:
  - the schema
  - idempotent re-seeding
  - RLS as anon, as a non-admin user and as an admin (drafts hidden, messages private, writes refused, storage rules)
- `cms:test` validates every seed section and item against its schema. It also tests unsafe input: script URLs, oversized text and HTML sanitising.
- `tsc --noEmit` type-checks the project.

These tests do not exercise a live Supabase project, so real Auth emails and Storage uploads are not covered. After setup, check them by hand:
1. Sign in.
2. Edit and publish a section.
3. Upload an image.
4. Submit the contact form.

## Troubleshooting

- **The login page says "Connect Supabase":** the `NEXT_PUBLIC_SUPABASE_*` variables are missing from that deployment. Add them and redeploy.
- **"This account is not an administrator of this website":** that account has no `profiles` row. Run step 6.
- **The magic link opens the wrong site or fails:** add the exact `/admin/auth/callback` URL to the Supabase Redirect URLs and check `NEXT_PUBLIC_SITE_URL`.
- **Uploaded images don't render:** the Supabase storage host is added to `images.remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL` at build time. Redeploy after changing it.
- **The public site still shows old content:** publishing from the admin revalidates immediately. If you edited the database directly, wait up to 5 minutes or redeploy.
- **The contact form returns 503 in production:** neither Supabase (service-role key) nor Resend is configured.
- **The server log shows `[cms] … failed, using bundled content`:** Supabase was unreachable or a query failed. The site keeps working with seed content.

## Project structure

```
app/
  (site)/               public site: layout (nav/footer from CMS), home, [slug] pages,
                        projects/[slug], microgrid (full-screen 3D)
  admin/                login, auth callback, and (cms)/ dashboard routes
  api/contact/          contact form backend
  api/preview/          enter / exit Draft Mode (admin-verified)
  sitemap.ts robots.ts opengraph-image.tsx
proxy.ts                session refresh + noindex for /admin
components/
  admin/                dashboard UI: page builder, section editor, field forms,
                        collections, media library/picker, rich text, settings
  cms/                  SectionRenderer, generic content blocks, preview banner
  hero/ microgrid/ three/ sections/ pages/ timeline/ media/ contact/ navigation/ footer/ ui/
lib/
  supabase/             env, browser, server (session), public (anon), service (server-only)
  cms/                  fields, section-types (registry), collections, queries,
                        actions (server actions), auth, sanitize, seed
  data/                 original editorial content (source for the seed)
  sim/ validation/ email/
supabase/migrations/    schema, security (RLS), storage
supabase/seed.sql       generated from lib/cms/seed.ts
scripts/                create-admin, db tests, seed generator, asset pipeline
```

### Adding a new section type

1. Add an entry to `lib/cms/section-types.ts` with a label, a description, a group and its `fields` (text, richtext, image, list…). The admin form and its Zod validation are generated from these fields.
2. Render it in `components/cms/SectionRenderer.tsx`, reusing `components/cms/blocks.tsx` where possible. Read values with the safe helpers in `lib/cms/content.ts`.
3. It then appears in the "Add a section" library. No migration is needed, because section content is stored as JSON.

New collection fields do need a migration: add the column, then add the field in `lib/cms/collections.ts`.

## Design system ("Field Atlas")

Defined as tokens in `app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `parchment` | `#F3EFE5` | primary canvas |
| `paper` | `#FFFFFF` | content surfaces, plaques, forms |
| `charcoal` | `#24241F` | primary text, the one dark section (Principles) |
| `stone` | `#625D51` | secondary text (5.7:1 on parchment) |
| `amber` | `#E8A344` | energy: fills, flows, highlights (never small text on light) |
| `amber-ink` | `#95570F` | amber for small text on light surfaces |
| `forest` | `#344B3B` | anchor sections: Approach, Future, Contact |

Type: Fraunces (display, with italic accents), Instrument Sans (text), IBM Plex Mono (data only). Headlines mark their italic accent with `*asterisks*`.

## Content rules

The site follows these rules; please keep them when editing in the CMS:
- External statistics carry a named source and link.
- Field-research figures come from the Shurugwi Community Outreach report (8 May 2025).
- Anything not yet built is labelled with a status (Prototyped / In design / Planned / Long-term).
- The Shurugwi pilot is presented as **in preparation**, not operational.
- All dashboard and microgrid numbers are **simulated** and labelled as such.

## Photography & credits

Your own photographs come from the project media folders. Three landscape photographs are freely licensed from Wikimedia Commons and must keep their credits. The credits are shown in captions and the footer, and are stored as credit fields on each media item; source metadata is in `scripts/sources/`.

- Light through a storm over the Matobo Hills (homepage hero): Digr, CC BY-SA 3.0 (attribution and licence link required)
- Chidoma Kopje, Mapfungautsi Plateau, Midlands Province (challenge section, shown as a dusk duotone): Jaison Ndlovu, CC0
- Chiremba Balancing Rocks, Harare: lumoplank, CC0

They are captioned as landscapes and never presented as VoltageAfrica installations.

**Photo plates.** Page openings (and the Partner, Support and Contact pages) can show a large editorial photograph with a figure label, caption and credit: edit *Photo plate*, *Photo caption* and *Photo focal point* on the section. Use real VoltageAfrica photography or credited landscapes only, never images that suggest an installation that does not exist. The microgrid trace drawn over the hero photo is labelled as a conceptual overlay.

The hero is served at quality 90 (`next.config.ts` → `images.qualities`). To replace it, upload a sharp original at least 3200px wide.

## Media pipeline

Run `python scripts/prepare-assets.py` to regenerate `public/images` from the original folders. It needs Pillow, plus `pip install pillow-heif` for the HEIC photo. Originals are never modified.

## Performance & accessibility notes

- The 3D microgrid bundle loads only when it nears the viewport, and pauses rendering when off-screen.
- Devices without WebGL, with data saver on or with low memory get an interactive 2D plan of the microgrid.
- Touch devices get reduced 3D quality. The embedded scene needs a tap before it captures gestures, so page scrolling is never hijacked.
- `prefers-reduced-motion` disables camera motion, hero parallax, auto-advancing elements and transforms.
- Keyboard support:
  - a skip link and visible focus states
  - component selection via buttons, and Escape to close panels
- The dashboard has a table view, and the full-screen microgrid page includes a text description of every component.
