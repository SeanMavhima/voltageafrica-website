"use client";

import { useId, type ReactNode } from "react";
import { Accent } from "@/components/ui/Accent";
import { cn } from "@/lib/utils";

export function SimTag({ children = "Simulated data", className }: { children?: ReactNode; className?: string }) {
  return <span className={cn("tag-sim text-amber-ink", className)}>{children}</span>;
}

export function LabSection({ id, index, kicker, title, intro, children, className, tone = "parchment", aside }: { id: string; index: string; kicker: string; title: string; intro?: ReactNode; children: ReactNode; className?: string; tone?: "parchment" | "paper"; aside?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-28 border-t border-rule py-[clamp(4rem,8vw,7rem)]", tone === "paper" ? "bg-paper" : "bg-parchment", className)}>
      <div className="shell">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
          <div className="min-w-0 lg:col-span-7">
            <p className="kicker flex items-center gap-3 text-amber-ink">
              <span className="font-mono text-[0.7rem] tracking-[0.1em] text-stone">{index}</span>
              {kicker}
            </p>
            <h2 id={`${id}-title`} className="display mt-5 text-[clamp(2.4rem,4.6vw,4.4rem)] text-charcoal">
              <Accent text={title} className="text-forest" />
            </h2>
          </div>
          {(intro || aside) && (
            <div className="min-w-0 lg:col-span-5">
              {intro && <div className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-charcoal-2">{intro}</div>}
              {aside}
            </div>
          )}
        </div>
        <div className="mt-[clamp(2.5rem,5vw,4rem)]">{children}</div>
      </div>
    </section>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, hint, disabled }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; hint?: string; disabled?: boolean }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("group", disabled && "opacity-50")}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-charcoal">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[13px] tabular-nums text-charcoal">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lab-range mt-2 w-full"
        style={{ ["--pct" as string]: `${pct}%` }}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[11.5px] leading-snug text-stone">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange, size = "md", tone = "light" }: { label: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void; size?: "sm" | "md"; tone?: "light" | "dark" }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full p-1", tone === "dark" ? "bg-white/10" : "bg-charcoal/[0.06]")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-medium transition-colors",
              size === "sm" ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]",
              on ? (tone === "dark" ? "bg-parchment text-charcoal" : "bg-charcoal text-parchment") : tone === "dark" ? "text-parchment/75 hover:text-parchment" : "text-charcoal-2 hover:text-charcoal",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Readout({ label, value, unit, swatch, note, emphasis }: { label: string; value: string; unit?: string; swatch?: string; note?: ReactNode; emphasis?: "short" }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-stone">
        {swatch && <span className="h-2 w-2 rounded-full" style={{ background: swatch }} aria-hidden />}
        {label}
      </dt>
      <dd className={cn("mt-1.5 font-mono text-[1.6rem] leading-none tabular-nums", emphasis === "short" ? "text-status-critical-ink" : "text-charcoal")}>
        {value}
        {unit && <span className="ml-1 text-xs text-stone">{unit}</span>}
      </dd>
      {note && <dd className="mt-1.5 text-[11.5px] leading-snug text-stone">{note}</dd>}
    </div>
  );
}

/** Small status flag; never colour alone (icon + text). */
export function Flag({ tone, children }: { tone: "short" | "ok" | "info" | "warn"; children: ReactNode }) {
  const map = {
    short: "bg-status-critical/10 text-status-critical-ink",
    ok: "bg-forest/10 text-forest",
    info: "bg-charcoal/[0.06] text-charcoal-2",
    warn: "bg-amber/20 text-amber-ink",
  } as const;
  const mark = { short: "▲", ok: "●", info: "○", warn: "◆" }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", map[tone])}>
      <span aria-hidden className="text-[8px]">
        {mark}
      </span>
      {children}
    </span>
  );
}

export const fmt = {
  kw: (v: number) => `${v.toFixed(1)} kW`,
  kwh: (v: number) => `${v.toFixed(v >= 100 ? 0 : 1)} kWh`,
  pct: (v: number) => `${Math.round(v * 100)}%`,
};
