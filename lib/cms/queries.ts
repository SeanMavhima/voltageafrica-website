import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { isSupabaseConfigured, mediaUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createSessionClient } from "@/lib/supabase/server";
import * as seed from "./seed";
import type { Award, Media, Milestone, NavItem, Page, Person, Principle, Project, Publication, Section, SiteSettings, TechItem, TechKind } from "./types";

/* ───────────────────────── Row → view-model mappers ───────────────────────── */

type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const sn = (v: unknown) => (typeof v === "string" && v ? v : null);

export function toMedia(m: Row | null | undefined): Media | null {
  if (!m || !m.path) return null;
  const credit = m.credit_author
    ? { author: s(m.credit_author), license: s(m.credit_license), licenseUrl: s(m.credit_license_url), source: s(m.credit_source) }
    : null;
  return {
    id: s(m.id),
    src: mediaUrl(s(m.bucket), s(m.path)),
    alt: s(m.alt_text),
    width: (m.width as number) ?? null,
    height: (m.height as number) ?? null,
    caption: sn(m.caption),
    credit,
  };
}

const toMilestone = (r: Row): Milestone => ({
  id: s(r.id),
  dateLabel: s(r.date_label),
  title: s(r.title),
  body: s(r.description),
  kind: s(r.category),
  image: toMedia(r.image as Row),
  imagePosition: sn(r.image_position),
  link: r.link_url ? { href: s(r.link_url), label: s(r.link_label) || "Read more" } : null,
  isUpcoming: Boolean(r.is_upcoming),
});

const toPublication = (r: Row): Publication => ({
  id: s(r.id),
  outlet: s(r.outlet),
  headline: s(r.headline),
  date: s(r.date_label),
  category: s(r.category),
  description: s(r.description),
  href: s(r.url),
  image: toMedia(r.image as Row),
});

const toAward = (r: Row): Award => ({
  id: s(r.id),
  title: s(r.title),
  organisation: s(r.organisation),
  date: s(r.date_label),
  location: sn(r.location),
  description: s(r.description),
  image: toMedia(r.image as Row),
  url: sn(r.url),
});

const toTech = (r: Row): TechItem => ({
  id: s(r.id),
  kind: s(r.kind) as TechKind,
  key: s(r.key),
  title: s(r.title),
  kicker: sn(r.kicker),
  body: s(r.body),
  points: Array.isArray(r.points) ? (r.points as string[]) : [],
  statusLabel: sn(r.status_label),
  note: sn(r.note),
  enables: sn(r.enables),
  image: toMedia(r.image as Row),
});

const socials = (v: unknown) =>
  Array.isArray(v) ? (v as Row[]).filter((x) => x && typeof x.url === "string").map((x) => ({ label: s(x.label), url: s(x.url) })) : [];

const toPerson = (r: Row): Person => ({
  id: s(r.id),
  name: s(r.name),
  role: s(r.role),
  country: sn(r.country),
  bio: s(r.bio),
  quote: sn(r.quote),
  quoteSource: r.quote_source_label ? { label: s(r.quote_source_label), href: s(r.quote_source_url) } : null,
  image: toMedia(r.image as Row),
  socialLinks: socials(r.social_links),
  isFounder: Boolean(r.is_founder),
});

const toSettings = (r: Row): SiteSettings => ({
  siteName: s(r.site_name) || "VoltageAfrica",
  tagline: s(r.tagline),
  description: s(r.description),
  contactEmail: sn(r.contact_email),
  contactPhone: sn(r.contact_phone),
  contactLocation: sn(r.contact_location),
  socialLinks: socials(r.social_links),
  footerStatement: s(r.footer_statement),
  footerCopyright: s(r.footer_copyright),
  footerRegions: s(r.footer_regions),
  navCta: { label: s(r.nav_cta_label) || "Get in touch", href: s(r.nav_cta_href) || "/contact" },
  navSecondary: s(r.nav_secondary_label) && s(r.nav_secondary_href) ? { label: s(r.nav_secondary_label), href: s(r.nav_secondary_href) } : null,
  defaultSeoTitle: s(r.default_seo_title),
  defaultSeoDescription: s(r.default_seo_description),
});

/* ───────────────────────── Sources ───────────────────────── */

const MEDIA_COLS = "id, bucket, path, alt_text, width, height, caption, credit_author, credit_license, credit_license_url, credit_source";

/** In preview mode use the admin's session (RLS then allows drafts); otherwise the anonymous client. */
async function client() {
  const { isEnabled } = await draftMode();
  return { db: isEnabled ? await createSessionClient() : createPublicClient(), preview: isEnabled };
}

const seedMediaById = new Map(seed.seedMedia.map((m) => [m.id, m as Row]));
const withSeedMedia = (row: Row, col = "image_id"): Row => ({ ...row, image: row[col] ? seedMediaById.get(row[col] as string) ?? null : null });
const published = (r: { status?: string }) => r.status === "published";
const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

