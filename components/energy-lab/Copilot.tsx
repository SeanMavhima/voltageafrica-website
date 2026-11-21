"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp, X } from "lucide-react";
import { answerOffline } from "@/lib/energy-lab/fallback";
import { formatClock } from "@/lib/energy-lab/math";
import type { ScenarioConfig } from "@/lib/energy-lab/types";
import { cn } from "@/lib/utils";
import type { Level } from "./Console";

export type ChatMessage = { role: "user" | "assistant"; content: string; mode?: "ai" | "fallback"; sources?: string[]; notice?: string; at?: string };

/** Minimal, safe renderer: paragraphs, "- " bullets and **bold** (React text nodes only, no HTML). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-charcoal">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
export function RichAnswer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) bullets.push(line.replace(/^[-•*]\s+/, ""));
    else {
      flush();
      if (line) blocks.push(<p key={`p${blocks.length}`} className="my-2">{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

export function Copilot({ open, onClose, cfg, hour, level, aiConfigured, intro, suggestions, messages, setMessages }: { open: boolean; onClose: () => void; cfg: ScenarioConfig; hour: number; level: Level; aiConfigured: boolean; intro: string; suggestions: string[]; messages: ChatMessage[]; setMessages: (fn: (m: ChatMessage[]) => ChatMessage[]) => void }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft("");
    const at = formatClock(hour);
    setMessages((m) => [...m, { role: "user", content: q, at }]);
    setBusy(true);
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 3800) }));
    let reply: ChatMessage;
    if (!aiConfigured) {
      const a = answerOffline(q, cfg, hour, level);
      reply = { role: "assistant", content: a.answer, mode: "fallback", sources: a.sources };
    } else {
      try {
        const res = await fetch("/api/energy-lab/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, config: cfg, hour, level, history }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.answer) throw new Error(data?.error ?? `HTTP ${res.status}`);
        reply = { role: "assistant", content: data.answer, mode: data.mode, sources: data.sources, notice: data.notice };
      } catch (e) {
        const a = answerOffline(q, cfg, hour, level);
        const msg = e instanceof Error && /429/.test(e.message) ? "The AI copilot is busy (rate limit)." : "The AI copilot could not be reached.";
        reply = { role: "assistant", content: a.answer, mode: "fallback", sources: a.sources, notice: `${msg} This answer comes from the lab's built-in engine.` };
      }
    }
    setMessages((m) => [...m, reply]);
    setBusy(false);
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  return (
    <div className={cn("fixed inset-0 z-[70] overflow-hidden transition-[visibility] duration-500", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("on-dark absolute inset-0 bg-charcoal/30 transition-opacity duration-500", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label="AI Energy Copilot" className={cn("absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col bg-paper shadow-[0_0_80px_-20px_rgb(36_36_31/0.5)] transition-transform duration-500 ease-[var(--ease-expo)]", open ? "translate-x-0" : "translate-x-full")}>
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
          <div>
            <p className="kicker text-amber-ink">Energy Copilot</p>
            <p className="serif mt-1 text-[1.5rem] leading-tight text-charcoal">Ask the lab</p>
            <p className="mt-1 text-[12px] text-stone">
              Reads the scenario on screen at {formatClock(hour)} · {aiConfigured ? "AI explanation, grounded in the simulation" : "built-in engine (no AI service configured)"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-stone hover:bg-parchment hover:text-charcoal" aria-label="Close the copilot">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5" aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className="text-[14px] leading-relaxed text-charcoal-2">{intro}</p>
              <p className="kicker mt-6 text-stone">Try asking</p>
              <ul className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => ask(s)} className="w-full rounded-lg border border-rule px-3.5 py-2.5 text-left text-[13.5px] text-charcoal transition-colors hover:border-charcoal hover:bg-parchment">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ol className="space-y-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <li key={i} className="ml-8">
                  <p className="text-right font-mono text-[10px] text-stone">You · scenario at {m.at}</p>
                  <p className="mt-1 rounded-xl bg-charcoal px-4 py-2.5 text-[14px] leading-relaxed text-parchment">{m.content}</p>
                </li>
              ) : (
                <li key={i}>
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-stone">
                    <span className={cn("h-1.5 w-1.5 rounded-full", m.mode === "ai" ? "bg-amber" : "bg-forest")} aria-hidden />
                    {m.mode === "ai" ? "AI · from simulation data" : "Built-in engine · from simulation data"}
                  </p>
                  <div className="mt-1 border-l-2 border-amber pl-4 text-[14px] leading-relaxed text-charcoal-2">
                    <RichAnswer text={m.content} />
                  </div>
                  {m.notice && <p className="mt-2 text-[11.5px] text-amber-ink">{m.notice}</p>}
                  {m.sources && m.sources.length > 0 && <p className="mt-2 font-mono text-[10px] text-stone">Data: {m.sources.join(" · ")}</p>}
                </li>
              ),
            )}
            {busy && (
              <li className="flex items-center gap-2 text-[13px] text-stone">
                <span className="pulse-dot h-2 w-2 rounded-full bg-amber" aria-hidden /> Running the numbers…
              </li>
            )}
          </ol>
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="border-t border-rule px-6 py-4">
          <label htmlFor="copilot-q" className="sr-only">
            Your question about the simulated microgrid
          </label>
          <div className="flex items-end gap-2 rounded-xl border border-rule-strong bg-paper p-2 focus-within:border-charcoal">
            <textarea
              id="copilot-q"
              ref={inputRef}
              rows={2}
              maxLength={600}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              placeholder="Why is the battery discharging?"
              className="min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-1 text-[14px] text-charcoal outline-none placeholder:text-stone-2"
            />
            <button type="submit" disabled={busy || draft.trim().length < 2} className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-parchment disabled:opacity-40" aria-label="Ask">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-stone">Answers describe a simulation, not a real installation. The copilot cannot see or control any equipment.</p>
        </form>
      </aside>
    </div>
  );
}
