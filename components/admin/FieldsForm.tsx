"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import { emptyValue, type Field, type ImageValue, type LinkValue } from "@/lib/cms/fields";
import { cn } from "@/lib/utils";
import { MediaField } from "./MediaPicker";

const RichTextEditor = dynamic(() => import("./RichTextEditor").then((m) => m.RichTextEditor), { ssr: false, loading: () => <div className="h-48 rounded-lg border border-ws-line bg-white" /> });

type Values = Record<string, unknown>;
const input = "w-full rounded-lg border border-ws-line bg-white px-3 py-2 text-[14px] text-ws-ink outline-none transition-colors placeholder:text-ws-ink/35 focus:border-ws-ink/50 aria-[invalid=true]:border-red-400";

/** Renders a set of field definitions as an editable form. Values flow up via onChange. */
export function FieldsForm({ fields, values, onChange, errors = {}, prefix = "" }: { fields: Field[]; values: Values; onChange: (v: Values) => void; errors?: Record<string, string>; prefix?: string }) {
  const set = (name: string, v: unknown) => onChange({ ...values, [name]: v });
  return (
    <div className="space-y-5">
      {fields.map((f) => {
        const key = prefix ? `${prefix}.${f.name}` : f.name;
        return <FieldControl key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} error={errors[key]} errors={errors} path={key} />;
      })}
    </div>
  );
}

function Label({ field, htmlFor }: { field: Field; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-[13px] font-medium text-ws-ink">
      {field.label}
      {field.required && <span className="text-[11px] font-normal text-amber-ink">Required</span>}
    </label>
  );
}

function Help({ field, error }: { field: Field; error?: string }) {
  if (error) return <p className="mt-1.5 text-[12px] text-red-700">{error}</p>;
  if (field.help) return <p className="mt-1.5 text-[12px] leading-snug text-ws-ink/55">{field.help}</p>;
  return null;
}

