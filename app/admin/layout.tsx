import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · VoltageAfrica admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {/* The public site's paper grain is not used in the workspace. */}
      <style>{"body.grain::after{display:none}body{background:var(--color-ws)}"}</style>
      {/* The CMS workspace stays light regardless of the public site's theme. */}
      <div className="theme-light min-h-svh bg-ws font-sans text-ws-ink">{children}</div>
    </ToastProvider>
  );
}
