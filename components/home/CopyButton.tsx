"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies a block of text (e.g. a press boilerplate) and confirms it. */
export function CopyButton({ value, label = "Copy text", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2200);
        } catch {
          setDone(false);
        }
      }}
      className={cn("inline-flex min-h-10 items-center gap-2 border border-charcoal/25 px-3.5 text-[13px] font-medium text-charcoal transition-colors hover:border-charcoal print:hidden", className)}
    >
      {done ? <Check className="h-3.5 w-3.5 text-forest" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

/** Prints the current page (a clean fact sheet; print styles hide the site chrome). */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 border border-charcoal/25 px-3.5 text-[13px] font-medium text-charcoal transition-colors hover:border-charcoal print:hidden">
      {label}
    </button>
  );
}
