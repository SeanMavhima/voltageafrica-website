/**
 * Unit tests for the engagement form schemas (shared by browser and API).
 *   npm run engagement:test
 */
import { contactSchema, fieldErrors, partnershipSchema, supportSchema } from "../../lib/validation/engagement";
import { clean, escapeHtml } from "../../lib/validation/contact";

let passed = 0;
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}${!cond && detail ? `  → ${detail}` : ""}`);
};
const errs = (r: { success: boolean; error?: unknown }) => (r.success ? {} : fieldErrors(r.error as never));

const partner = {
  fullName: "  Grace   Mutasa ",
  organisation: "Solar Co",
  email: " Grace@Solar.Example ",
  phone: "+263 77 123 4567",
  country: "Zimbabwe",
  category: "Energy Infrastructure",
  proposal: "Battery storage for the pilot hub",
  message: "We would like to supply storage for the first community hub in Shurugwi.",
  website: "linkedin.com/company/solar-co",
  consent: true,
};

console.log("\nPartnership form");
const p = partnershipSchema.safeParse(partner);
ok("accepts a complete inquiry", p.success, JSON.stringify(errs(p)));
if (p.success) {
  ok("collapses whitespace in names", p.data.fullName === "Grace Mutasa");
  ok("normalises email to lower case", p.data.email === "grace@solar.example");
  ok("adds https:// to a bare website", p.data.website === "https://linkedin.com/company/solar-co");
}
ok("website is optional", partnershipSchema.safeParse({ ...partner, website: "" }).success);
ok("phone is optional", partnershipSchema.safeParse({ ...partner, phone: "" }).success);
ok("rejects javascript: websites", !partnershipSchema.safeParse({ ...partner, website: "javascript:alert(1)" }).success);
ok("rejects an invalid email", "email" in errs(partnershipSchema.safeParse({ ...partner, email: "grace@" })));
ok("rejects an unknown category", "category" in errs(partnershipSchema.safeParse({ ...partner, category: "Mining" })));
ok("requires consent", "consent" in errs(partnershipSchema.safeParse({ ...partner, consent: false })));
ok("requires a meaningful message", "message" in errs(partnershipSchema.safeParse({ ...partner, message: "hi" })));
ok("rejects letters in phone numbers", "phone" in errs(partnershipSchema.safeParse({ ...partner, phone: "call me maybe" })));
ok("caps message length", "message" in errs(partnershipSchema.safeParse({ ...partner, message: "x".repeat(4001) })));
const missing = errs(partnershipSchema.safeParse({}));
ok("reports every required field", ["fullName", "organisation", "email", "country", "category", "proposal", "message", "consent"].every((k) => k in missing), JSON.stringify(Object.keys(missing)));

console.log("Support form");
const support = {
  fullName: "Sam Supporter",
  email: "sam@example.org",
  country: "Rwanda",
  supportType: "Financial contribution",
  supportForm: "financial",
  amount: "1,500",
  currency: "USD",
  supportArea: "Battery storage",
  message: "Happy to help fund storage.",
  consent: true,
};
const s = supportSchema.safeParse(support);
ok("accepts a financial pledge with a custom amount", s.success && s.data.amount === 1500, JSON.stringify(errs(s)));
ok("amount is optional", supportSchema.safeParse({ ...support, amount: "", currency: "" }).success);
ok("currency is required when an amount is given", "currency" in errs(supportSchema.safeParse({ ...support, currency: "" })));
ok("rejects zero or negative amounts", "amount" in errs(supportSchema.safeParse({ ...support, amount: "-20" })));
ok("rejects non-numeric amounts", "amount" in errs(supportSchema.safeParse({ ...support, amount: "lots" })));
ok("rounds to cents", supportSchema.safeParse({ ...support, amount: "10.555" }).data?.amount === 10.56);
ok("rejects unknown currencies", "currency" in errs(supportSchema.safeParse({ ...support, currency: "XYZ" })));
ok("accepts equipment donations without money", supportSchema.safeParse({ ...support, supportType: "Equipment donation", supportForm: "equipment", amount: "", currency: "" }).success);
ok("rejects an unknown support type", "supportType" in errs(supportSchema.safeParse({ ...support, supportType: "Crypto" })));
ok("rejects an unknown support area", "supportArea" in errs(supportSchema.safeParse({ ...support, supportArea: "Anything" })));
ok("requires consent", "consent" in errs(supportSchema.safeParse({ ...support, consent: undefined })));

console.log("Contact form");
const contact = { name: "Ada", email: "ada@example.org", subject: "Interview request", inquiry: "Media & Press", message: "We would love to interview the founder next month." };
ok("accepts a message", contactSchema.safeParse(contact).success);
ok("requires a subject", "subject" in errs(contactSchema.safeParse({ ...contact, subject: "" })));
ok("rejects an unknown category", "inquiry" in errs(contactSchema.safeParse({ ...contact, inquiry: "Spam" })));
ok("keeps line breaks in messages", contactSchema.safeParse({ ...contact, message: "Line one is here.\r\nLine two is here." }).data?.message === "Line one is here.\nLine two is here.");

console.log("Sanitisation");
ok("strips control characters", clean("Ada\u0000\u0007 Lovelace") === "Ada Lovelace");
ok("strips bidi overrides used to disguise text", clean("invoice‮fdp.exe") === "invoicefdp.exe");
ok("newlines are removed from single-line fields (no header injection)", clean("Subject\r\nBcc: x@evil.io") === "Subject Bcc: x@evil.io");
ok("escapes HTML for email", escapeHtml(`<img src=x onerror="alert(1)">`) === "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
ok("honeypot is accepted by the schema (and checked by the API)", contactSchema.safeParse({ ...contact, nickname: "bot" }).data?.nickname === "bot");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
