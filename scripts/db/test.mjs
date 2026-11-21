/**
 * Database test: migrations, idempotent seed, and Row Level Security.
 *   npm run db:test
 * Runs real PostgreSQL (PGlite) with Supabase's auth/storage schemas stubbed
 * (scripts/db/supabase-stub.sql) and the same API roles Supabase uses.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const db = new PGlite();
let passed = 0;
let failed = 0;
const ok = (name, cond, detail = "") => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}${!cond && detail ? `  → ${detail}` : ""}`);
};

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const USER = "00000000-0000-4000-8000-0000000000b2";

async function as(role, uid, sql, params) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claims', $1, false)", [uid ? JSON.stringify({ sub: uid, role }) : ""]);
  if (role !== "postgres") await db.exec(`set role ${role};`);
  try {
    return { rows: (await db.query(sql, params)).rows, error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  } finally {
    await db.exec("reset role;");
  }
}
const anon = (sql, p) => as("anon", null, sql, p);
const user = (sql, p) => as("authenticated", USER, sql, p);
const admin = (sql, p) => as("authenticated", ADMIN, sql, p);
const root = (sql, p) => as("postgres", null, sql, p);
const count = async (fn, table) => Number((await fn(`select count(*)::int n from ${table}`)).rows[0]?.n ?? -1);

console.log("\nMigrations");
await db.exec(readFileSync("scripts/db/supabase-stub.sql", "utf8"));
const migrations = readdirSync("supabase/migrations").sort();
const ENGAGEMENT = migrations.find((f) => f.includes("_engagement"));
for (const f of migrations) {
  if (f === ENGAGEMENT) {
    // Simulate a live site that already has contact messages in the old workflow.
    await db.exec(`insert into public.contact_messages (name, email, inquiry, message, status) values
      ('Legacy New', 'l1@example.org', 'Something else', 'An older message that was never opened.', 'new'),
      ('Legacy Read', 'l2@example.org', 'Something else', 'An older message that was opened and read.', 'read'),
      ('Legacy Responded', 'l3@example.org', 'Something else', 'An older message that was answered by email.', 'responded'),
      ('Legacy Archived', 'l4@example.org', 'Something else', 'An older message that was archived later.', 'archived')`);
  }
  try {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
    ok(f, true);
  } catch (e) {
    ok(f, false, e.message);
    process.exit(1);
  }
}
const legacy = Object.fromEntries((await db.query("select name, status::text as status, admin_notes from public.contact_messages where name like 'Legacy%'")).rows.map((r) => [r.name, r]));
ok("existing contact messages are kept by the engagement migration", Object.keys(legacy).length === 4);
ok(
  "legacy statuses map onto the new workflow",
  legacy["Legacy New"]?.status === "new" && legacy["Legacy Read"]?.status === "reviewed" && legacy["Legacy Responded"]?.status === "completed" && legacy["Legacy Archived"]?.status === "completed",
  JSON.stringify(legacy),
);
ok("archived messages keep a note of their old state", /Archived before/.test(legacy["Legacy Archived"]?.admin_notes ?? ""));
await db.exec("delete from public.contact_messages where name like 'Legacy%'");
// migrations are re-runnable
try {
  for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  ok("migrations can be re-applied", true);
} catch (e) {
  ok("migrations can be re-applied", false, e.message);
}

console.log("\nSeed");
const seed = readFileSync("supabase/seed.sql", "utf8");
await db.exec(seed);
const tables = ["media_assets", "pages", "page_sections", "timeline_milestones", "publications", "awards", "technology_items", "principles", "people", "projects", "navigation_items"];
const before = {};
for (const t of tables) before[t] = await count(root, `public.${t}`);
ok("seed inserted content", before.pages === 14 && before.page_sections > 20 && before.timeline_milestones === 10, JSON.stringify(before));
await root("update public.timeline_milestones set title = 'Edited in CMS' where date_label = 'Sep 2024'");
await db.exec(seed);
let same = true;
for (const t of tables) if ((await count(root, `public.${t}`)) !== before[t]) same = false;
ok("seed is idempotent (no duplicates on re-run)", same);
const IMAGERY = migrations.find((f) => f.includes("_page_imagery"));
if (IMAGERY) {
  const visionIntro = (await root("select s.id from public.page_sections s join public.pages p on p.id = s.page_id where p.slug = 'vision' and s.type = 'page_intro'")).rows[0].id;
  const techIntro = (await root("select s.id from public.page_sections s join public.pages p on p.id = s.page_id where p.slug = 'technology' and s.type = 'page_intro'")).rows[0].id;
  // Simulate the live site (sections created before photo plates existed) and an editor's own choice.
  await root(`update public.page_sections set content = content - 'image' - 'imageCaption' where id = '${visionIntro}'`);
  await root(`update public.page_sections set content = jsonb_set(content, '{image}', '{"src":"/images/editor-choice.jpg","alt":"x"}') where id = '${techIntro}'`);
  await db.exec(readFileSync(`supabase/migrations/${IMAGERY}`, "utf8"));
  const v = (await root(`select content from public.page_sections where id = '${visionIntro}'`)).rows[0].content;
  ok("imagery migration adds a photo where a section has none", typeof v.image?.src === "string" && v.image.src.includes("kigali") && !!v.imageCaption, JSON.stringify(v.image));
  ok("imagery migration keeps the editor's other content", v.headline && v.intro && Array.isArray(v.index));
  const t = (await root(`select content from public.page_sections where id = '${techIntro}'`)).rows[0].content;
  ok("imagery migration never replaces an image chosen in the CMS", t.image?.src === "/images/editor-choice.jpg");
  ok("new photos are in the media library", (await count(root, "public.media_assets where path like '/images/outreach/kigali-%' or path like '%green-generation-team%'")) === 6);
}
const HOMEPAGE = migrations.find((f) => f.includes("_cinematic_homepage"));
if (HOMEPAGE) {
  const { createHash } = await import("node:crypto");
  const sid = (key) => {
    const h = createHash("sha1").update(`voltageafrica:${key}`).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
  };
  const home = sid("page:home");
  const hero = sid("section:home:hero");
  const acts = ["act-reality", "act-idea", "act-intelligence", "act-impact", "future", "act-invitation"].map((k) => sid(`section:home:${k}`));
  const retired = ["statement", "explore", "cta", "engage"].map((k) => sid(`section:home:${k}`));
  // Recreate the live homepage as it was before this release
  await root(`delete from public.page_sections where id in (${acts.map((a) => `'${a}'`).join(",")})`);
  const factsId = sid("section:home:facts");
  await root(`delete from public.page_sections where id = '${factsId}'`);
  for (const [i, r] of retired.entries()) await root(`insert into public.page_sections (id, page_id, type, content, status, is_visible, sort_order) values ('${r}', '${home}', 'rich_text', '{}', 'published', true, ${i + 1})`);
  await root(`update public.page_sections set content = (content - 'scenes' - 'enable3d' - 'defaultMode' - 'sceneDuration') || '{"primaryCta":{"label":"Explore the microgrid","href":"#microgrid"},"secondaryCta":{"label":"Read our vision","href":"/vision"}}' where id = '${hero}'`);
  await db.exec(readFileSync(`supabase/migrations/${HOMEPAGE}`, "utf8"));
  const h = (await root(`select content from public.page_sections where id = '${hero}'`)).rows[0].content;
  ok("homepage migration adds the five-scene film to the live hero", Array.isArray(h.scenes) && h.scenes.length === 5 && h.enable3d === true, JSON.stringify(Object.keys(h)));
  ok("homepage migration keeps the existing headline", typeof h.headline === "string" && h.headline.includes("village"));
  ok("homepage migration updates untouched hero buttons", h.primaryCta?.href === "/vision" && h.secondaryCta?.href === "/partner", JSON.stringify([h.primaryCta, h.secondaryCta]));
  ok("homepage migration inserts the six story sections", (await count(root, `public.page_sections where id in (${acts.map((a) => `'${a}'`).join(",")})`)) === 6);
  ok("superseded sections are hidden, not deleted", (await count(root, `public.page_sections where id in (${retired.map((a) => `'${a}'`).join(",")}) and not is_visible`)) === 4);
  const order = (await anon(`select type from public.page_sections where page_id = '${home}' order by sort_order`)).rows.map((r) => r.type);
  ok("visitors see the story in order", JSON.stringify(order) === JSON.stringify(["hero", "act", "act", "microgrid_exhibit", "act", "act", "future", "act"]), order.join(","));
  const PRESS = migrations.find((f) => f.includes("_press_privacy"));
  if (PRESS) {
    await db.exec(readFileSync(`supabase/migrations/${PRESS}`, "utf8"));
    const order2 = (await anon(`select type from public.page_sections where page_id = '${home}' order by sort_order`)).rows.map((r) => r.type);
    ok("key facts sit directly after the hero", JSON.stringify(order2) === JSON.stringify(["hero", "key_facts", "act", "act", "microgrid_exhibit", "act", "act", "future", "act"]), order2.join(","));
    await db.exec(readFileSync(`supabase/migrations/${PRESS}`, "utf8"));
    const order3 = (await anon(`select type from public.page_sections where page_id = '${home}' order by sort_order`)).rows.map((r) => r.type);
    ok("re-running the press migration does not reorder the homepage again", JSON.stringify(order3) === JSON.stringify(order2));
    ok("funders & press and privacy pages are public", (await anon("select slug from public.pages where slug in ('press','privacy')")).rows.length === 2);
    ok("the privacy policy has content", JSON.stringify((await anon("select content from public.page_sections s join public.pages p on p.id = s.page_id where p.slug = 'privacy' and s.type = 'rich_text'")).rows).includes("data protection authority"));
  }
  // An editor then customises; a re-run must respect it
  await root(`update public.page_sections set content = jsonb_set(content, '{primaryCta}', '{"label":"Mine","href":"/about"}') where id = '${hero}'`);
  await root(`update public.page_sections set sort_order = 1 where id = '${acts[5]}'`);
  await db.exec(readFileSync(`supabase/migrations/${HOMEPAGE}`, "utf8"));
  ok("re-running keeps an editor's own button", (await root(`select content->'primaryCta'->>'label' l from public.page_sections where id = '${hero}'`)).rows[0].l === "Mine");
  ok("re-running keeps an editor's section order", (await root(`select sort_order from public.page_sections where id = '${acts[5]}'`)).rows[0].sort_order === 1);
  const PHOTOS = migrations.find((f) => f.includes("_hero_photographs"));
  if (PHOTOS) {
    // A hero still showing the earlier renders, plus one scene an editor replaced
    await root(`update public.page_sections set content = jsonb_set(jsonb_set(content, '{scenes,2,image,src}', '"/images/renders/hub-golden.jpg"'), '{scenes,4,image,src}', '"/images/mine.jpg"') where id = '${hero}'`);
    await db.exec(readFileSync(`supabase/migrations/${PHOTOS}`, "utf8"));
    const sc = (await root(`select content->'scenes' s from public.page_sections where id = '${hero}'`)).rows[0].s;
    ok("hero film swaps the original render for the mini-grid photograph", sc[2].image.src === "/images/commons/mini-grid-bayelsa.jpg", sc[2].image.src);
    ok("hero film keeps a scene the editor replaced", sc[4].image.src === "/images/mine.jpg");
    ok("new photographs carry their CC BY-SA credits", (await count(anon, "public.media_assets where path like '/images/commons/%' and credit_license = 'CC BY-SA 4.0' and credit_author is not null")) === 3);
  }
  // restore seeded order for the remaining tests
  await db.exec(seed);
  await root(`update public.page_sections set sort_order = 7 where id = '${acts[5]}'`);
}
ok("re-seeding does not overwrite CMS edits", (await root("select title from public.timeline_milestones where date_label = 'Sep 2024'")).rows[0]?.title === "Edited in CMS");

console.log("\nFixtures");
await root(`insert into auth.users (id, email) values ('${ADMIN}', 'admin@example.org'), ('${USER}', 'stranger@example.org')`);
await root(`insert into public.profiles (id, email, role) values ('${ADMIN}', 'admin@example.org', 'admin')`);
await root(`insert into public.timeline_milestones (title, date_label, status) values ('Secret draft', 'Soon', 'draft')`);
await root(`insert into public.contact_messages (name, email, inquiry, message) values ('Ada', 'ada@example.org', 'Research collaboration', 'A private message that must never be public.')`);
const svc = (sql, p) => as("service_role", null, sql, p);
const partnerIns = await svc(
  `insert into public.partnership_inquiries (full_name, organisation, email, country, category, proposal, message, consent) values ('Grace Partner', 'Solar Co', 'grace@solar.example', 'Kenya', 'Energy Infrastructure', 'Battery storage for the pilot hub', 'We would like to supply storage for the first community hub.', true) returning id`,
);
ok("server (service role) can store a partnership request", !partnerIns.error && partnerIns.rows.length === 1, partnerIns.error);
const supportIns = await svc(
  `insert into public.support_inquiries (full_name, email, country, support_type, support_form, amount, currency, support_area, message, consent) values ('Sam Supporter', 'sam@example.org', 'Rwanda', 'Financial contribution', 'financial', 500, 'USD', 'Battery storage', 'Happy to help fund storage.', true) returning id`,
);
ok("server (service role) can store a support inquiry", !supportIns.error && supportIns.rows.length === 1, supportIns.error);
const PARTNER_ID = partnerIns.rows[0]?.id;
const SUPPORT_ID = supportIns.rows[0]?.id;
const homeId = (await root("select id from public.pages where slug = 'home'")).rows[0].id;
const draftPage = (await root(`insert into public.pages (slug, title, status) values ('unpublished-page', 'Hidden', 'draft') returning id`)).rows[0].id;
await root(`insert into public.page_sections (page_id, type, content, status) values ('${draftPage}', 'rich_text', '{"headline":"on a draft page"}', 'published')`);
const hiddenSection = (await root(`insert into public.page_sections (page_id, type, content, status, is_visible) values ('${homeId}', 'rich_text', '{"headline":"hidden"}', 'published', false) returning id`)).rows[0].id;
const draftSection = (await root(`insert into public.page_sections (page_id, type, content, status) values ('${homeId}', 'rich_text', '{"headline":"draft section"}', 'draft') returning id`)).rows[0].id;
const heroId = (await root("select id from public.page_sections where type = 'hero'")).rows[0].id;
await root(`insert into public.page_section_drafts (section_id, content) values ('${heroId}', '{"headline":"UNPUBLISHED HEADLINE"}')`);
await root(`insert into public.media_assets (bucket, path, file_name, alt_text) values ('private', 'contracts/secret.pdf', 'secret.pdf', 'private')`);
await root(`insert into storage.objects (bucket_id, name) values ('media', 'homepage/a.jpg'), ('private', 'contracts/secret.pdf')`);
ok("fixtures created", true);

for (const [who, q] of [["anonymous visitor", anon], ["signed-in non-admin", user]]) {
  console.log(`\nAs ${who}`);
  ok("reads published pages", (await count(q, "public.pages")) === 14);
  ok("cannot read draft pages", (await q("select 1 from public.pages where status <> 'published'")).rows.length === 0);
  ok("cannot read sections on draft pages", (await q(`select 1 from public.page_sections where page_id = '${draftPage}'`)).rows.length === 0);
  ok("cannot read hidden sections", (await q(`select 1 from public.page_sections where id = '${hiddenSection}'`)).rows.length === 0);
  ok("cannot read draft sections", (await q(`select 1 from public.page_sections where id = '${draftSection}'`)).rows.length === 0);
  ok("cannot read section drafts", (await q("select * from public.page_section_drafts")).rows.length === 0);
  ok("live hero shows published headline, not the draft", !JSON.stringify((await q(`select content from public.page_sections where id = '${heroId}'`)).rows).includes("UNPUBLISHED"));
  ok("cannot read draft milestones", (await q("select 1 from public.timeline_milestones where title = 'Secret draft'")).rows.length === 0);
  ok("reads published milestones", (await count(q, "public.timeline_milestones")) === 10);
  ok("cannot read contact messages", (await q("select * from public.contact_messages")).rows.length === 0);
  for (const t of ["partnership_inquiries", "support_inquiries", "admin_settings"]) {
    const r = await q(`select * from public.${t}`);
    ok(`cannot read ${t}`, r.rows.length === 0, r.error ?? `${r.rows.length} rows visible`);
  }
  ok("cannot insert partnership requests directly", !!(await q(`insert into public.partnership_inquiries (full_name, organisation, email, country, category, proposal, message, consent) values ('Bot', 'Bot', 'b@x.io', 'XX', 'Other', 'spam', 'spam spam spam spam spam spam', true)`)).error);
  ok("cannot insert support inquiries directly", !!(await q(`insert into public.support_inquiries (full_name, email, country, support_type, support_form, support_area, message, consent) values ('Bot', 'b@x.io', 'XX', 'Other', 'other', 'x', 'spam spam spam', true)`)).error);
  await q(`update public.partnership_inquiries set status = 'accepted', admin_notes = 'pwned'`);
  await q(`update public.support_inquiries set status = 'accepted'`);
  await q(`update public.admin_settings set notification_email = 'attacker@evil.example'`);
  ok(
    "cannot update engagement records",
    (await root("select count(*)::int n from public.partnership_inquiries where status = 'accepted' or admin_notes = 'pwned'")).rows[0].n === 0 &&
      (await root("select count(*)::int n from public.support_inquiries where status = 'accepted'")).rows[0].n === 0,
  );
  ok("cannot change the notification recipient", (await root("select notification_email from public.admin_settings")).rows[0].notification_email === null);
  await q("delete from public.partnership_inquiries");
  await q("delete from public.support_inquiries");
  ok("cannot delete engagement records", (await count(root, "public.partnership_inquiries")) === 1 && (await count(root, "public.support_inquiries")) === 1);
  ok("cannot insert contact messages directly", !!(await q("insert into public.contact_messages (name, email, inquiry, message) values ('Bot', 'b@x.io', 'x', 'spam spam spam spam spam spam')")).error);
  ok("cannot insert content", !!(await q("insert into public.publications (outlet, headline, url, status) values ('x','x','https://x','published')")).error);
  await q("update public.timeline_milestones set title = 'defaced'");
  ok("cannot update content", (await root("select count(*)::int n from public.timeline_milestones where title = 'defaced'")).rows[0].n === 0);
  await q("delete from public.principles");
  ok("cannot delete content", (await count(root, "public.principles")) === before.principles);
  await q("update public.site_settings set site_name = 'pwned'");
  ok("cannot change site settings", (await root("select site_name from public.site_settings")).rows[0].site_name === "VoltageAfrica");
  ok("cannot see private media records", (await q("select 1 from public.media_assets where bucket = 'private'")).rows.length === 0);
  ok("reads public storage objects", (await q("select 1 from storage.objects where bucket_id = 'media'")).rows.length === 1);
  ok("cannot read private storage objects", (await q("select 1 from storage.objects where bucket_id = 'private'")).rows.length === 0);
  ok("cannot upload to storage", !!(await q("insert into storage.objects (bucket_id, name) values ('media', 'evil.jpg')")).error);
  ok("cannot grant itself admin", !!(await q(`insert into public.profiles (id, email, role) values ('${USER}', 'x', 'admin')`)).error);
  ok("is_admin() is false", (await q("select public.is_admin() as a")).rows[0]?.a === false);
}

console.log("\nAs administrator");
ok("is_admin() is true", (await admin("select public.is_admin() as a")).rows[0]?.a === true);
ok("reads draft milestones", (await admin("select 1 from public.timeline_milestones where title = 'Secret draft'")).rows.length === 1);
ok("reads section drafts", (await admin("select 1 from public.page_section_drafts")).rows.length === 1);
ok("reads draft & hidden sections", (await admin(`select 1 from public.page_sections where id in ('${hiddenSection}', '${draftSection}')`)).rows.length === 2);
ok("reads contact messages", (await admin("select 1 from public.contact_messages")).rows.length === 1);
const ins = await admin("insert into public.awards (title, organisation, status) values ('New award', 'Org', 'published') returning id");
ok("creates content", !ins.error && ins.rows.length === 1, ins.error);
const upd = await admin(`update public.awards set title = 'Renamed' where id = '${ins.rows[0]?.id}' returning title`);
ok("updates content", upd.rows[0]?.title === "Renamed", upd.error);
ok("updated_at trigger fires", (await root(`select updated_at >= created_at as t from public.awards where id = '${ins.rows[0]?.id}'`)).rows[0]?.t === true);
const del = await admin(`delete from public.awards where id = '${ins.rows[0]?.id}' returning id`);
ok("deletes content", del.rows.length === 1, del.error);
const pub = await admin(`update public.page_sections set content = d.content, status = 'published' from public.page_section_drafts d where d.section_id = page_sections.id and page_sections.id = '${heroId}' returning page_sections.id`);
ok("publishes a section draft", pub.rows.length === 1, pub.error);
ok("published draft becomes public", JSON.stringify((await anon(`select content from public.page_sections where id = '${heroId}'`)).rows).includes("UNPUBLISHED"));
ok("updates message status", !(await admin("update public.contact_messages set status = 'reviewed'")).error);
ok("updates site settings", (await admin("update public.site_settings set tagline = 'New tagline' returning tagline")).rows[0]?.tagline === "New tagline");
ok("uploads to public storage", !(await admin("insert into storage.objects (bucket_id, name) values ('media', 'timeline/new.jpg')")).error);
ok("reads private storage", (await admin("select 1 from storage.objects where bucket_id = 'private'")).rows.length === 1);
ok("sees recent edits", (await admin("select count(*)::int n from public.admin_recent_edits")).rows[0]?.n > 100);
ok("anonymous cannot read recent edits", !!(await anon("select * from public.admin_recent_edits")).error);
ok("only one founder allowed", !!(await admin("update public.people set is_founder = true where is_founder = false")).error);
console.log("\nEngagement Inbox (administrator)");
ok("reads partnership requests", (await admin("select 1 from public.partnership_inquiries")).rows.length === 1);
ok("reads support inquiries", (await admin("select 1 from public.support_inquiries")).rows.length === 1);
const st = await admin(`update public.partnership_inquiries set status = 'in_discussion' where id = '${PARTNER_ID}' returning status`);
ok("updates partnership status", st.rows[0]?.status === "in_discussion", st.error);
const nt = await admin(`update public.support_inquiries set admin_notes = 'Call on Tuesday', status = 'reviewed' where id = '${SUPPORT_ID}' returning admin_notes`);
ok("adds private notes", nt.rows[0]?.admin_notes === "Call on Tuesday", nt.error);
ok("rejects an unknown status", !!(await admin(`update public.partnership_inquiries set status = 'archived' where id = '${PARTNER_ID}'`)).error);
ok("admins cannot insert submissions through the API either", !!(await admin(`insert into public.support_inquiries (full_name, email, country, support_type, support_form, support_area, message, consent) values ('X', 'x@x.io', 'XX', 'Other', 'other', 'x', 'xxxxxxxxxxxx', true)`)).error);
ok("reads notification settings", (await admin("select notify_partnership from public.admin_settings")).rows[0]?.notify_partnership === true);
ok("updates notification recipient", (await admin("update public.admin_settings set notification_email = 'team@voltage.example' returning notification_email")).rows[0]?.notification_email === "team@voltage.example");
ok("rejects an invalid notification email", !!(await admin("update public.admin_settings set notification_email = 'not-an-email'")).error);
const longMsg = "twenty characters or more here";
ok("consent is required", !!(await svc(`insert into public.partnership_inquiries (full_name, organisation, email, country, category, proposal, message, consent) values ('No Consent', 'Org', 'n@x.io', 'Kenya', 'Other', 'xyz', '${longMsg}', false)`)).error);
ok("unknown partnership category is rejected", !!(await svc(`insert into public.partnership_inquiries (full_name, organisation, email, country, category, proposal, message, consent) values ('Bad Cat', 'Org', 'n@x.io', 'Kenya', 'Mining', 'xyz', '${longMsg}', true)`)).error);
ok("non-http websites are rejected", !!(await svc(`insert into public.partnership_inquiries (full_name, organisation, email, country, category, proposal, message, website, consent) values ('JS', 'Org', 'n@x.io', 'Kenya', 'Other', 'xyz', '${longMsg}', 'javascript:alert(1)', true)`)).error);
ok("negative amounts are rejected", !!(await svc(`insert into public.support_inquiries (full_name, email, country, support_type, support_form, amount, support_area, message, consent) values ('Neg', 'n@x.io', 'Kenya', 'Other', 'other', -5, 'Battery storage', 'xxxxxxxxxxxx', true)`)).error);
ok("invalid currency codes are rejected", !!(await svc(`insert into public.support_inquiries (full_name, email, country, support_type, support_form, amount, currency, support_area, message, consent) values ('Cur', 'n@x.io', 'Kenya', 'Other', 'other', 5, 'dollars', 'Battery storage', 'xxxxxxxxxxxx', true)`)).error);
ok("'Get involved' navigation links are seeded", (await count(anon, "public.navigation_items where location = 'engage'")) === 4);
ok("partner & support pages are public", (await anon("select slug from public.pages where slug in ('partner', 'support')")).rows.length === 2);
const delP = await admin(`delete from public.partnership_inquiries where id = '${PARTNER_ID}' returning id`);
ok("deletes a submission", delP.rows.length === 1, delP.error);

const cascade = await admin(`delete from public.pages where id = '${draftPage}' returning id`);
ok("deleting a page removes its sections", !cascade.error && (await count(root, `public.page_sections where page_id = '${draftPage}'`)) === 0, cascade.error);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
