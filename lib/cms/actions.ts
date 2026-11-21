"use server";

/**
 * All CMS mutations. Every action:
 *   1. re-verifies the caller is an administrator (server-side, per request)
 *   2. validates input against the field schema (Zod) and sanitizes rich text
 *   3. writes through the admin's session, so Row Level Security applies too
 *   4. revalidates the public site so published changes appear immediately
 */
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getAdmin, type AdminContext } from "./auth";
import { collections, isCollectionKey, type CollectionKey } from "./collections";
import { emptyValue, schemaFor, type Field, type ImageValue } from "./fields";
import { sanitizeByFields } from "./sanitize";
import { sectionTypeMap, settingsFields } from "./section-types";
import { settingsFormFields } from "./settings-fields";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { engagementKinds, engagementStatuses, kinds as engagementKindDefs, statusLabels } from "@/lib/engagement/config";
import { clean } from "@/lib/validation/contact";

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult => ({ ok: false, error, fieldErrors });
const refreshSite = () => revalidatePath("/", "layout");
const uuid = z.string().uuid();
const statusSchema = z.enum(["draft", "published", "archived"]);

async function withAdmin<T extends ActionResult>(fn: (a: AdminContext) => Promise<T>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return fail("Your session has expired or you are not an administrator. Please sign in again.");
  try {
    return await fn(admin);
  } catch (e) {
    unstable_rethrow(e);
    console.error("[cms action]", e);
    return fail(e instanceof Error ? e.message : "Something went wrong.");
  }
}

function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function validate(fields: Field[], values: unknown) {
  const parsed = schemaFor(fields).safeParse(values ?? {});
  if (!parsed.success) return { error: fail("Please fix the highlighted fields.", zodErrors(parsed.error)) };
  return { data: sanitizeByFields(fields, parsed.data as Record<string, unknown>) };
}

/* ═════════════════════════ Auth ═════════════════════════ */

