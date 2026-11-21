/** Shown on every public page while an administrator is previewing unpublished content. */
export function PreviewBanner() {
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[70] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-amber px-4 py-3 text-sm font-medium text-charcoal shadow-[0_-10px_30px_-10px_rgb(0_0_0/0.4)]">
      <span>
        <strong>Preview mode.</strong> You are seeing unpublished drafts. Visitors still see the published site.
      </span>
      <a href="/api/preview/exit" className="rounded-full bg-charcoal px-4 py-1.5 text-parchment hover:bg-forest">
        Exit preview
      </a>
      <a href="/admin" className="underline underline-offset-4">
        Back to admin
      </a>
    </div>
  );
}
