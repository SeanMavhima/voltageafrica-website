/**
 * Validates every seeded section and collection row against the same Zod
 * schemas the admin uses, and checks the rich-text sanitizer.
 *   npm run cms:test
 */
import { schemaFor } from "../../lib/cms/fields";
import { sectionTypeMap, settingsFields } from "../../lib/cms/section-types";
import { collections } from "../../lib/cms/collections";
import { settingsFormFields } from "../../lib/cms/settings-fields";
import * as seed from "../../lib/cms/seed";

async function main() {
let passed = 0;
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  cond ? passed++ : failed++;
  if (!cond) console.log(`  ✗ ${name}  → ${detail}`);
};

console.log("\nSeeded sections validate against their editor schema");
for (const s of seed.seedSections) {
  const def = sectionTypeMap[s.type];
  ok(`section type ${s.type} is registered`, !!def, s.id);
  if (!def) continue;
  const r = schemaFor(def.fields).safeParse(s.content);
  ok(`section ${s.type} (${s.id.slice(0, 8)}) content`, r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3)));
  const st = schemaFor(settingsFields).safeParse(s.settings);
  ok(`section ${s.type} settings`, st.success, st.success ? "" : JSON.stringify(st.error.issues.slice(0, 2)));
}

console.log("Seeded collection rows validate against their editor schema");
const tableRows: Record<string, Record<string, unknown>[]> = {
  timeline: seed.seedMilestones,
  publications: seed.seedPublications,
  awards: seed.seedAwards,
  projects: seed.seedProjects,
  technology: seed.seedTechnology,
  principles: seed.seedPrinciples,
  people: seed.seedPeople,
  navigation: seed.seedNavigation,
};
for (const [key, rows] of Object.entries(tableRows)) {
  const def = collections[key as keyof typeof collections];
  const media = new Map(seed.seedMedia.map((m) => [m.id, m]));
  for (const row of rows) {
    // Shape the row the way the editor loads it (image FKs → image values, nulls → empty).
    const v: Record<string, unknown> = {};
    for (const f of def.fields) {
      const raw = row[f.name];
      if (f.kind === "image") {
        const m = raw ? media.get(raw as string) : null;
        v[f.name] = m ? { id: m.id, src: m.path, alt: m.alt_text } : null;
      } else v[f.name] = raw ?? (f.kind === "tags" || f.kind === "list" ? [] : f.kind === "boolean" ? false : "");
    }
    const r = schemaFor(def.fields).safeParse(v);
    ok(`${key}: ${String(row[def.titleField]).slice(0, 40)}`, r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3)));
  }
}

console.log("Site settings validate");
const sr = schemaFor(settingsFormFields).safeParse(seed.seedSettings);
ok("site settings", sr.success, sr.success ? "" : JSON.stringify(sr.error.issues));

console.log("Validation rejects unsafe input");
const linkSchema = schemaFor([{ name: "l", label: "L", kind: "link" }]);
ok("javascript: links rejected", !linkSchema.safeParse({ l: { label: "x", href: "javascript:alert(1)" } }).success);
ok("relative links accepted", linkSchema.safeParse({ l: { label: "x", href: "/about" } }).success);
const imgSchema = schemaFor([{ name: "i", label: "I", kind: "image" }]);
ok("data: image URLs rejected", !imgSchema.safeParse({ i: { src: "data:image/svg+xml,<svg onload=alert(1)>", alt: "" } }).success);

console.log("Rich-text sanitizer");
// sanitize.ts imports "server-only"; load it with that guard stubbed for this script.
const Module = await import("node:module");
const req = Module.createRequire(import.meta.url);
const sm = req.resolve("server-only");
req.cache[sm] = { id: sm, filename: sm, loaded: true, exports: {} } as unknown as NodeJS.Module;
const { sanitizeRichText } = await import("../../lib/cms/sanitize");
const dirty = `<p onclick="steal()">Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://example.org">ok</a><img src=x onerror=alert(1)><iframe src="https://evil"></iframe><h2 style="color:red">T</h2></p>`;
const clean = sanitizeRichText(dirty);
ok("strips <script>", !clean.includes("<script") && !clean.includes("alert(1)</script"));
ok("strips event handlers", !/onclick|onerror/i.test(clean));
ok("strips javascript: hrefs", !/javascript:/i.test(clean));
ok("strips <img>/<iframe>", !/<img|<iframe/i.test(clean));
ok("strips inline styles", !/style=/i.test(clean));
ok("keeps safe links with rel", clean.includes('href="https://example.org"') && clean.includes('rel="noopener noreferrer"'));
ok("keeps headings", clean.includes("<h2>T</h2>"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
}
void main();