export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase is not configured yet. See the setup steps in README.md.");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin");
  if (!z.email().safeParse(email).success || !password) return fail("Enter your email address and password.");
  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return fail("Those credentials were not recognised.");
  const admin = await getAdmin();
  if (!admin) {
    await db.auth.signOut();
    return fail("This account is not an administrator of this website.");
  }
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function sendMagicLink(_: unknown, form: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase is not configured yet.");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return fail("Enter a valid email address.");
  const db = await createSessionClient();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  // shouldCreateUser:false — a magic link can never create a new account.
  await db.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${site}/admin/auth/callback` } });
  return { ok: true, message: "If this address belongs to an administrator, a sign-in link is on its way." };
}

export async function signOut() {
  if (isSupabaseConfigured) await (await createSessionClient()).auth.signOut();
  redirect("/admin/login");
}

/* ═════════════════════════ Collections ═════════════════════════ */

type Values = Record<string, unknown>;

function toRow(fields: Field[], data: Values): Values {
  const row: Values = {};
  for (const f of fields) {
    let v = data[f.name];
    if (f.kind === "image" || f.kind === "video") v = (v as ImageValue | null)?.id ?? null;
    if (f.kind === "date" || f.kind === "url" || f.kind === "select") v = v === "" ? null : v;
    if ((f.kind === "text" || f.kind === "textarea") && v === "" && !f.required) v = null;
    row[f.name] = v;
  }
  return row;
}

async function nextSort(db: AdminContext["db"], table: string, match?: Record<string, unknown>) {
  let q = db.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (match) for (const [k, v] of Object.entries(match)) q = q.eq(k, v as string);
  const { data } = await q;
  return ((data?.[0]?.sort_order as number) ?? -1) + 1;
}

export async function saveCollectionItem(key: string, id: string | null, values: Values, status?: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!isCollectionKey(key)) return fail("Unknown collection.");
    const def = collections[key];
    const v = validate(def.fields, values);
    if (v.error) return v.error;
    const row = toRow(def.fields, v.data!);
    if (key === "projects" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(row.slug ?? ""))) return fail("Please fix the highlighted fields.", { slug: "Use lowercase letters, numbers and single hyphens." });
    if (key === "technology" && !/^[a-z0-9_-]+$/.test(String(row.key ?? ""))) return fail("Please fix the highlighted fields.", { key: "Use lowercase letters, numbers, hyphens or underscores." });
    if (def.hasStatus && status) row.status = statusSchema.parse(status);
    if (key === "people" && row.is_founder) await db.from("people").update({ is_founder: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000").eq("is_founder", true);

    let savedId = id;
    if (id) {
      if (!uuid.safeParse(id).success) return fail("Invalid item.");
      const { error } = await db.from(def.table).update(row).eq("id", id);
      if (error) return fail(friendly(error.message));
    } else {
      row.sort_order = await nextSort(db, def.table, key === "navigation" ? { location: row.location ?? "header" } : undefined);
      if (key === "navigation" && row.is_visible === false && values.is_visible === undefined) row.is_visible = true;
      const { data, error } = await db.from(def.table).insert(row).select("id").single();
      if (error) return fail(friendly(error.message));
      savedId = data.id as string;
    }

    if (key === "projects" && savedId) {
      const rel = await saveProjectRelations(db, savedId, values);
      if (!rel.ok) return rel;
    }
    refreshSite();
    return { ok: true, id: savedId!, message: status === "published" ? "Published." : "Saved." };
  });
}

async function saveProjectRelations(db: AdminContext["db"], projectId: string, values: Values): Promise<ActionResult> {
  const gallery = Array.isArray(values.__gallery) ? (values.__gallery as { image?: ImageValue | null; caption?: string }[]) : null;
  const milestones = Array.isArray(values.__milestones) ? (values.__milestones as string[]).filter((x) => uuid.safeParse(x).success) : null;
  const pubs = Array.isArray(values.__publications) ? (values.__publications as string[]).filter((x) => uuid.safeParse(x).success) : null;
  if (gallery) {
    await db.from("project_gallery").delete().eq("project_id", projectId);
    const rows = gallery.filter((g) => g.image?.id).map((g, i) => ({ project_id: projectId, media_id: g.image!.id!, caption: String(g.caption ?? "").slice(0, 300) || null, sort_order: i }));
    const unique = rows.filter((r, i) => rows.findIndex((x) => x.media_id === r.media_id) === i);
    if (unique.length) {
      const { error } = await db.from("project_gallery").insert(unique);
      if (error) return fail(friendly(error.message));
    }
  }
  if (milestones) {
    await db.from("project_milestones").delete().eq("project_id", projectId);
    if (milestones.length) await db.from("project_milestones").insert(milestones.map((m) => ({ project_id: projectId, milestone_id: m })));
  }
  if (pubs) {
    await db.from("project_publications").delete().eq("project_id", projectId);
    if (pubs.length) await db.from("project_publications").insert(pubs.map((p) => ({ project_id: projectId, publication_id: p })));
  }
  return { ok: true };
}

export async function setCollectionStatus(key: string, id: string, status: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!isCollectionKey(key) || !collections[key].hasStatus || !uuid.safeParse(id).success) return fail("Invalid request.");
    const { error } = await db.from(collections[key].table).update({ status: statusSchema.parse(status) }).eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: status === "published" ? "Published." : status === "archived" ? "Archived." : "Moved to drafts." };
  });
}

export async function deleteCollectionItem(key: string, id: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!isCollectionKey(key) || !uuid.safeParse(id).success) return fail("Invalid request.");
    const { error } = await db.from(collections[key].table).delete().eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Deleted." };
  });
}

export async function duplicateCollectionItem(key: string, id: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!isCollectionKey(key) || !uuid.safeParse(id).success) return fail("Invalid request.");
    const def = collections[key];
    const { data, error } = await db.from(def.table).select("*").eq("id", id).single();
    if (error || !data) return fail("Item not found.");
    const copy: Values = { ...data };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy[def.titleField] = `${copy[def.titleField]} (copy)`;
    if (def.hasStatus) copy.status = "draft";
    if (key === "projects") copy.slug = `${copy.slug}-copy-${Date.now().toString(36)}`;
    if (key === "technology") copy.key = `${copy.key}-copy`.slice(0, 40);
    if (key === "people") copy.is_founder = false;
    copy.sort_order = await nextSort(db, def.table);
    const ins = await db.from(def.table).insert(copy).select("id").single();
    if (ins.error) return fail(friendly(ins.error.message));
    return { ok: true, id: ins.data.id as string, message: "Duplicated as a draft." };
  });
}

export async function reorderCollection(key: string, ids: string[]): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!isCollectionKey(key) || !ids.every((x) => uuid.safeParse(x).success)) return fail("Invalid request.");
    const table = collections[key].table;
    const results = await Promise.all(ids.map((id, i) => db.from(table).update({ sort_order: i }).eq("id", id)));
    const err = results.find((r) => r.error);
    if (err?.error) return fail(friendly(err.error.message));
    refreshSite();
    return { ok: true, message: "Order saved." };
  });
}

/* ═════════════════════════ Pages ═════════════════════════ */

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.").max(80);
const RESERVED = new Set(["admin", "api", "projects", "microgrid", "home", "_next"]);

export async function createPage(_: unknown, form: FormData): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    const title = String(form.get("title") ?? "").trim();
    const slug = slugSchema.safeParse(String(form.get("slug") ?? ""));
    if (title.length < 2) return fail("Please fix the highlighted fields.", { title: "Give the page a title." });
    if (!slug.success) return fail("Please fix the highlighted fields.", { slug: slug.error.issues[0].message });
    if (RESERVED.has(slug.data)) return fail("Please fix the highlighted fields.", { slug: "That address is reserved." });
    const { data, error } = await db
      .from("pages")
      .insert({ title, slug: slug.data, status: "draft", seo_title: title, sort_order: await nextSort(db, "pages"), updated_by: user.id })
      .select("id")
      .single();
    if (error) return fail(error.code === "23505" ? "A page with that address already exists." : friendly(error.message));
    const intro = sectionTypeMap.page_intro;
    await db.from("page_sections").insert({ page_id: data.id, type: "page_intro", content: { ...emptyValue(intro.fields), kicker: title, headline: title }, status: "draft", sort_order: 0, updated_by: user.id });
    redirect(`/admin/pages/${data.id}`);
  });
}

export async function savePageMeta(id: string, values: { title: string; slug: string; seo_title: string; seo_description: string }): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid page.");
    const { data: page } = await db.from("pages").select("is_system, slug").eq("id", id).single();
    if (!page) return fail("Page not found.");
    const title = String(values.title ?? "").trim();
    if (title.length < 2) return fail("Please fix the highlighted fields.", { title: "Give the page a title." });
    const update: Values = { title, seo_title: String(values.seo_title ?? "").trim().slice(0, 120) || null, seo_description: String(values.seo_description ?? "").trim().slice(0, 300) || null, updated_by: user.id };
    if (!page.is_system) {
      const slug = slugSchema.safeParse(values.slug);
      if (!slug.success) return fail("Please fix the highlighted fields.", { slug: slug.error.issues[0].message });
      if (RESERVED.has(slug.data)) return fail("Please fix the highlighted fields.", { slug: "That address is reserved." });
      update.slug = slug.data;
    }
    const { error } = await db.from("pages").update(update).eq("id", id);
    if (error) return fail(error.code === "23505" ? "A page with that address already exists." : friendly(error.message));
    refreshSite();
    return { ok: true, message: "Page settings saved." };
  });
}

export async function setPageStatus(id: string, status: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid page.");
    const s = statusSchema.parse(status);
    const { data: page } = await db.from("pages").select("slug").eq("id", id).single();
    if (page?.slug === "home" && s !== "published") return fail("The homepage must stay published.");
    const { error } = await db.from("pages").update({ status: s, published_at: s === "published" ? new Date().toISOString() : undefined, updated_by: user.id }).eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: s === "published" ? "Page published." : s === "archived" ? "Page archived." : "Page unpublished." };
  });
}

export async function deletePage(id: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid page.");
    const { data: page } = await db.from("pages").select("is_system").eq("id", id).single();
    if (page?.is_system) return fail("Built-in pages can be unpublished or archived, but not deleted.");
    const { error } = await db.from("pages").delete().eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Page deleted." };
  });
}

/** Publish the page and every pending section draft on it. */
export async function publishPage(id: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid page.");
    const { data: sections } = await db.from("page_sections").select("id, status").eq("page_id", id);
    const ids = (sections ?? []).map((s) => s.id as string);
    const { data: drafts } = ids.length ? await db.from("page_section_drafts").select("*").in("section_id", ids) : { data: [] };
    const now = new Date().toISOString();
    for (const d of drafts ?? []) {
      const { error } = await db.from("page_sections").update({ content: d.content, settings: d.settings, status: "published", published_at: now, updated_by: user.id }).eq("id", d.section_id);
      if (error) return fail(friendly(error.message));
    }
    if (drafts?.length) await db.from("page_section_drafts").delete().in("section_id", drafts.map((d) => d.section_id));
    await db.from("page_sections").update({ status: "published", published_at: now }).eq("page_id", id).eq("status", "draft");
    const { error } = await db.from("pages").update({ status: "published", published_at: now, updated_by: user.id }).eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Page and all drafts published." };
  });
}

/* ═════════════════════════ Sections ═════════════════════════ */

export async function addSection(pageId: string, type: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(pageId).success) return fail("Invalid page.");
    const def = sectionTypeMap[type];
    if (!def) return fail("Unknown section type.");
    const content = emptyValue(def.fields);
    for (const f of def.fields) if (f.kind === "number" && f.name === "overlay") content[f.name] = 50;
    if (def.type === "hero") Object.assign(content, { align: "left", showTrace: true });
    const { data, error } = await db
      .from("page_sections")
      .insert({ page_id: pageId, type, content, settings: {}, status: "draft", sort_order: await nextSort(db, "page_sections", { page_id: pageId }), updated_by: user.id })
      .select("id")
      .single();
    if (error) return fail(friendly(error.message));
    return { ok: true, id: data.id as string, message: `${def.label} added as a draft.` };
  });
}

export async function saveSectionDraft(sectionId: string, content: Values, settings: Values, label?: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { data: section } = await db.from("page_sections").select("type").eq("id", sectionId).single();
    if (!section) return fail("Section not found.");
    const def = sectionTypeMap[section.type as string];
    if (!def) return fail("Unknown section type.");
    const c = validate(def.fields, content);
    if (c.error) return c.error;
    const s = validate(settingsFields, settings);
    if (s.error) return s.error;
    if (s.data!.anchor && !/^[a-z0-9][a-z0-9-]{0,59}$/.test(String(s.data!.anchor))) return fail("Please fix the highlighted fields.", { anchor: "Use lowercase letters, numbers and hyphens." });
    const { error } = await db.from("page_section_drafts").upsert({ section_id: sectionId, content: c.data, settings: s.data, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error) return fail(friendly(error.message));
    if (label !== undefined) await db.from("page_sections").update({ label: label.trim().slice(0, 120) || null }).eq("id", sectionId);
    return { ok: true, message: "Draft saved. Visitors still see the published version." };
  });
}

export async function publishSection(sectionId: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { data: draft } = await db.from("page_section_drafts").select("*").eq("section_id", sectionId).maybeSingle();
    const update: Values = { status: "published", published_at: new Date().toISOString(), updated_by: user.id };
    if (draft) Object.assign(update, { content: draft.content, settings: draft.settings });
    const { error } = await db.from("page_sections").update(update).eq("id", sectionId);
    if (error) return fail(friendly(error.message));
    if (draft) await db.from("page_section_drafts").delete().eq("section_id", sectionId);
    refreshSite();
    return { ok: true, message: "Published." };
  });
}

export async function discardSectionDraft(sectionId: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { error } = await db.from("page_section_drafts").delete().eq("section_id", sectionId);
    if (error) return fail(friendly(error.message));
    return { ok: true, message: "Draft discarded." };
  });
}

export async function setSectionStatus(sectionId: string, status: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { error } = await db.from("page_sections").update({ status: statusSchema.parse(status), updated_by: user.id }).eq("id", sectionId);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: status === "published" ? "Published." : status === "archived" ? "Archived." : "Unpublished." };
  });
}

export async function setSectionVisibility(sectionId: string, visible: boolean): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { error } = await db.from("page_sections").update({ is_visible: visible, updated_by: user.id }).eq("id", sectionId);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: visible ? "Section is visible." : "Section hidden." };
  });
}

export async function duplicateSection(sectionId: string): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { data: s } = await db.from("page_sections").select("*").eq("id", sectionId).single();
    if (!s) return fail("Section not found.");
    const { data: d } = await db.from("page_section_drafts").select("*").eq("section_id", sectionId).maybeSingle();
    const { data: siblings } = await db.from("page_sections").select("id, sort_order").eq("page_id", s.page_id).order("sort_order");
    const settings = { ...((d?.settings ?? s.settings) as Values) };
    delete settings.anchor; // anchors must stay unique
    const { data, error } = await db
      .from("page_sections")
      .insert({ page_id: s.page_id, type: s.type, label: s.label ? `${s.label} (copy)` : null, content: d?.content ?? s.content, settings, status: "draft", sort_order: (s.sort_order as number) + 1, updated_by: user.id })
      .select("id")
      .single();
    if (error) return fail(friendly(error.message));
    const order = (siblings ?? []).map((x) => x.id as string);
    order.splice(order.indexOf(sectionId) + 1, 0, data.id as string);
    await Promise.all(order.map((id, i) => db.from("page_sections").update({ sort_order: i }).eq("id", id)));
    return { ok: true, id: data.id as string, message: "Section duplicated as a draft." };
  });
}

export async function deleteSection(sectionId: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(sectionId).success) return fail("Invalid section.");
    const { error } = await db.from("page_sections").delete().eq("id", sectionId);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Section deleted." };
  });
}

export async function reorderSections(pageId: string, ids: string[]): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(pageId).success || !ids.every((x) => uuid.safeParse(x).success)) return fail("Invalid request.");
    const results = await Promise.all(ids.map((id, i) => db.from("page_sections").update({ sort_order: i }).eq("id", id).eq("page_id", pageId)));
    const err = results.find((r) => r.error);
    if (err?.error) return fail(friendly(err.error.message));
    refreshSite();
    return { ok: true, message: "Section order saved." };
  });
}

/* ═════════════════════════ Media ═════════════════════════ */

const mediaRegisterSchema = z.object({
  bucket: z.enum(["media", "private"]),
  path: z.string().min(3).max(500).regex(/^[a-z0-9][a-z0-9/_.-]*$/i),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(100),
  size_bytes: z.number().int().nonnegative().max(52428800),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  category: z.string().trim().max(40).default("general"),
  alt_text: z.string().trim().max(400).default(""),
  title: z.string().trim().max(200).optional(),
});

export async function registerMedia(input: unknown): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    const p = mediaRegisterSchema.safeParse(input);
    if (!p.success) return fail("Upload details were invalid.");
    const { data, error } = await db
      .from("media_assets")
      .insert({ ...p.data, title: p.data.title || p.data.file_name.replace(/\.[^.]+$/, ""), created_by: user.id })
      .select("id")
      .single();
    if (error) return fail(friendly(error.message));
    return { ok: true, id: data.id as string, message: "Uploaded." };
  });
}

const mediaUpdateSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  alt_text: z.string().trim().max(400).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  caption: z.string().trim().max(300).optional().default(""),
  category: z.string().trim().max(40).optional().default("general"),
  credit_author: z.string().trim().max(120).optional().default(""),
  credit_license: z.string().trim().max(80).optional().default(""),
  credit_license_url: z.string().trim().max(300).optional().default(""),
  credit_source: z.string().trim().max(300).optional().default(""),
});

export async function updateMedia(id: string, input: unknown): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid asset.");
    const p = mediaUpdateSchema.safeParse(input);
    if (!p.success) return fail("Please check the details.", zodErrors(p.error));
    const row = Object.fromEntries(Object.entries(p.data).map(([k, v]) => [k, v === "" && k !== "alt_text" && k !== "category" ? null : v]));
    for (const k of ["credit_license_url", "credit_source"]) if (row[k] && !/^https?:\/\//.test(String(row[k]))) return fail("Please check the details.", { [k]: "Use a full https:// link." });
    const { error } = await db.from("media_assets").update(row).eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Media details saved." };
  });
}

/** Where is an asset used? Checks every FK column and all section content/drafts. */
async function mediaUsage(db: AdminContext["db"], id: string): Promise<string[]> {
  const fk: [string, string, string][] = [
    ["timeline_milestones", "image_id", "title"],
    ["publications", "cover_image_id", "headline"],
    ["awards", "image_id", "title"],
    ["projects", "cover_image_id", "name"],
    ["technology_items", "image_id", "title"],
    ["people", "image_id", "name"],
    ["pages", "og_image_id", "title"],
  ];
  const used: string[] = [];
  const res = await Promise.all(fk.map(([t, col, label]) => db.from(t).select(label).eq(col, id)));
  res.forEach((r, i) => ((r.data ?? []) as unknown as Values[]).forEach((row) => used.push(`${fk[i][0].replace(/_/g, " ")}: ${row[fk[i][2]]}`)));
  const { data: gallery } = await db.from("project_gallery").select("project_id").eq("media_id", id);
  if (gallery?.length) used.push(`project gallery (${gallery.length})`);
  const [{ data: secs }, { data: drafts }] = await Promise.all([db.from("page_sections").select("id, type, content"), db.from("page_section_drafts").select("section_id, content")]);
  for (const s of secs ?? []) if (JSON.stringify(s.content).includes(id)) used.push(`section: ${sectionTypeMap[s.type as string]?.label ?? s.type}`);
  for (const d of drafts ?? []) if (JSON.stringify(d.content).includes(id)) used.push("an unpublished section draft");
  return [...new Set(used)];
}

export async function deleteMedia(id: string, force = false): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    if (!uuid.safeParse(id).success) return fail("Invalid asset.");
    const { data: asset } = await db.from("media_assets").select("bucket, path").eq("id", id).single();
    if (!asset) return fail("Asset not found.");
    const used = await mediaUsage(db, id);
    if (used.length && !force) return fail(`This file is still used in: ${used.slice(0, 6).join("; ")}${used.length > 6 ? "…" : ""}. Replace it there first, or delete anyway.`);
    if (asset.bucket === "media" || asset.bucket === "private") {
      const { error } = await db.storage.from(asset.bucket as string).remove([asset.path as string]);
      if (error) return fail(`Could not delete the stored file: ${error.message}`);
    }
    const { error } = await db.from("media_assets").delete().eq("id", id);
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: asset.bucket === "static" ? "Removed from the library (the bundled file stays in the codebase)." : "Deleted." };
  });
}

export type PickerItem = { id: string; src: string; alt: string; title: string; mime: string | null; category: string; width: number | null; height: number | null; bucket: string };

export async function listMediaForPicker(query: string, kind: "image" | "video" | "any" = "image"): Promise<PickerItem[]> {
  const admin = await getAdmin();
  if (!admin) return [];
  const { mediaUrl } = await import("@/lib/supabase/env");
  let q = admin.db.from("media_assets").select("id, bucket, path, alt_text, title, file_name, mime_type, category, width, height").neq("bucket", "private").order("created_at", { ascending: false }).limit(200);
  if (kind === "image") q = q.like("mime_type", "image/%");
  if (kind === "video") q = q.like("mime_type", "video/%");
  const term = query.trim().replace(/[%_,()]/g, "");
  if (term) q = q.or(`title.ilike.%${term}%,alt_text.ilike.%${term}%,file_name.ilike.%${term}%,category.ilike.%${term}%`);
  const { data } = await q;
  return (data ?? []).map((m) => ({
    id: m.id as string,
    src: mediaUrl(m.bucket as string, m.path as string),
    alt: (m.alt_text as string) ?? "",
    title: ((m.title as string) || (m.file_name as string)) ?? "",
    mime: (m.mime_type as string) ?? null,
    category: m.category as string,
    width: (m.width as number) ?? null,
    height: (m.height as number) ?? null,
    bucket: m.bucket as string,
  }));
}

/* ═════════════════════════ Engagement Inbox ═════════════════════════ */

const kindSchema = z.enum(engagementKinds);
const engagementStatusSchema = z.enum(engagementStatuses);

export async function setEngagementStatus(kind: string, id: string, status: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    const k = kindSchema.safeParse(kind);
    const s = engagementStatusSchema.safeParse(status);
    if (!k.success || !s.success || !uuid.safeParse(id).success) return fail("Invalid request.");
    const update: Values = { status: s.data };
    if (k.data === "contact" && s.data === "completed") update.responded_at = new Date().toISOString();
    const { data, error } = await db.from(engagementKindDefs[k.data].table).update(update).eq("id", id).select("id");
    if (error) return fail(friendly(error.message));
    if (!data?.length) return fail("This submission no longer exists.");
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Marked as ${statusLabels[s.data].toLowerCase()}.` };
  });
}

