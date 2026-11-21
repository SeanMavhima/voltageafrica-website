/**
 * Field definitions: the single source of truth for every editable value.
 * The admin form renders them; the server validates against `schemaFor()`.
 * Pure TypeScript (no React, no server APIs) so it is shared by both sides.
 */
import { z } from "zod";

export type ImageValue = { id?: string | null; src: string; alt: string };
export type LinkValue = { label: string; href: string };

type Base = { name: string; label: string; help?: string; required?: boolean };

export type Field =
  | (Base & { kind: "text"; max?: number; placeholder?: string })
  | (Base & { kind: "textarea"; max?: number; rows?: number; placeholder?: string })
  | (Base & { kind: "accent"; max?: number }) // headline with *italic accent* markup
  | (Base & { kind: "richtext" })
  | (Base & { kind: "url"; placeholder?: string })
  | (Base & { kind: "link" })
  | (Base & { kind: "image" })
  | (Base & { kind: "video" })
  | (Base & { kind: "boolean" })
  | (Base & { kind: "number"; min?: number; max?: number; step?: number })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  | (Base & { kind: "date" })
  | (Base & { kind: "tags"; placeholder?: string })
  | (Base & { kind: "list"; fields: Field[]; itemLabel: string; max?: number; titleField?: string });

/** Links may be site-relative (/page, #anchor), mailto: or http(s). */
const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(\/|#|mailto:|https?:\/\/)/i.test(v), "Use a site path like /about, an #anchor, a mailto: or an https:// link.")
  .refine((v) => !/^\s*javascript:/i.test(v), "Unsafe link.");

const imageSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    src: z.string().trim().max(1000).refine((v) => v === "" || /^(\/|https?:\/\/)/.test(v), "Invalid image source."),
    alt: z.string().trim().max(400).default(""),
  })
  .nullable()
  .optional();

function fieldSchema(f: Field): z.ZodTypeAny {
  switch (f.kind) {
    case "text":
    case "accent": {
      const s = z.string().trim().max(f.max ?? 300);
      return f.required ? s.min(1, `${f.label} is required.`) : s.optional().default("");
    }
    case "textarea": {
      const s = z.string().trim().max(f.max ?? 4000);
      return f.required ? s.min(1, `${f.label} is required.`) : s.optional().default("");
    }
    case "richtext":
      return z.string().max(40000).optional().default("");
    case "url":
      return f.required ? hrefSchema.refine((v) => v !== "", `${f.label} is required.`) : hrefSchema.optional().default("");
    case "link":
      return z.object({ label: z.string().trim().max(120).default(""), href: hrefSchema.default("") }).optional().nullable();
    case "image":
    case "video":
      return f.required ? imageSchema.refine((v) => !!v?.src, `${f.label} is required.`) : imageSchema;
    case "boolean":
      return z.boolean().optional().default(false);
    case "number": {
      let s = z.coerce.number();
      if (f.min !== undefined) s = s.min(f.min);
      if (f.max !== undefined) s = s.max(f.max);
      return f.required ? s : s.optional();
    }
    case "select": {
      const values = f.options.map((o) => o.value) as [string, ...string[]];
      return f.required ? z.enum(values) : z.enum(values).optional();
    }
    case "date":
      return z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use the date picker (YYYY-MM-DD).")
        .optional()
        .default("");
    case "tags":
      return z.array(z.string().trim().min(1).max(300)).max(50).optional().default([]);
    case "list":
      return z.array(schemaFor(f.fields)).max(f.max ?? 60).optional().default([]);
  }
}

export function schemaFor(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) shape[f.name] = fieldSchema(f);
  return z.object(shape).passthrough();
}

/** Default (empty) value for a set of fields, used when creating new content. */
export function emptyValue(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.kind) {
      case "boolean":
        out[f.name] = false;
        break;
      case "list":
      case "tags":
        out[f.name] = [];
        break;
      case "image":
      case "video":
      case "link":
        out[f.name] = null;
        break;
      case "number":
        out[f.name] = f.min ?? 0;
        break;
      case "select":
        out[f.name] = f.options[0]?.value ?? "";
        break;
      default:
        out[f.name] = "";
    }
  }
  return out;
}