function warn(where: string, error: unknown) {
  const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
  console.error(`[cms] ${where} failed, using bundled content: ${msg.split(String.fromCharCode(10))[0]}`);
}

/** Run a Supabase query; on any failure (or when not configured) use the bundled seed. */
async function load<T>(where: string, fromDb: () => Promise<T | null>, fromSeed: () => T): Promise<T> {
  if (!isSupabaseConfigured) return fromSeed();
  try {
    const out = await fromDb();
    return out ?? fromSeed();
  } catch (e) {
    warn(where, e);
    return fromSeed();
  }
}

/* ───────────────────────── Public queries ───────────────────────── */

export const getSiteSettings = cache(async (): Promise<SiteSettings> =>
  load(
    "getSiteSettings",
    async () => {
      const { db } = await client();
      const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data ? toSettings(data as Row) : null;
    },
    () => toSettings(seed.seedSettings as Row),
  ),
);

export const getNavigation = cache(async (location: "header" | "footer" | "engage"): Promise<NavItem[]> =>
  load(
    `getNavigation(${location})`,
    async () => {
      const { db } = await client();
      const { data, error } = await db.from("navigation_items").select("id, label, href, is_external, is_visible, parent_id").eq("location", location).eq("is_visible", true).is("parent_id", null).order("sort_order");
      if (error) throw error;
      return (data as Row[]).map((r) => ({ id: s(r.id), label: s(r.label), href: s(r.href), external: Boolean(r.is_external) }));
    },
    () => seed.seedNavigation.filter((n) => n.location === location && n.is_visible).sort(bySort).map((n) => ({ id: n.id, label: n.label, href: n.href, external: n.is_external })),
  ),
);

export const getPage = cache(async (slug: string): Promise<Page | null> =>
  load(
    `getPage(${slug})`,
    async () => {
      const { db, preview } = await client();
      const { data: page, error } = await db.from("pages").select("id, slug, title, seo_title, seo_description, status").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!page || (!preview && page.status !== "published")) return { notFound: true } as unknown as Page;
      let q = db.from("page_sections").select("id, type, label, content, settings, status, is_visible").eq("page_id", page.id).eq("is_visible", true).order("sort_order");
      q = preview ? q.neq("status", "archived") : q.eq("status", "published");
      const { data: sections, error: sErr } = await q;
      if (sErr) throw sErr;
      let drafts = new Map<string, Row>();
      if (preview && sections?.length) {
        const { data: d } = await db.from("page_section_drafts").select("section_id, content, settings").in("section_id", sections.map((x) => x.id));
        drafts = new Map((d ?? []).map((x) => [x.section_id as string, x as Row]));
      }
      return {
        id: s(page.id),
        slug: s(page.slug),
        title: s(page.title),
        seoTitle: sn(page.seo_title),
        seoDescription: sn(page.seo_description),
        sections: (sections as Row[]).map((r) => {
          const d = drafts.get(s(r.id));
          return { id: s(r.id), type: s(r.type), label: sn(r.label), content: ((d?.content ?? r.content) as Row) ?? {}, settings: ((d?.settings ?? r.settings) as Section["settings"]) ?? {} };
        }),
      };
    },
    () => {
      const p = seed.seedPages.find((x) => x.slug === slug && published(x));
      if (!p) return null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        seoTitle: p.seo_title,
        seoDescription: p.seo_description,
        sections: seed.seedSections
          .filter((x) => x.page_id === p.id && published(x) && x.is_visible)
          .sort(bySort)
          .map((x) => ({ id: x.id, type: x.type, label: x.label, content: x.content as Row, settings: x.settings as Section["settings"] })),
      };
    },
  ).then((p) => (p && (p as unknown as { notFound?: boolean }).notFound ? null : p)),
);

export const getPublishedPageSlugs = cache(async (): Promise<string[]> =>
  load(
    "getPublishedPageSlugs",
    async () => {
      const { data, error } = await createPublicClient().from("pages").select("slug").eq("status", "published");
      if (error) throw error;
      return (data as Row[]).map((r) => s(r.slug));
    },
    () => seed.seedPages.filter(published).map((p) => p.slug),
  ),
);

function collection<T>(table: string, map: (r: Row) => T, seedRows: Row[], opts: { imageCol?: string; filter?: [string, string] } = {}) {
  const imageCol = opts.imageCol ?? "image_id";
  return load(
    `get(${table})`,
    async () => {
      const { db } = await client();
      const select = seedRows.length && imageCol in seedRows[0] ? `*, image:${imageCol}(${MEDIA_COLS})` : "*";
      let q = db.from(table).select(select).eq("status", "published");
      if (opts.filter) q = q.eq(opts.filter[0], opts.filter[1]);
      const { data, error } = await q.order("sort_order");
      if (error) throw error;
      return (data as unknown as Row[]).map(map);
    },
    () =>
      seedRows
        .filter((r) => r.status === "published" && (!opts.filter || r[opts.filter[0]] === opts.filter[1]))
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map((r) => map(withSeedMedia(r, imageCol))),
  );
}

