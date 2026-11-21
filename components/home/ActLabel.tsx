import { cn } from "@/lib/utils";

/**
 * A section eyebrow that reads "Act III · The system" is drawn as an act marker,
 * so chapters built from other section types match the story's typography.
 */
export function ActKicker({ text: t, dark, fallbackClass }: { text: string; dark?: boolean; fallbackClass: string }) {
  const m = t.match(/^act\s+([ivxlc]+)\s*[·:\-–—]\s*(.+)$/i);
  if (!m) return <p className={fallbackClass}>{t}</p>;
  return <ActLabel numeral={m[1].toUpperCase()} kicker={m[2]} dark={dark} />;
}

/** "ACT I — The reality": the chapter marker shared by every act. */
export function ActLabel({ numeral, kicker, dark }: { numeral: string; kicker: string; dark?: boolean }) {
  if (!numeral && !kicker) return null;
  return (
    <p className={cn("flex items-center gap-4", dark ? "text-parchment/80" : "text-stone")}>
      {numeral && <span className={cn("mono uppercase tracking-[0.22em]", dark ? "text-amber" : "text-amber-ink")}>Act {numeral}</span>}
      {numeral && kicker && <span aria-hidden className={cn("h-px w-10", dark ? "bg-parchment/30" : "bg-rule-strong")} />}
      {kicker && <span className="kicker">{kicker}</span>}
    </p>
  );
}
