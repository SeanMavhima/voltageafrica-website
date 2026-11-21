import "server-only";
import sanitizeHtml from "sanitize-html";
import type { Field } from "./fields";

/** Allow-list for rich text: headings, paragraphs, emphasis, links, lists and quotes. No scripts, styles or event handlers. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "br", "hr"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      const out: Record<string, string> = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };
      return { tagName, attribs: out };
    },
  },
};

export function sanitizeRichText(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Sanitize every rich-text value (including inside lists) according to the field definitions. */
export function sanitizeByFields<T extends Record<string, unknown>>(fields: Field[], value: T): T {
  const out: Record<string, unknown> = { ...value };
  for (const f of fields) {
    if (f.kind === "richtext") out[f.name] = sanitizeRichText(out[f.name]);
    if (f.kind === "list" && Array.isArray(out[f.name])) {
      out[f.name] = (out[f.name] as Record<string, unknown>[]).map((item) => sanitizeByFields(f.fields, item ?? {}));
    }
  }
  return out as T;
}