export async function saveEngagementNotes(kind: string, id: string, notes: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    const k = kindSchema.safeParse(kind);
    if (!k.success || !uuid.safeParse(id).success || typeof notes !== "string") return fail("Invalid request.");
    const value = clean(notes, true);
    if (value.length > 10000) return fail("Notes are too long (10,000 characters max).");
    const { data, error } = await db.from(engagementKindDefs[k.data].table).update({ admin_notes: value || null }).eq("id", id).select("id");
    if (error) return fail(friendly(error.message));
    if (!data?.length) return fail("This submission no longer exists.");
    revalidatePath("/admin/engagement");
    return { ok: true, message: "Notes saved." };
  });
}

export async function deleteEngagement(kind: string, id: string): Promise<ActionResult> {
  return withAdmin(async ({ db }) => {
    const k = kindSchema.safeParse(kind);
    if (!k.success || !uuid.safeParse(id).success) return fail("Invalid request.");
    const { error } = await db.from(engagementKindDefs[k.data].table).delete().eq("id", id);
    if (error) return fail(friendly(error.message));
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Submission deleted." };
  });
}

const notificationSchema = z.object({
  notification_email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address, or leave it empty to use the environment default.")
    .optional()
    .default(""),
  notify_partnership: z.boolean().optional().default(true),
  notify_support: z.boolean().optional().default(true),
  notify_contact: z.boolean().optional().default(true),
});