function FieldControl({ field: f, value, onChange, error, errors, path }: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string; errors: Record<string, string>; path: string }) {
  const id = `f-${path.replace(/[^a-z0-9]+/gi, "-")}`;
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  switch (f.kind) {
    case "boolean":
      return (
        <div>
          <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-[13px] font-medium text-ws-ink">
            <span className="relative inline-flex">
              <input id={id} type="checkbox" className="peer sr-only" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
              <span className="h-5 w-9 rounded-full bg-ws-ink/20 transition-colors peer-checked:bg-forest peer-focus-visible:ring-2 peer-focus-visible:ring-amber" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
            {f.label}
          </label>
          <Help field={f} error={error} />
        </div>
      );
    case "richtext":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <RichTextEditor id={id} value={str} onChange={onChange} />
          <Help field={f} error={error} />
        </div>
      );
    case "image":
    case "video":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <MediaField id={id} kind={f.kind} value={value as ImageValue | null} onChange={onChange} />
          <Help field={f} error={error} />
        </div>
      );
    case "link": {
      const l = (value as LinkValue | null) ?? { label: "", href: "" };
      return (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ws-ink">{f.label}</legend>
          <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
            <input aria-label={`${f.label}: label`} className={input} placeholder="Button text" value={l.label} onChange={(e) => onChange({ ...l, label: e.target.value })} />
            <input aria-label={`${f.label}: destination`} className={input} placeholder="/page, #anchor or https://…" value={l.href} onChange={(e) => onChange({ ...l, href: e.target.value })} aria-invalid={!!errors[`${path}.href`]} />
          </div>
          <Help field={f} error={error ?? errors[`${path}.href`]} />
        </fieldset>
      );
    }
    case "select":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <select id={id} className={input} value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Help field={f} error={error} />
        </div>
      );
    case "number":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <div className="flex items-center gap-3">
            {f.min !== undefined && f.max !== undefined ? (
              <>
                <input id={id} type="range" min={f.min} max={f.max} step={f.step ?? 1} value={Number(value ?? f.min)} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[#344b3b]" />
                <span className="w-10 text-right font-mono text-[13px] tabular-nums">{Number(value ?? f.min)}</span>
              </>
            ) : (
              <input id={id} type="number" className={input} value={str} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
            )}
          </div>
          <Help field={f} error={error} />
        </div>
      );
    case "date":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <input id={id} type="date" className={cn(input, "max-w-[14rem]")} value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
          <Help field={f} error={error} />
        </div>
      );
    case "textarea":
    case "accent":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <textarea id={id} rows={f.kind === "accent" ? 2 : (f as { rows?: number }).rows ?? 3} className={cn(input, "resize-y")} value={str} maxLength={f.max} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} placeholder={"placeholder" in f ? f.placeholder : undefined} />
          {f.kind === "accent" && str.includes("*") && (
            <p className="mt-1.5 text-[12px] text-ws-ink/55">
              Preview:{" "}
              {str.split("*").map((p, i) =>
                i % 2 ? (
                  <em key={i} className="font-serif text-forest">
                    {p}
                  </em>
                ) : (
                  <span key={i}>{p}</span>
                ),
              )}
            </p>
          )}
          <Help field={f} error={error} />
        </div>
      );
    case "tags":
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <TagInput id={id} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} placeholder={f.placeholder} />
          <Help field={f} error={error} />
        </div>
      );
    case "list":
      return (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ws-ink">{f.label}</span>
            <span className="text-[12px] text-ws-ink/50">{Array.isArray(value) ? value.length : 0}{f.max ? ` / ${f.max}` : ""}</span>
          </div>
          <ListEditor field={f} items={Array.isArray(value) ? (value as Values[]) : []} onChange={onChange} errors={errors} path={path} />
          <Help field={f} error={error} />
        </div>
      );
    default:
      return (
        <div>
          <Label field={f} htmlFor={id} />
          <input id={id} className={input} value={str} maxLength={"max" in f ? f.max : undefined} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} placeholder={"placeholder" in f ? f.placeholder : undefined} />
          <Help field={f} error={error} />
        </div>
      );
  }
}

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ws-line bg-white p-1.5 focus-within:border-ws-ink/50">
      {value.map((t, i) => (
        <span key={t + i} className="inline-flex items-center gap-1 rounded-md bg-ws px-2 py-1 text-[12px] text-ws-ink">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-ws-ink/50 hover:text-ws-ink">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={placeholder ?? "Type and press Enter"}
        className="min-w-[10rem] flex-1 px-1.5 py-1 text-[13px] outline-none"
      />
    </div>
  );
}

function ListEditor({ field, items, onChange, errors, path }: { field: Extract<Field, { kind: "list" }>; items: Values[]; onChange: (v: Values[]) => void; errors: Record<string, string>; path: string }) {
  const [open, setOpen] = useState<number | null>(items.length === 0 ? null : -1);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(open === i ? j : open);
  };
  const full = field.max !== undefined && items.length >= field.max;
  const titleOf = (it: Values, i: number) => {
    const t = field.titleField ? it[field.titleField] : undefined;
    if (typeof t === "string" && t.trim()) return t.replace(/\*/g, "");
    if (t && typeof t === "object" && "alt" in (t as Values)) return String((t as Values).alt || `${field.itemLabel} ${i + 1}`);
    return `${field.itemLabel} ${i + 1}`;
  };
  return (
    <div className="rounded-lg border border-ws-line bg-ws/50">
      {items.length === 0 && <p className="px-4 py-4 text-[13px] text-ws-ink/50">No {field.itemLabel.toLowerCase()}s yet.</p>}
      <ol>
        {items.map((it, i) => {
          const hasErr = Object.keys(errors).some((k) => k.startsWith(`${path}.${i}.`));
          return (
            <li key={i} className={cn("border-b border-ws-line last:border-b-0", hasErr && "bg-red-50/50")}>
              <div className="flex items-center gap-1 px-2 py-1.5">
                <GripVertical className="h-4 w-4 text-ws-ink/25" aria-hidden />
                <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex-1 truncate px-1 py-1 text-left text-[13px] font-medium text-ws-ink">
                  <span className="mr-2 font-mono text-[11px] text-ws-ink/40">{String(i + 1).padStart(2, "0")}</span>
                  {titleOf(it, i)}
                  {hasErr && <span className="ml-2 text-[11px] font-normal text-red-700">needs attention</span>}
                </button>
                <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ChevronUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Duplicate" onClick={() => !full && onChange([...items.slice(0, i + 1), structuredClone(it), ...items.slice(i + 1)])} disabled={full}>
                  <Copy className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
              {open === i && (
                <div className="border-t border-ws-line bg-white px-4 py-4">
                  <FieldsForm fields={field.fields} values={it} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} errors={errors} prefix={`${path}.${i}`} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="border-t border-ws-line px-2 py-2">
        <button
          type="button"
          disabled={full}
          onClick={() => {
            onChange([...items, emptyValue(field.fields)]);
            setOpen(items.length);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ws-ink/70 hover:bg-white hover:text-ws-ink disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add {field.itemLabel.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex h-7 w-7 items-center justify-center rounded-md text-ws-ink/55 hover:bg-white hover:text-ws-ink disabled:opacity-30">
      {children}
    </button>
  );
}
