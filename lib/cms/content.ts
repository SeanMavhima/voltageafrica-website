/**
 * Safe readers for section content (JSON from the CMS). Every reader tolerates
 * missing, empty or malformed values so the site never crashes on bad content.
 */
import type { ImageValue, LinkValue } from "./fields";

export type C = Record<string, unknown>;

const isObj = (v: unknown): v is C => !!v && typeof v === "object" && !Array.isArray(v);

export const text = (c: C, k: string, fallback = ""): string => (typeof c[k] === "string" && (c[k] as string).trim() ? (c[k] as string) : fallback);

export const bool = (c: C, k: string, fallback = false): boolean => (typeof c[k] === "boolean" ? (c[k] as boolean) : fallback);

export const num = (c: C, k: string, fallback: number): number => {
  const n = typeof c[k] === "number" ? (c[k] as number) : Number(c[k]);
  return Number.isFinite(n) ? n : fallback;
};

export const link = (c: C, k: string): LinkValue | null => {
  const v = c[k];
  return isObj(v) && typeof v.href === "string" && v.href && typeof v.label === "string" && v.label ? { label: v.label, href: v.href } : null;
};

export const image = (c: C, k: string): ImageValue | null => {
  const v = c[k];
  return isObj(v) && typeof v.src === "string" && v.src ? { id: typeof v.id === "string" ? v.id : null, src: v.src, alt: typeof v.alt === "string" ? v.alt : "" } : null;
};

export const list = (c: C, k: string): C[] => (Array.isArray(c[k]) ? (c[k] as unknown[]).filter(isObj) : []);

export const tags = (c: C, k: string): string[] => (Array.isArray(c[k]) ? (c[k] as unknown[]).filter((x): x is string => typeof x === "string" && !!x.trim()) : []);

export const isExternal = (href: string) => /^https?:\/\//i.test(href);

/** Extract a YouTube video id from common URL shapes; null if not YouTube. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