export async function saveNotificationSettings(values: Values): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    const p = notificationSchema.safeParse(values ?? {});
    if (!p.success) return fail("Please fix the highlighted fields.", zodErrors(p.error));
    const { data, error } = await db
      .from("admin_settings")
      .update({ ...p.data, notification_email: p.data.notification_email || null, updated_by: user.id })
      .eq("id", 1)
      .select("id");
    if (error) return fail(/admin_settings/.test(error.message) ? "Run the engagement database migration (004) first." : friendly(error.message));
    if (!data?.length) return fail("Notification settings are not set up yet. Run the engagement database migration (004).");
    return { ok: true, message: "Notification settings saved." };
  });
}

/* ═════════════════════════ Settings ═════════════════════════ */


export async function saveSettings(values: Values): Promise<ActionResult> {
  return withAdmin(async ({ db, user }) => {
    const v = validate(settingsFormFields, values);
    if (v.error) return v.error;
    const row = { ...v.data! };
    if (row.contact_email && !z.email().safeParse(row.contact_email).success) return fail("Please fix the highlighted fields.", { contact_email: "Enter a valid email address." });
    row.contact_email = row.contact_email || null;
    const { error } = await db.from("site_settings").upsert({ id: 1, ...row, updated_by: user.id });
    if (error) return fail(friendly(error.message));
    refreshSite();
    return { ok: true, message: "Settings saved and published." };
  });
}

/* ═════════════════════════ helpers ═════════════════════════ */

function friendly(message: string): string {
  if (/row-level security/i.test(message)) return "You don't have permission to make this change.";
  if (/duplicate key/i.test(message)) return "That value must be unique, and another item already uses it.";
  if (/violates foreign key/i.test(message)) return "This item is linked to something that no longer exists.";
  return message;
}

export type { CollectionKey };