export const getMilestones = cache(() => collection<Milestone>("timeline_milestones", toMilestone, seed.seedMilestones as Row[]));
export const getPublications = cache(() => collection<Publication>("publications", toPublication, seed.seedPublications as Row[], { imageCol: "cover_image_id" }));
export const getAwards = cache(() => collection<Award>("awards", toAward, seed.seedAwards as Row[]));
export const getPrinciples = cache(() => collection<Principle>("principles", (r) => ({ id: s(r.id), title: s(r.title), body: s(r.body) }), seed.seedPrinciples as Row[]));
export const getPeople = cache(() => collection<Person>("people", toPerson, seed.seedPeople as Row[]));
export const getTechnology = cache((kind: TechKind) => collection<TechItem>("technology_items", toTech, seed.seedTechnology as Row[], { filter: ["kind", kind] }));

const toProjectBase = (r: Row): Project => ({
  id: s(r.id),
  slug: s(r.slug),
  name: s(r.name),
  summary: s(r.summary),
  body: s(r.body),
  stage: s(r.stage),
  location: sn(r.location),
  cover: toMedia(r.image as Row),
  categories: Array.isArray(r.categories) ? (r.categories as string[]) : [],
  gallery: [],
  milestones: [],
  publications: [],
});

export const getProjects = cache(() => collection<Project>("projects", toProjectBase, seed.seedProjects as Row[], { imageCol: "cover_image_id" }));

/** Build-time safe (no draft mode): slugs of published projects, for static params and the sitemap. */
export const getPublishedProjectSlugs = cache(async (): Promise<string[]> =>
  load(
    "getPublishedProjectSlugs",
    async () => {
      const { data, error } = await createPublicClient().from("projects").select("slug").eq("status", "published");
      if (error) throw error;
      return (data as Row[]).map((r) => s(r.slug));
    },
    () => seed.seedProjects.filter(published).map((p) => p.slug),
  ),
);

export const getProject = cache(async (slug: string): Promise<Project | null> =>
  load(
    `getProject(${slug})`,
    async () => {
      const { db } = await client();
      const { data, error } = await db
        .from("projects")
        .select(`*, image:cover_image_id(${MEDIA_COLS}), project_gallery(caption, sort_order, media:media_id(${MEDIA_COLS})), project_milestones(milestone:milestone_id(*, image:image_id(${MEDIA_COLS}))), project_publications(publication:publication_id(*, image:cover_image_id(${MEDIA_COLS})))`)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return { notFound: true } as unknown as Project;
      const r = data as Row;
      const p = toProjectBase(r);
      p.gallery = ((r.project_gallery as Row[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map((g) => ({ ...toMedia(g.media as Row)!, galleryCaption: sn(g.caption) }))
        .filter((g) => g.src);
      p.milestones = ((r.project_milestones as Row[]) ?? []).map((x) => x.milestone as Row).filter((m) => m && m.status === "published").map(toMilestone);
      p.publications = ((r.project_publications as Row[]) ?? []).map((x) => x.publication as Row).filter((m) => m && m.status === "published").map(toPublication);
      return p;
    },
    () => {
      const r = seed.seedProjects.find((x) => x.slug === slug && published(x));
      if (!r) return null;
      const p = toProjectBase(withSeedMedia(r as Row, "cover_image_id"));
      const ids = new Set(seed.seedProjectMilestones.filter((x) => x.project_id === r.id).map((x) => x.milestone_id));
      p.milestones = seed.seedMilestones.filter((m) => ids.has(m.id)).map((m) => toMilestone(withSeedMedia(m as Row)));
      return p;
    },
  ).then((p) => (p && (p as unknown as { notFound?: boolean }).notFound ? null : p)),
);

/** Media credited in the footer: every public asset with a credit. */
export const getCreditedMedia = cache(async (): Promise<Media[]> =>
  load(
    "getCreditedMedia",
    async () => {
      const { db } = await client();
      const { data, error } = await db.from("media_assets").select(MEDIA_COLS).not("credit_author", "is", null).neq("bucket", "private").order("created_at");
      if (error) throw error;
      return (data as Row[]).map((r) => toMedia(r)!).filter(Boolean);
    },
    () => seed.seedMedia.filter((m) => m.credit_author).map((m) => toMedia(m as Row)!),
  ),
);

/** Look up a media asset's credit/caption by id (for section images that reference the library). */
export const getMediaById = cache(async (id: string | null | undefined): Promise<Media | null> => {
  if (!id) return null;
  return load(
    `getMediaById(${id})`,
    async () => {
      const { db } = await client();
      const { data, error } = await db.from("media_assets").select(MEDIA_COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toMedia(data as Row) : null;
    },
    () => toMedia(seedMediaById.get(id) ?? null),
  );
});
