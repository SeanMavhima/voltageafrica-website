export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
