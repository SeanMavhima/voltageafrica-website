"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  CalendarRange,
  Cpu,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderKanban,
  Home,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Navigation as NavIcon,
  Newspaper,
  Scale,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { signOut } from "@/lib/cms/actions";
import { cn } from "@/lib/utils";

const groups: { title: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }[] }[] = [
  {
    title: "",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/engagement", label: "Engagement Inbox", icon: Inbox },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/pages", label: "Pages", icon: FileText },
      { href: "/admin/sections", label: "Sections", icon: Layers },
      { href: "/admin/navigation", label: "Navigation", icon: NavIcon },
      { href: "/admin/energy-lab", label: "Energy Lab", icon: FlaskConical },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/timeline", label: "Timeline", icon: CalendarRange },
      { href: "/admin/publications", label: "Publications", icon: Newspaper },
      { href: "/admin/awards", label: "Awards", icon: Award },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/technology", label: "Technology", icon: Cpu },
      { href: "/admin/founder", label: "Founder & team", icon: UserRound },
      { href: "/admin/principles", label: "Principles", icon: Scale },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/media", label: "Media library", icon: ImageIcon },
      { href: "/admin/settings", label: "Site settings", icon: Settings },
    ],
  },
];

export function Sidebar({ email, unread }: { email: string; unread: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`) || (href === "/admin/founder" && path.startsWith("/admin/people")) || (href === "/admin/engagement" && path.startsWith("/admin/messages")));

  const nav = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.title || "top"} className="mb-5">
          {g.title && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, exact }) => {
              const on = active(href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors", on ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white")}
                  >
                    <Icon className={cn("h-4 w-4", on && "text-amber")} />
                    <span className="flex-1">{label}</span>
                    {href === "/admin/engagement" && unread > 0 && (
                      <span className="rounded-full bg-amber px-1.5 text-[11px] font-semibold text-ws-ink" aria-label={`${unread} new`}>
                        {unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-white/65 hover:bg-white/[0.06] hover:text-white">
        <ExternalLink className="h-4 w-4" /> View website
      </a>
      <div className="mt-2 flex items-center gap-2 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-[12px] font-semibold text-ws-ink">{email.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-white/60">{email}</span>
        <form action={signOut}>
          <button type="submit" aria-label="Sign out" title="Sign out" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  const brand = (
    <Link href="/admin" aria-label="VoltageAfrica CMS home" className="flex items-center gap-2.5 px-5 py-6 text-white">
      <Logo tone="reverse" height={17} decorative />
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">CMS</span>
    </Link>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ws-ink lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-ws-ink px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 text-white">
          <Logo variant="symbol" tone="reverse" height={24} decorative />
          <span className="text-[14px] font-medium">CMS</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-white">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ws-ink">
            <div className="flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="mr-3 rounded-md p-2 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
