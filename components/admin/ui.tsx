"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, LoaderCircle, X } from "lucide-react";
import type { ActionResult } from "@/lib/cms/actions";
import { cn } from "@/lib/utils";

/* ─── Buttons ─── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber";
const btn: Record<Variant, string> = {
  primary: "bg-ws-ink text-white hover:bg-forest",
  amber: "bg-amber text-ws-ink hover:bg-[#d99432]",
  secondary: "border border-ws-line bg-white text-ws-ink hover:border-ws-ink/40",
  ghost: "text-ws-ink/70 hover:bg-ws-ink/[0.06] hover:text-ws-ink",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function Btn({ variant = "secondary", loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", btn[variant], className)}
    >
      {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ─── Status badge ─── */
const statusStyle: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  draft: "bg-amber-50 text-amber-800 ring-amber-200",
  archived: "bg-stone-100 text-stone-600 ring-stone-200",
  new: "bg-sky-50 text-sky-800 ring-sky-200",
  read: "bg-stone-100 text-stone-700 ring-stone-200",
  responded: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  hidden: "bg-stone-100 text-stone-600 ring-stone-200",
  // Engagement Inbox workflow
  reviewed: "bg-stone-100 text-stone-700 ring-stone-200",
  in_discussion: "bg-amber-50 text-amber-900 ring-amber-300",
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  declined: "bg-rose-50 text-rose-800 ring-rose-200",
  completed: "bg-[#344b3b]/10 text-[#2a3e30] ring-[#344b3b]/25",
  "draft changes": "bg-amber-50 text-amber-800 ring-amber-200",
};
export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset", statusStyle[status] ?? statusStyle.read)}>{children ?? (status === "new" ? "unread" : status)}</span>;
}

/* ─── Layout pieces ─── */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-[12px] font-medium text-ws-ink/50">{eyebrow}</div>}
        <h1 className="font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ws-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-ws-ink/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-ws-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-ws-line px-5 py-3.5">
          <h2 className="text-[13px] font-semibold text-ws-ink">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 h-10 w-10 rounded-full bg-amber/20 ring-8 ring-amber/10" aria-hidden />
      <p className="font-medium text-ws-ink">{title}</p>
      {body && <p className="mt-1 max-w-[46ch] text-[13px] text-ws-ink/60">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── Toasts ─── */
type Toast = { id: number; kind: "success" | "error"; text: string };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.kind === "error" ? 8000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] shadow-lg ring-1", t.kind === "error" ? "bg-white text-red-800 ring-red-200" : "bg-ws-ink text-white ring-ws-ink")}>
            {t.kind === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />}
            <span className="flex-1 leading-snug">{t.text}</span>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Run a server action with pending state, toasts and a router refresh. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = useCallback(
    (fn: () => Promise<ActionResult>, opts: { onOk?: (r: Extract<ActionResult, { ok: true }>) => void; onError?: (r: Extract<ActionResult, { ok: false }>) => void; refresh?: boolean } = {}) =>
      new Promise<ActionResult>((resolve) =>
        start(async () => {
          let r: ActionResult;
          try {
            r = await fn();
          } catch (e) {
            if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
            r = { ok: false, error: "The server could not be reached. Check your connection and try again." };
          }
          if (r.ok) {
            if (r.message) toast({ kind: "success", text: r.message });
            opts.onOk?.(r);
            if (opts.refresh !== false) router.refresh();
          } else {
            toast({ kind: "error", text: r.error });
            opts.onError?.(r);
          }
          resolve(r);
        }),
      ),
    [toast, router],
  );
  return { run, pending };
}

/* ─── Confirm dialog ─── */
export function Confirm({
  trigger,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  danger = true,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<unknown>;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {trigger(() => ref.current?.showModal())}
      <dialog ref={ref} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-ws-line bg-white p-0 shadow-2xl backdrop:bg-ws-ink/40">
        <div className="p-6">
          <h2 className="font-serif text-xl text-ws-ink">{title}</h2>
          {body && <div className="mt-2 text-[14px] leading-relaxed text-ws-ink/70">{body}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-ws-line px-6 py-4">
          <Btn onClick={() => ref.current?.close()}>Cancel</Btn>
          <Btn
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
              ref.current?.close();
            }}
          >
            {confirmLabel}
          </Btn>
        </div>
      </dialog>
    </>
  );
}

/** Warn before leaving a page with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}
