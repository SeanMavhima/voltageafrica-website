/**
 * Seed dataset for the CMS, derived from VoltageAfrica's existing, verified content
 * (lib/data/*). Used to:
 *   1. generate supabase/seed.sql (npm run db:seed:generate)
 *   2. test migrations + RLS (npm run db:test)
 *   3. render the site when Supabase is not configured (fallback)
 *
 * IDs are deterministic (derived from a stable key) so seeding is idempotent:
 * re-running inserts nothing new and never overwrites edits made in the CMS.
 */
import { createHash } from "node:crypto";
import {
  approach,
  beyondLighting,
  capabilities,
  challengeStats,
  copy,
  futureStages,
  home,
  milestones as milestoneData,
  pages as pageData,
  principles as principleData,
  productiveUses,
  publications as publicationData,
  revenueModel,
  shurugwi,
  team,
} from "@/lib/data/content";
import { gridComponents } from "@/lib/data/microgrid";
import { landscapes } from "@/lib/data/photos";
import { contactCopy, donateCopy, partnershipCopy, pathwaysCopy, supportCopy } from "@/lib/engagement/copy";
import { nav, site } from "@/lib/site";

export function seedId(key: string): string {
  const h = createHash("sha1").update(`voltageafrica:${key}`).digest("hex");
  // RFC 4122 layout, version 5, variant 10
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ─── Media ────────────────────────────────────────────────────────────
type MediaSeed = {
  path: string;
  alt: string;
  category: string;
  title?: string;
  caption?: string;
  credit?: { author: string; license: string; licenseUrl: string; source: string };
};

const mediaList: MediaSeed[] = [
  { path: landscapes.matobo.src, alt: landscapes.matobo.alt, category: "homepage", caption: landscapes.matobo.caption, credit: landscapes.matobo.credit },
  { path: landscapes.chidoma.src, alt: landscapes.chidoma.alt, category: "homepage", caption: landscapes.chidoma.caption, credit: landscapes.chidoma.credit },
  { path: landscapes.chiremba.src, alt: landscapes.chiremba.alt, category: "homepage", caption: landscapes.chiremba.caption, credit: landscapes.chiremba.credit },
  { path: "/images/founder/sean-pitching-close.jpg", alt: "Sean Mavhima, founder of VoltageAfrica, speaking on stage", category: "founder" },
  { path: "/images/founder/sean-pitching.jpg", alt: "Sean Mavhima presenting on stage", category: "founder" },
  { path: "/images/founder/sean-field.jpg", alt: "Sean Mavhima planting a tree in dense green bush", category: "founder" },
  { path: "/images/milestones/brics-summit-pretoria.jpg", alt: "Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit in Pretoria, South Africa", category: "awards" },
  { path: "/images/milestones/brics-trophy.jpg", alt: "BRICS+ Youth Innovation Summit trophy: Sustainable Development and Green Solutions, 2nd Place", category: "awards" },
  { path: "/images/milestones/green-award-nairobi.jpg", alt: "Sean Mavhima receiving the Africa's Net Green Leader Award in Nairobi", category: "awards" },
  { path: "/images/milestones/green-generation-planting.jpg", alt: "Sean Mavhima and fellow participants tree planting with the Green Generation Initiative", category: "timeline" },
  { path: "/images/milestones/hackatom-certificate.jpg", alt: "Global HackAtom final certificate held by Sean Mavhima", category: "awards" },
  { path: "/images/milestones/hackatom-stage.jpg", alt: "Team presenting on stage at the Global HackAtom final", category: "timeline" },
  { path: "/images/milestones/icp-hackathon-rwanda.jpg", alt: "Sean Mavhima presenting the energy-trading concept at the ICP Hackathon in Rwanda", category: "timeline" },
  { path: "/images/prototype/tracker-array.jpg", alt: "VoltageAfrica's prototype: four solar modules arranged around a central light-sensor module", category: "microgrid" },
  { path: "/images/prototype/tracker-sensor.jpg", alt: "VoltageAfrica's sun-tracking prototype: four 15 W solar modules around a light-dependent-resistor sensor module", category: "microgrid" },
  { path: "/images/prototype/modules-side.jpg", alt: "Prototype solar modules seen from the side", category: "microgrid" },
  { path: "/images/prototype/module-label.jpg", alt: "Specification label of a 15 W solar module used in the prototype", category: "microgrid" },
  { path: "/images/platform/trading-mock-hero.jpg", alt: "Early design mock-up of VoltageAfrica's blockchain energy-trading platform", category: "projects" },
  { path: "/images/platform/trading-mock-network.jpg", alt: "Energy-trading platform mock-up showing a network demo", category: "projects" },
  { path: "/images/outreach/kigali-school-group.jpg", alt: "Students and the VoltageAfrica team outside a classroom after a renewable energy lesson in Kigali", category: "projects" },
  { path: "/images/outreach/kigali-lesson.jpg", alt: "Students completing a learning survey during a lesson", category: "projects" },
  { path: "/images/outreach/kigali-classroom.jpg", alt: "A class gathered after a conservation and renewable energy lesson", category: "projects" },
  { path: "/images/outreach/kigali-lesson-group.jpg", alt: "Secondary-school students standing with the VoltageAfrica team in front of a projected slide reading 'We need to treat Earth with respect'", category: "outreach", caption: "A renewable energy and conservation lesson with secondary-school students in Kigali, Rwanda." },
  { path: "/images/outreach/kigali-courtyard.jpg", alt: "Students and teachers gathered outside a brick school building in Kigali after a VoltageAfrica lesson", category: "outreach", caption: "Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda." },
  { path: "/images/commons/mini-grid-bayelsa.jpg", alt: "Aerial view of a fenced solar mini-grid with rows of panels and a small power house, beside forest, a river and a town in Bayelsa, Nigeria", category: "commons", caption: "A solar mini-grid serving a community in Bayelsa, Nigeria", credit: { author: "Rupumped", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Mini-Grid_Bayelsa.jpg" } },
  { path: "/images/commons/battery-storage-schwerin.jpg", alt: "Long aisles of battery racks and control cabinets inside the WEMAG battery storage hall in Schwerin, Germany", category: "commons", caption: "Battery racks under continuous computer control at the WEMAG storage plant, Schwerin, Germany", credit: { author: "Enyavar", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Schwerin_20140923_wemag2.jpg" } },
  { path: "/images/commons/golden-sunset-kampala.jpg", alt: "The sun setting behind the silhouette of a great spreading tree, with warm golden light, in Kawempe, Kampala, Uganda", category: "commons", caption: "Golden sunset in Kawempe, Kampala, Uganda", credit: { author: "Rudian kd", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:A_striking_Golden_sunset_happens.jpg" } },
  { path: "/images/renders/hub-golden.jpg", alt: "Illustrative 3D render: rows of solar trackers beside a small battery container, with savanna woodland and a low golden sun behind", category: "renders", title: "Illustrative render: community hub at golden hour", caption: "Illustrative render of a proposed community energy hub at golden hour. Not an existing installation." },
  { path: "/images/renders/hub-dusk.jpg", alt: "Illustrative 3D render: a rural community at dusk with lit windows and power lines under an orange afterglow", category: "renders", title: "Illustrative render: connected community at dusk", caption: "Illustrative render of a connected community at dusk. A vision, not an existing installation." },
  { path: "/images/milestones/green-generation-team.jpg", alt: "Four young people in Green Generation Initiative t-shirts holding tree seedlings in a forest clearing", category: "timeline", caption: "Tree planting with the Green Generation Initiative." },
  { path: "/images/fellowship/jlmcf-launch.jpg", alt: "Jim Leech Mastercard Foundation Fellowship on Entrepreneurship, Launch stage selection", category: "publications" },
  { path: "/images/press/herald-2025-pressreader.jpg", alt: "The Herald article 'Lighting the path for Africa's future' as published", category: "publications" },
];

export const seedMedia = mediaList.map((m) => ({
  id: seedId(`media:${m.path}`),
  bucket: "static",
  path: m.path,
  file_name: m.path.split("/").pop()!,
  title: m.title ?? null,
  alt_text: m.alt,
  description: null as string | null,
  caption: m.caption ?? null,
  credit_author: m.credit?.author ?? null,
  credit_license: m.credit?.license ?? null,
  credit_license_url: m.credit?.licenseUrl ?? null,
  credit_source: m.credit?.source ?? null,
  mime_type: "image/jpeg",
  size_bytes: null as number | null,
  width: null as number | null,
  height: null as number | null,
  category: m.category,
}));

const mediaByPath = new Map(seedMedia.map((m) => [m.path, m]));
const mid = (path: string) => {
  const m = mediaByPath.get(path);
  if (!m) throw new Error(`Seed media missing: ${path}`);
  return m.id;
};
const img = (path: string) => {
  const m = mediaByPath.get(path)!;
  return { id: m.id, src: m.path, alt: m.alt_text };
};
const link = (label: string, href: string) => ({ label, href });

// ─── Site settings & navigation ──────────────────────────────────────
export const seedSettings = {
  id: 1,
  site_name: site.name,
  tagline: site.tagline,
  description: site.description,
  contact_email: site.email,
  social_links: [
    { label: "LinkedIn", url: site.founder.linkedin },
    { label: "Instagram", url: site.founder.instagram },
    { label: "Facebook", url: site.founder.facebook },
  ],
  footer_statement: "Intelligent energy infrastructure *for Africa.*",
  footer_copyright: "© {year} VoltageAfrica. All rights reserved.",
  footer_regions: "Zimbabwe · Rwanda · Kenya",
  nav_cta_label: "Get in touch",
  nav_cta_href: "/contact",
  nav_secondary_label: "Partner with us",
  nav_secondary_href: "/partner",
  default_seo_title: site.title,
  default_seo_description: site.description,
};

export const seedNavigation = [
  ...nav.map((n, i) => ({ key: `header:${n.href}`, label: n.label, href: n.href, location: "header", sort_order: i })),
  ...[...nav, { href: "/projects", label: "Projects" }, { href: "/contact", label: "Contact" }].map((n, i) => ({ key: `footer:${n.href}`, label: n.label, href: n.href, location: "footer", sort_order: i })),
  // "Get involved": mobile menu and footer
  ...[
    { href: "/partner", label: "Partner with us" },
    { href: "/support", label: "Support us" },
    { href: "/contact", label: "Contact" },
    { href: "/press", label: "Funders & press" },
  ].map((n, i) => ({ key: `engage:${n.href}`, label: n.label, href: n.href, location: "engage", sort_order: i })),
].map(({ key, ...n }) => ({ id: seedId(`nav:${key}`), is_external: false, is_visible: true, parent_id: null as string | null, ...n }));

// ─── Collections ─────────────────────────────────────────────────────
const isoFromSort = (sort: string) => (/^\d{4}-\d{2}$/.test(sort) ? `${sort}-01` : null);

export const seedMilestones = [
  ...milestoneData.map((m, i) => ({
    id: seedId(`milestone:${m.sort}:${slugify(m.title)}`),
    title: m.title,
    event_date: m.title.includes("HackAtom") ? "2025-12-15" : isoFromSort(m.sort),
    date_label: m.date,
    description: m.body,
    category: m.kind,
    image_id: m.image ? mid(m.image.src) : null,
    image_position: m.image?.position ?? null,
    link_url: m.link?.href ?? null,
    link_label: m.link?.label ?? null,
    is_upcoming: false,
    featured: m.kind === "Recognition",
    sort_order: i,
    status: "published",
  })),
  {
    id: seedId("milestone:upcoming:shurugwi"),
    title: "First pilot hub: Shurugwi",
    event_date: null,
    date_label: "Next",
    description: "Midlands Province, Zimbabwe. Taking the work from research and prototype to a first community microgrid. The pilot is in preparation and not yet operational.",
    category: "Upcoming",
    image_id: null,
    image_position: null,
    link_url: "/pilot",
    link_label: "See the pilot plan",
    is_upcoming: true,
    featured: true,
    sort_order: milestoneData.length,
    status: "published",
  },
];

export const seedPublications = publicationData.map((p, i) => ({
  id: seedId(`publication:${p.href}`),
  outlet: p.outlet,
  headline: p.headline,
  published_on: null as string | null,
  date_label: p.date,
  url: p.href,
  description: p.description,
  category: p.category,
  cover_image_id: p.image ? mid(p.image.src) : null,
  featured: i < 2,
  sort_order: i,
  status: "published",
}));

export const seedAwards = [
  {
    key: "brics-2026",
    title: "2nd Place: Sustainable Development and Green Solutions",
    organisation: "BRICS+ Youth Innovation Summit · South African BRICS Youth Association",
    award_date: "2026-04-01",
    date_label: "Apr 2026",
    location: "Pretoria, South Africa",
    description: "Second place in the Sustainable Development and Green Solutions category.",
    image_id: mid("/images/milestones/brics-trophy.jpg"),
    url: "https://www.heraldonline.co.zw/zim-student-shines-on-global-stage/",
  },
  {
    key: "hackatom-2025",
    title: "Finalist: Global HackAtom International Student Championship",
    organisation: "Rosatom",
    award_date: "2025-12-15",
    date_label: "Dec 2025",
    location: "Moscow, Russia (final, September 2025)",
    description: "Finalist in the first Global HackAtom International Student Championship, recognised by Rosatom Africa for advancing sustainable energy innovation.",
    image_id: mid("/images/milestones/hackatom-certificate.jpg"),
    url: "https://www.facebook.com/share/p/1AXBa6ouSn/",
  },
  {
    key: "green-generation-2025",
    title: "Africa's Net Green Leader Award",
    organisation: "Green Generation Initiative",
    award_date: "2025-08-15",
    date_label: "Aug 2025",
    location: "Nairobi, Kenya",
    description: "Recognised for leadership and impact in advancing environmental sustainability and youth-driven climate action through community-based initiatives and clean energy solutions.",
    image_id: mid("/images/milestones/green-award-nairobi.jpg"),
    url: "https://tinyurl.com/3nb733hc",
  },
  {
    key: "jlmcf-launch-2025",
    title: "Launch stage: one of 60 ventures selected",
    organisation: "Jim Leech Mastercard Foundation Fellowship on Entrepreneurship",
    award_date: "2025-05-15",
    date_label: "May 2025",
    location: null,
    description: "Selected for the Launch stage of the fellowship after completing the Explore and Ignite stages.",
    image_id: mid("/images/fellowship/jlmcf-launch.jpg"),
    url: "https://tinyurl.com/k4feh3n3",
  },
  {
    key: "bevisioneers-2026",
    title: "Selected: beVisioneers, The Mercedes-Benz Fellowship, Cohort 4",
    organisation: "beVisioneers",
    award_date: "2026-07-01",
    date_label: "Jul 2026",
    location: null,
    description: "Selected for the global fellowship for young innovators building planet-positive solutions.",
    image_id: null,
    url: null,
  },
].map(({ key, ...a }, i) => ({ id: seedId(`award:${key}`), featured: i < 3, sort_order: i, status: "published", ...a }));

const capabilityKey = (name: string) => slugify(name).slice(0, 40);

export const seedTechnology = [
  ...approach.map((s, i) => ({ kind: "approach_step", key: s.key, title: s.title, kicker: s.kicker, body: s.body, points: [] as string[], status_label: null as string | null, note: null as string | null, enables: null as string | null, sort_order: i })),
  ...capabilities.map((c, i) => ({ kind: "capability", key: capabilityKey(c.name), title: c.name, kicker: null, body: "", points: [] as string[], status_label: c.status, note: c.note, enables: null, sort_order: i })),
  ...productiveUses.map((u, i) => ({ kind: "productive_use", key: u.key, title: u.title, kicker: null, body: u.body, points: [] as string[], status_label: null, note: null, enables: u.enables, sort_order: i })),
  ...gridComponents.map((g, i) => ({ kind: "microgrid_component", key: g.id, title: g.name, kicker: g.kicker, body: g.summary, points: g.points, status_label: null, note: null, enables: null, sort_order: i })),
].map((t) => ({ id: seedId(`tech:${t.kind}:${t.key}`), image_id: null as string | null, status: "published", ...t }));

export const seedPrinciples = principleData.map((p, i) => ({ id: seedId(`principle:${slugify(p.title)}`), title: p.title, body: p.body, sort_order: i, status: "published" }));

const founderBio = copy.founder.paragraphs.map((p) => `<p>${p}</p>`).join("");

export const seedPeople = team.map((m, i) => {
  const founder = i === 0;
  return {
    id: seedId(`person:${slugify(m.name)}`),
    name: m.name,
    role: m.role,
    country: m.country,
    bio: founder ? founderBio : "",
    quote: founder ? copy.founder.quote : null,
    quote_source_label: founder ? copy.founder.quoteSource.label : null,
    quote_source_url: founder ? copy.founder.quoteSource.href : null,
    image_id: founder ? mid("/images/founder/sean-pitching-close.jpg") : null,
    social_links: founder ? seedSettings.social_links : [],
    is_founder: founder,
    sort_order: i,
    status: "published",
  };
});

export const seedProjects = [
  {
    id: seedId("project:shurugwi-pilot-hub"),
    name: "Shurugwi pilot hub",
    slug: "shurugwi-pilot-hub",
    summary: "VoltageAfrica's proposed first community microgrid, in Shurugwi, Midlands Province, Zimbabwe. In preparation, not yet operational.",
    body: [
      "<p>The Shurugwi pilot will be VoltageAfrica's first community energy hub. In May 2025 we engaged five villages (Zura, Chinderera, Chinho, Mapako and Madungwe) through local leadership, held 23 household interviews and 6 interviews with community leaders, and received 27 completed surveys.</p>",
      "<h3>What communities told us</h3>",
      `<ul>${shurugwi.heard.map((h) => `<li>${h}</li>`).join("")}</ul>`,
      "<h3>Status</h3><p>The pilot is in preparation. Site and load assessment comes next; specifications will follow that assessment.</p>",
    ].join(""),
    stage: "In preparation",
    location: "Shurugwi, Midlands Province, Zimbabwe",
    cover_image_id: null as string | null,
    categories: ["Solar microgrid", "Rural electrification", "Pilot"],
    featured: true,
    sort_order: 0,
    status: "published",
  },
];

export const seedProjectMilestones = seedMilestones
  .filter((m) => /interviews|Field research|Hardware prototype|Shurugwi/.test(m.title))
  .map((m) => ({ project_id: seedProjects[0].id, milestone_id: m.id }));

// ─── Pages & sections ────────────────────────────────────────────────
type SectionSeed = { key: string; type: string; label?: string; content: Record<string, unknown>; settings?: Record<string, unknown> };

/** Photo plates: real VoltageAfrica photography (or credited landscapes) with honest captions. */
const plate = (path: string, imageCaption: string, imagePosition = "") => ({ image: img(path), imageCaption, imagePosition });
const introPlates: Partial<Record<keyof typeof pageData, ReturnType<typeof plate>>> = {
  vision: plate("/images/outreach/kigali-lesson-group.jpg", "A VoltageAfrica renewable energy and conservation lesson with secondary-school students in Kigali, Rwanda.", "50% 45%"),
  technology: plate("/images/prototype/tracker-array.jpg", "VoltageAfrica’s sun-tracking prototype, 2025: four 15 W solar modules steered by a central light sensor.", "50% 55%"),
  about: plate("/images/milestones/green-generation-team.jpg", "Tree planting with the Green Generation Initiative. Energy access and environmental care go together.", "50% 35%"),
};

const pageIntro = (k: keyof typeof pageData): SectionSeed => {
  const p = pageData[k];
  return {
    key: "intro",
    type: "page_intro",
    content: { kicker: p.title, headline: p.headline, intro: p.intro, index: (p.sections ?? []).map((s) => ({ label: s.label, anchor: s.id })), ...(introPlates[k] ?? {}) },
  };
};

const nextPage = (k: keyof typeof pageData): SectionSeed | null => {
  const n = pageData[k].next;
  if (!n) return null;
  const target =
    n === "microgrid"
      ? { title: "The microgrid exhibit", line: "Explore an interactive 3D model of a community energy hub.", href: "/microgrid" }
      : { title: pageData[n].title, line: pageData[n].headline.replace(/\*/g, ""), href: pageData[n].href };
  return { key: "next", type: "next_page", content: { kicker: "Next", ...target } };
};

const c = copy;

/** "At a glance": verifiable facts shown on the homepage and the funders & press page. */
const keyFacts = [
  { label: "First pilot hub", value: "In preparation", detail: "Shurugwi, Midlands Province, Zimbabwe. Not yet operational.", href: "/pilot" },
  { label: "Community research", value: "5 villages", detail: "23 household interviews, 6 community leaders and 27 surveys (May 2025).", href: "/documents/voltageafrica-shurugwi-validation-report-2025.pdf" },
  { label: "Prototype", value: "Built & tested", detail: "Sun-tracking rig: four 15 W modules steered by a light sensor (2025).", href: "/technology#approach" },
  { label: "Team", value: "4 people", detail: "Working across Zimbabwe, Rwanda and Kenya.", href: "/about" },
  { label: "Recognition", value: "5 awards", detail: "Prizes and selections, including 2nd place at the BRICS+ Youth Innovation Summit 2026.", href: "/impact#awards" },
  { label: "Building since", value: "2024", detail: "From an energy-trading prototype to field research and hardware.", href: "/journey" },
];

const privacyHtml = [
  "<h2>Who we are</h2>",
  "<p>This website is run by VoltageAfrica (\u201cwe\u201d, \u201cus\u201d), a venture building renewable energy infrastructure, working across Zimbabwe, Rwanda and Kenya. For any question about your personal information, use our <a href=\"/contact\">contact page</a> or email the address shown there.</p>",
  "<h2>What we collect</h2>",
  "<p>We only collect what you choose to send us through the forms on this site:</p>",
  "<ul><li><strong>Partnership inquiries:</strong> your name, organisation, email, country, partnership category, proposal and message, and optionally your phone number and website or LinkedIn address.</li><li><strong>Support inquiries:</strong> your name, email, country, the kind of support you are offering, an optional amount and currency, and your message. Submitting this form is not a payment, and we never ask for card or bank details on this site.</li><li><strong>Contact messages:</strong> your name, email, subject, inquiry category and message.</li></ul>",
  "<p>To protect the forms from spam and abuse, we also store a one-way hash of the network address each submission came from, never the address itself. Our hosting provider keeps short-lived technical logs (for example the pages requested and the browser used) to run the site securely.</p>",
  "<h2>Cookies and similar technologies</h2>",
  "<p>We do not use advertising or analytics cookies, and we do not track you across other websites. Your browser remembers a few small preferences on your own device: whether you chose the film or the 3D view on the homepage and whether you have already seen its opening animation (both for the length of your visit), and whether you chose the light or dark theme (kept until you change it or clear your browser data). None of these are sent to us. Administrators who sign in to manage the site receive a sign-in cookie; visitors do not.</p>",
  "<h2>How we use your information</h2>",
  "<ul><li>to read and reply to your inquiry, and to follow up on a partnership, support offer or request you have made;</li><li>to keep records of those conversations;</li><li>to protect the site and its forms from abuse.</li></ul>",
  "<p>We rely on your consent, which you give by ticking the consent box or by sending us a message, and on our legitimate interest in running and protecting the site. We do not sell your information, use it for automated decision-making or add you to a mailing list without asking.</p>",
  "<h2>Who can see it</h2>",
  "<p>Only VoltageAfrica\u2019s administrators can see submissions. We use trusted service providers to operate the site: <strong>Supabase</strong> (secure database), <strong>Vercel</strong> (website hosting) and <strong>Resend</strong> (sending us a notification email when a submission arrives). They process data on our behalf and may store it on servers outside your country, under their own security and data-protection commitments. We share information with others only when the law requires it.</p>",
  "<h2>How long we keep it</h2>",
  "<p>We keep inquiries for as long as we need them to respond and to manage any relationship that follows. We review stored inquiries at least once a year and delete those we no longer need. You can ask us to delete yours at any time.</p>",
  "<h2>Your rights</h2>",
  "<p>You can ask to see the information we hold about you, to correct it, to delete it, or to withdraw your consent, and you can object to how we use it. Contact us and we will respond as quickly as we can, and within the time the law allows. You also have the right to complain to a data protection authority: in Zimbabwe, the Postal and Telecommunications Regulatory Authority (POTRAZ); in Rwanda, the National Cyber Security Authority; in Kenya, the Office of the Data Protection Commissioner; or the authority where you live.</p>",
  "<h2>Security</h2>",
  "<p>Submissions travel over an encrypted connection and are stored in a database that only signed-in administrators can read. No method of transmission or storage is completely secure, but we take reasonable steps to protect your information.</p>",
  "<h2>Children</h2>",
  "<p>Our forms are intended for adults. If you believe a child has sent us personal information, please contact us and we will delete it.</p>",
  "<h2>Other websites</h2>",
  "<p>This site links to other websites, such as news articles and photograph sources. Their privacy practices are their own.</p>",
  "<h2>Changes to this policy</h2>",
  "<p>We will update this page if the way we handle information changes. Last updated: 20 November 2026.</p>",
].join("");

/** The hero film: five scenes, from the land to the future. Renders are labelled as illustrative. */
const heroScenes = [
  { image: img(landscapes.matobo.src), title: "The land", caption: "Light through a storm over the Matobo Hills, Zimbabwe.", position: "50% 55%", motion: "in" },
  { image: img("/images/outreach/kigali-courtyard.jpg"), title: "The people", caption: "Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda.", position: "50% 62%", motion: "right" },
  { image: img("/images/commons/mini-grid-bayelsa.jpg"), title: "The energy", caption: "A solar mini-grid serving a community in Bayelsa, Nigeria. Not a VoltageAfrica installation.", position: "66% 66%", motion: "left" },
  { image: img("/images/commons/battery-storage-schwerin.jpg"), title: "The intelligence", caption: "Battery racks under continuous computer control at the WEMAG storage plant, Schwerin, Germany. Not a VoltageAfrica installation.", position: "50% 50%", motion: "in" },
  { image: img("/images/commons/golden-sunset-kampala.jpg"), title: "The future", caption: "Golden sunset in Kawempe, Kampala, Uganda.", position: "56% 52%", motion: "out" },
];
const pagesSeed: { slug: string; title: string; description: string; sort: number; sections: (SectionSeed | null)[] }[] = [
  {
    slug: "home",
    title: "Home",
    description: site.description,
    sort: 0,
    sections: [
      {
        key: "hero",
        type: "hero",
        content: {
          kicker: c.hero.kicker,
          headline: c.hero.headline,
          body: c.hero.body,
          primaryCta: link("Explore our vision", "/vision"),
          secondaryCta: link("Partner with us", "/partner"),
          image: img(landscapes.matobo.src),
          scenes: heroScenes,
          sceneDuration: 8,
          enable3d: true,
          defaultMode: "film",
          overlay: 55,
          showScrollCue: false,
        },
      },
      { key: "facts", type: "key_facts", label: "At a glance", settings: { anchor: "at-a-glance" }, content: { kicker: "At a glance", headline: "", items: keyFacts, note: "" } },
      {
        key: "act-reality",
        type: "act",
        label: "Act I · The reality",
        settings: { anchor: "reality" },
        content: {
          layout: "reality",
          numeral: "I",
          kicker: "The reality",
          headline: "When night falls across rural Africa, *opportunity switches off.*",
          body: c.challenge.body,
          image: img(landscapes.chidoma.src),
          imageCaption: "Chidoma Kopje beside the Mapfungautsi Plateau, Midlands Province, Zimbabwe (tonally treated).",
          imagePosition: "50% 60%",
          stats: challengeStats.slice(0, 3).map((s) => ({ value: s.value, unit: s.unit ?? "", label: s.label, source: s.source, sourceUrl: s.href ?? "" })),
        },
      },
      {
        key: "act-idea",
        type: "act",
        label: "Act II · The idea",
        settings: { anchor: "idea" },
        content: {
          layout: "split",
          numeral: "II",
          kicker: "The idea",
          headline: "Start with one community. *Build the system it actually needs.*",
          body: "VoltageAfrica designs complete local energy systems (generation, storage, intelligence and distribution) around the homes, schools and enterprises they serve. We began by listening, then by building.",
          image: img("/images/prototype/tracker-array.jpg"),
          imageCaption: "VoltageAfrica’s sun-tracking prototype, 2025: four 15 W modules steered by a central light sensor.",
          imagePosition: "50% 50%",
          images: [{ image: img("/images/founder/sean-field.jpg"), caption: "Sean Mavhima, founder, in the field." }],
          points: [
            { title: "Listen first", body: "23 household interviews, 6 community leaders and 27 surveys across five Shurugwi villages in May 2025." },
            { title: "Prototype and measure", body: "A sun-tracking rig of four 15 W modules, built and tested in 2025." },
            { title: "Design for productive use", body: "Hubs sized around mills, pumps and cold rooms as well as homes, because income is what makes energy access last." },
          ],
          cta: link("Our approach", "/technology#approach"),
        },
      },
      { key: "exhibit", type: "microgrid_exhibit", settings: { anchor: "microgrid" }, content: { kicker: "Act III · The system", headline: c.microgrid.headline, intro: c.microgrid.intro, cta: link("Enter the full-screen exhibit", "/microgrid"), disclaimer: c.microgrid.disclaimer } },
      {
        key: "act-intelligence",
        type: "act",
        label: "Act IV · The intelligence",
        settings: { anchor: "intelligence" },
        content: {
          layout: "register",
          numeral: "IV",
          kicker: "The intelligence",
          headline: "An intelligence layer, *stated honestly.*",
          body: "Monitoring, metering and control come first. Forecasting and optimisation follow once a live hub produces real operating data. Here is exactly where each capability stands today.",
          cta: link("How the technology works", "/technology#intelligence"),
          note: "We do not yet operate AI systems in any community. Statuses are updated as work progresses.",
        },
      },
      {
        key: "act-impact",
        type: "act",
        label: "Act V · The impact",
        settings: { anchor: "impact" },
        content: {
          layout: "mosaic",
          numeral: "V",
          kicker: "The impact",
          headline: "Electricity is not the end goal. *It is the foundation.*",
          body: "Light for evening study. Cold storage for medicines and harvests. Power for the mill, the pump and the workshop. Energy matters for what it lets people do.",
          images: [
            { image: img("/images/outreach/kigali-classroom.jpg"), caption: "A class after a VoltageAfrica conservation and renewable energy lesson, Kigali." },
            { image: img("/images/milestones/green-generation-planting.jpg"), caption: "Tree planting with the Green Generation Initiative." },
            { image: img("/images/outreach/kigali-school-group.jpg"), caption: "Students and the team after a lesson in Kigali." },
          ],
          points: beyondLighting.map((b) => ({ title: b.title, body: b.body })),
          note: "What reliable energy makes possible, as described in our community research. VoltageAfrica will publish measured impact once its first hub is operating.",
        },
      },
      { key: "future", type: "future", settings: { anchor: "ambition" }, content: { kicker: "Act VI · The ambition", headline: c.future.headline, intro: c.future.intro, stages: futureStages.map((s) => ({ title: s.title, horizon: s.horizon, body: s.body })) } },
      {
        key: "act-invitation",
        type: "act",
        label: "Act VII · Invitation",
        settings: { anchor: "get-involved" },
        content: {
          layout: "invitation",
          numeral: "VII",
          kicker: "Invitation",
          headline: "Let’s build what *comes next.*",
          body: c.contact.intro,
          image: img("/images/renders/hub-dusk.jpg"),
          imageCaption: "Illustrative render of a connected community at dusk. A vision, not an existing installation.",
          imagePosition: "50% 50%",
          links: pathwaysCopy.items.map((i) => ({ title: i.title, body: i.body, href: i.href })),
        },
      },
    ],
  },
  {
    slug: "vision",
    title: pageData.vision.title,
    description: pageData.vision.description,
    sort: 1,
    sections: [
      pageIntro("vision"),
      {
        key: "challenge",
        type: "challenge",
        settings: { anchor: "challenge" },
        content: {
          kicker: c.challenge.kicker,
          interlude: c.challenge.interlude,
          body: c.challenge.body,
          image: img(landscapes.chidoma.src),
          stats: challengeStats.map((s) => ({ value: s.value, unit: s.unit ?? "", label: s.label, source: s.source, sourceUrl: s.href ?? "" })),
          beyondKicker: "Why it matters beyond lighting",
          beyondTitle: c.challenge.beyond,
          beyond: beyondLighting.map((b) => ({ title: b.title, body: b.body })),
        },
      },
      { key: "future", type: "future", settings: { anchor: "future" }, content: { kicker: c.future.kicker, headline: c.future.headline, intro: c.future.intro, stages: futureStages.map((s) => ({ title: s.title, horizon: s.horizon, body: s.body })) } },
      nextPage("vision"),
    ],
  },
  {
    slug: "technology",
    title: pageData.technology.title,
    description: pageData.technology.description,
    sort: 2,
    sections: [
      pageIntro("technology"),
      { key: "approach", type: "approach", settings: { anchor: "approach" }, content: { kicker: c.approach.kicker, headline: c.approach.headline, intro: c.approach.intro, figureImage: img("/images/prototype/tracker-sensor.jpg"), figureCaption: "VoltageAfrica’s sun-tracking prototype: four 15 W modules steered by a light sensor.", figureYear: "2025" } },
      {
        key: "intelligence",
        type: "intelligence",
        settings: { anchor: "intelligence" },
        content: {
          kicker: c.intelligence.kicker,
          headline: c.intelligence.headline,
          intro: c.intelligence.intro,
          disclaimer: "Illustrative model of a conceptual community hub (24 kW solar, 60 kWh storage). Values are generated by a simulation for demonstration. They are not live data and not a VoltageAfrica system specification.",
          registerTitle: "What exists today, and what comes next.",
          footnote: "We do not yet operate AI systems in any community. Forecasting and optimisation depend on real operating data, which the first pilot hub will begin to generate.",
          labCta: link("Open the AI Energy Lab", "/energy-lab"),
        },
      },
      {
        key: "productive",
        type: "productive",
        settings: { anchor: "productive" },
        content: {
          kicker: c.productive.kicker,
          headline: c.productive.headline,
          intro: c.productive.intro,
          chain: [
            { title: "kWh", body: "Reliable daytime power" },
            { title: "Machine", body: "Pump, mill, freezer, tools" },
            { title: "Product", body: "Water, flour, fresh produce" },
            { title: "Income", body: "Sold locally, at better prices" },
          ],
          revenueKicker: "Business model · evolving",
          revenueTitle: "Households are where we start. *Productive use is how hubs become sustainable.*",
          revenue: revenueModel.map((r) => ({ title: r.title, body: r.body })),
        },
      },
      nextPage("technology"),
    ],
  },
  {
    slug: "pilot",
    title: pageData.pilot.title,
    description: pageData.pilot.description,
    sort: 3,
    sections: [
      {
        key: "pilot",
        type: "pilot",
        settings: { anchor: "shurugwi" },
        content: {
          kicker: c.shurugwi.kicker,
          headline: c.shurugwi.headline,
          status: c.shurugwi.status,
          intro: c.shurugwi.intro,
          villages: shurugwi.villages,
          diagramCaption: "Conceptual diagram · not geographic · not to scale",
          researchTitle: "What we have already done · May 2025",
          research: shurugwi.research,
          heardTitle: "What communities told us",
          heard: shurugwi.heard.map((t) => ({ text: t })),
          note: "Three village leaders gave verbal support for a future partnership.",
          hubTitle: "The proposed hub",
          hubNote: "Concept · specifications follow site assessment",
          hub: [
            { title: "Solar array", body: "Ground-mounted generation sized to measured community demand." },
            { title: "Battery storage", body: "Evening and overnight supply, with reserve for cloudy days." },
            { title: "Household connections", body: "Metered, pay-as-you-go access for homes." },
            { title: "Community institutions", body: "Schools such as Chinho Primary School, which expressed interest." },
            { title: "Productive use", body: "Milling, irrigation or cold storage as anchor loads." },
          ],
          stagesTitle: "Pilot development stages",
          stages: shurugwi.stages.map((s) => ({ title: s.title, status: s.status, body: s.body })),
        },
      },
      nextPage("pilot"),
    ],
  },
  { slug: "journey", title: pageData.journey.title, description: pageData.journey.description, sort: 4, sections: [{ key: "timeline", type: "timeline", content: { kicker: c.journey.kicker, headline: c.journey.headline, intro: c.journey.intro } }, nextPage("journey")] },
  {
    slug: "impact",
    title: pageData.impact.title,
    description: pageData.impact.description,
    sort: 5,
    sections: [
      {
        key: "publications",
        type: "publications",
        content: {
          kicker: c.media.kicker,
          headline: c.media.headline,
          intro: c.media.intro,
          spread: [
            { image: img("/images/milestones/brics-summit-pretoria.jpg"), caption: "BRICS+ Youth Innovation Summit, Pretoria: 2nd Place, Sustainable Development and Green Solutions.", date: "Apr 2026" },
            { image: img("/images/milestones/hackatom-stage.jpg"), caption: "Global HackAtom final, Moscow: finalist.", date: "Sep 2025" },
            { image: img("/images/milestones/green-award-nairobi.jpg"), caption: "Africa’s Net Green Leader Award, Nairobi.", date: "Aug 2025" },
          ],
          communityKicker: "In the community · Kigali, Rwanda",
          communityTitle: "Building the next generation of *climate leaders.*",
          communityBody:
            "Our renewable energy education programme teaches primary and secondary students about renewable energy generation, climate change and conservation, including at Camp Kigali School. We run surveys before and after each lesson to measure what students learn.",
          communityImages: [{ image: img("/images/outreach/kigali-school-group.jpg") }, { image: img("/images/outreach/kigali-lesson.jpg") }, { image: img("/images/outreach/kigali-classroom.jpg") }],
        },
      },
      { key: "awards", type: "awards", settings: { background: "paper", anchor: "awards" }, content: { kicker: "Awards & recognition", headline: "Recognised for the work, *not the promise.*", intro: "Prizes, selections and fellowships, each linked to its source where one exists." } },
      nextPage("impact"),
    ],
  },
  {
    slug: "about",
    title: pageData.about.title,
    description: pageData.about.description,
    sort: 6,
    sections: [
      pageIntro("about"),
      { key: "founder", type: "founder", settings: { anchor: "founder" }, content: { kicker: c.founder.kicker, headline: c.founder.headline, showTeam: true, teamTitle: "The team" } },
      { key: "principles", type: "principles", settings: { anchor: "principles" }, content: { kicker: c.principles.kicker, headline: c.principles.headline, intro: c.principles.intro, image: img(landscapes.chiremba.src) } },
      nextPage("about"),
    ],
  },
  {
    slug: "contact",
    title: pageData.contact.title,
    description: pageData.contact.description,
    sort: 7,
    sections: [{ key: "contact", type: "contact", content: { ...contactCopy, ...plate("/images/founder/sean-field.jpg", "Sean Mavhima, founder of VoltageAfrica, in the field.", "50% 40%"), kicker: c.contact.kicker, headline: c.contact.headline, intro: c.contact.intro, audiences: c.contact.audiences } }],
  },
  {
    slug: "partner",
    title: "Partner with us",
    description: "Partner with VoltageAfrica: energy companies, NGOs, governments, investors, universities, technology and equipment suppliers working towards accessible, intelligent and sustainable energy infrastructure.",
    sort: 9,
    sections: [{ key: "partnership", type: "partnership", content: { ...partnershipCopy, ...plate("/images/milestones/brics-summit-pretoria.jpg", "Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit, Pretoria, South Africa, April 2026.", "50% 30%") } }],
  },
  {
    slug: "support",
    title: "Support VoltageAfrica",
    description: "Support VoltageAfrica's mission with funding, equipment, technical expertise or institutional support, from community energy pilots to battery storage and productive-use solutions.",
    sort: 10,
    sections: [{ key: "donate", type: "donate", settings: { anchor: "donate" }, content: { ...donateCopy } }, { key: "support", type: "support", content: { ...supportCopy, ...plate("/images/outreach/kigali-courtyard.jpg", "Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda. Community energy education is one of the areas support makes possible.", "50% 72%") } }],
  },
  {
    slug: "press",
    title: "Funders & press",
    description: "VoltageAfrica for funders, programme officers and journalists: key facts, research report, logos, photographs and ready-to-use descriptions.",
    sort: 11,
    sections: [
      {
        key: "intro",
        type: "page_intro",
        content: {
          kicker: "Funders & press",
          headline: "Everything you need to *evaluate VoltageAfrica.*",
          intro: "Key facts, our research report, logos, photographs and ready-to-use descriptions, in one place. Figures link to their source or to our own research.",
          index: [
            { label: "At a glance", anchor: "facts" },
            { label: "Documents, logos & photographs", anchor: "downloads" },
            { label: "About VoltageAfrica, ready to use", anchor: "about-texts" },
            { label: "Recognition", anchor: "recognition" },
          ],
        },
      },
      { key: "facts", type: "key_facts", settings: { anchor: "facts", background: "paper" }, content: { kicker: "At a glance", headline: "Where VoltageAfrica *stands today.*", items: keyFacts, note: "Status as of November 2026. The pilot hub is in preparation; VoltageAfrica does not yet operate a microgrid." } },
      {
        key: "downloads",
        type: "downloads",
        settings: { anchor: "downloads" },
        content: {
          kicker: "Downloads",
          headline: "Documents, logos *and photographs.*",
          intro: "Download what you need. Documents marked \u201con request\u201d are shared directly by email, so we can send the current version.",
          items: [
            { group: "Documents", title: "Shurugwi community outreach & validation report", description: "Five villages, 23 household interviews, 6 community leaders and 27 surveys. May 2025.", href: "/documents/voltageafrica-shurugwi-validation-report-2025.pdf", meta: "PDF · 3 pages · 216 KB" },
            { group: "Documents", title: "Pitch deck", description: "Our presentation for investors, funders and partners.", href: "", meta: "" },
            { group: "Documents", title: "Venture overview & impact report", description: "The venture in detail: approach, technology and intended impact.", href: "", meta: "" },
            { group: "Documents", title: "Venture description", description: "A short written summary of VoltageAfrica.", href: "", meta: "" },
            { group: "Brand", title: "Logo pack", description: "Horizontal, stacked, symbol and wordmark logos in every tone, with usage guidance.", href: "/brand/voltageafrica-logo-pack.zip", meta: "ZIP · SVG + PNG · 1.6 MB" },
            { group: "Brand", title: "Primary logo", description: "Horizontal logo for light backgrounds.", href: "/brand/logo-horizontal-primary.svg", meta: "SVG · 19 KB" },
            { group: "Photographs", title: "Sean Mavhima, founder", description: "In the field, Zimbabwe.", href: "/images/founder/sean-field.jpg", meta: "JPG · 2200 × 1467 · 688 KB" },
            { group: "Photographs", title: "Sun-tracking prototype, 2025", description: "Four 15 W modules steered by a central light sensor.", href: "/images/prototype/tracker-array.jpg", meta: "JPG · 1916 × 2000 · 574 KB" },
            { group: "Photographs", title: "Climate education session, Kigali", description: "Students and the VoltageAfrica team after a renewable energy lesson.", href: "/images/outreach/kigali-school-group.jpg", meta: "JPG · 2000 × 1125 · 391 KB" },
          ],
          requestSubject: "Document request",
          note: "Photographs: \u00a9 VoltageAfrica. You may use them in coverage of VoltageAfrica with the credit \u201cVoltageAfrica\u201d; for any other use, please ask. Please follow the logo guidance in the pack.",
        },
      },
      {
        key: "about",
        type: "boilerplate",
        settings: { anchor: "about-texts", background: "paper" },
        content: {
          kicker: "Ready to use",
          headline: "About VoltageAfrica, *in your word count.*",
          intro: "Copy any of these into an article, a programme application or an introduction. Each one is accurate as of November 2026.",
          blocks: [
            { label: "One line", text: "VoltageAfrica designs intelligent solar microgrids for rural communities beyond the reach of the national grid, starting with a pilot hub in Shurugwi, Zimbabwe." },
            { label: "About · short", text: "VoltageAfrica is building intelligent renewable energy infrastructure for rural Africa: community solar microgrids that combine generation, battery storage, smart metering and distribution, designed around the homes, schools and enterprises they serve. Founded by Sean Mavhima, the team works across Zimbabwe, Rwanda and Kenya. Its first pilot hub, in Shurugwi, Zimbabwe, is in preparation." },
            { label: "About · long", text: "VoltageAfrica is building intelligent renewable energy infrastructure for communities the national grid has not reached. In rural Zimbabwe, only 23.4% of residents have grid electricity (ZimStat, 2022 census).\n\nEach VoltageAfrica hub is a complete local energy system: solar generation, battery storage, smart metering and a low-voltage network, sized around productive uses such as milling, irrigation and cold storage as well as homes, because income is what makes energy access last.\n\nThe venture began with research: in May 2025 the team engaged five villages in Shurugwi, held 23 household interviews and 6 interviews with community leaders, and collected 27 surveys. It has built and tested a sun-tracking prototype, and its first pilot hub in Shurugwi is in preparation. VoltageAfrica placed second in Sustainable Development and Green Solutions at the BRICS+ Youth Innovation Summit 2026 and was a finalist in the Global HackAtom International Student Championship." },
            { label: "Founder bio", text: "Sean Mavhima is the founder and CEO of VoltageAfrica. He grew up in rural Zimbabwe, where access to electricity, textbooks and digital tools was a daily struggle. A Mastercard Foundation Scholar at the University of Rwanda, he works where energy, intelligent systems and entrepreneurship meet, building the infrastructure he grew up without for the communities that still live without it." },
          ],
          contactTitle: "Press & funder contact",
          contactNote: "We usually reply within a few working days.",
        },
      },
      { key: "recognition", type: "awards", settings: { anchor: "recognition", background: "parchment" }, content: { kicker: "Recognition", headline: "Prizes, selections *and fellowships.*", intro: "Each linked to its source where one exists." } },
    ],
  },
  {
    slug: "energy-lab",
    title: "AI Energy Lab",
    description: "VoltageAfrica's AI Energy Lab: an interactive, simulated community microgrid. Explore energy flows, run what-if scenarios, compare intelligent management with an uncontrolled system, and ask the energy copilot. All data is simulated.",
    sort: 13,
    sections: [
      {
        key: "lab",
        type: "energy_lab",
        content: {
          kicker: "VoltageAfrica AI Energy Lab",
          headline: "Intelligent energy. *Simulated, explored, explained.*",
          intro: "Step inside a simulated community microgrid. Change the weather, the equipment and the community's demand, then watch how an intelligent energy manager decides what to supply, when, and what to protect, and why.",
          paused: false,
          pausedMessage: "The Energy Lab is being updated and will be back shortly.",
          disclaimer: "Everything in the Energy Lab is a simulation of a conceptual hub. VoltageAfrica does not yet operate a microgrid, and nothing here is live data, a field measurement or a validated forecast. The lab does not control any equipment.",
          features: [
            { title: "A real simulator", body: "Sun position, weather, temperature, battery efficiencies and eleven community loads, every 15 minutes." },
            { title: "An optimiser", body: "Schedules pumping and milling into solar surplus and protects a reserve for the clinic." },
            { title: "A copilot", body: "Explains the system and runs what-if simulations, grounded in the simulator's own numbers." },
          ],
          defaultPreset: "sunny",
          defaultLevel: "explore",
          presets: [],
          households: 60,
          solarKwp: 30,
          batteryKwh: 80,
          reservePct: 25,
          education: [
            { title: "Why a battery reserve?", body: "Without load management, an empty battery switches off the whole village at once, the clinic included. Holding back a reserve that only critical services may use keeps the vaccine fridge and the lights on when everything else must wait." },
            { title: "Why move the mill?", body: "Solar power is free at midday and expensive at night, because night-time energy has to pass through the battery, losing about 10% and wearing it out. Running flexible machines in the sun saves the battery for the evening." },
            { title: "What intelligence cannot do", body: "Scheduling and prioritisation decide who gets the energy. They cannot create it. When demand exceeds what the sun and the battery can supply, the lab says so and shows what equipment would close the gap." },
          ],
          copilotOff: false,
          copilotIntro: "Ask anything about the scenario on screen. The copilot reads the simulator's numbers (generation, demand, battery, the optimiser's recommendations, the forecast) and can run new what-if simulations. If the data cannot answer a question, it says so.",
          suggestedQuestions: [
            "Why is the battery discharging?",
            "What happens if it is cloudy for three days?",
            "Can the system support 20 additional households?",
            "What should we run during the solar peak?",
            "Compare the baseline with the optimised system.",
            "Explain this system to a non-engineer.",
          ],
        },
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    description: "How VoltageAfrica collects, uses and protects personal information submitted through this website.",
    sort: 12,
    sections: [
      { key: "intro", type: "page_intro", content: { kicker: "Privacy policy", headline: "Your information, *handled with care.*", intro: "What we collect through this website, why, who can see it, and the choices you have. Last updated 20 November 2026.", index: [] } },
      { key: "policy", type: "rich_text", settings: { background: "paper" }, content: { kicker: "", headline: "", body: privacyHtml } },
    ],
  },
  {
    slug: "projects",
    title: "Projects",
    description: "VoltageAfrica's projects: from the Shurugwi pilot hub to future community energy initiatives.",
    sort: 8,
    sections: [
      { key: "intro", type: "page_intro", content: { kicker: "Projects", headline: "Work in *progress.*", intro: "Each VoltageAfrica initiative, its stage and its story.", index: [], ...plate("/images/prototype/modules-side.jpg", "Prototype solar modules under test, 2025. Each project starts with something we can build and measure.", "50% 50%") } },
      { key: "list", type: "projects_list", content: { kicker: "", headline: "", intro: "" } },
    ],
  },
];

export const seedPages = pagesSeed.map((p) => ({
  id: seedId(`page:${p.slug}`),
  slug: p.slug,
  title: p.title,
  seo_title: p.slug === "home" ? null : p.title,
  seo_description: p.description,
  status: "published",
  is_system: true,
  sort_order: p.sort,
}));

export const seedSections = pagesSeed.flatMap((p) =>
  p.sections
    .filter((s): s is SectionSeed => !!s)
    .map((s, i) => ({
      id: seedId(`section:${p.slug}:${s.key}`),
      page_id: seedId(`page:${p.slug}`),
      type: s.type,
      label: s.label ?? null,
      content: s.content,
      settings: s.settings ?? {},
      status: "published",
      is_visible: true,
      sort_order: i,
    })),
);

/** Everything, in foreign-key order. */
export const seedTables = {
  media_assets: seedMedia,
  site_settings: [seedSettings],
  navigation_items: seedNavigation,
  pages: seedPages,
  page_sections: seedSections,
  timeline_milestones: seedMilestones,
  publications: seedPublications,
  awards: seedAwards,
  technology_items: seedTechnology,
  principles: seedPrinciples,
  people: seedPeople,
  projects: seedProjects,
  project_milestones: seedProjectMilestones,
} as const;
