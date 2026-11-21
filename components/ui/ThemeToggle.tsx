"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY as STORAGE_KEY, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

function savedTheme(): ThemeName | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function resolveTheme(): ThemeName {
  return savedTheme() ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
}

// The <html data-theme> attribute is the single source of truth; components subscribe to it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // Follow OS changes until the visitor makes an explicit choice.
  const media = window.matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (!savedTheme()) applyTheme(media.matches ? "dark" : "light");
  };
  media.addEventListener("change", onSystem);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystem);
  };
}

const getSnapshot = (): ThemeName | null => (document.documentElement.getAttribute("data-theme") as ThemeName | null) ?? null;
const getServerSnapshot = (): ThemeName | null => null;

/** Current theme (null during server render / before hydration). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = (next: ThemeName) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
  };
  return { theme, setTheme };
}

export function ThemeToggle({ className, tone = "auto" }: { className?: string; tone?: "auto" | "light" }) {
  const { theme, setTheme } = useTheme();

  // React's dev Strict Mode remount resets <html> attributes; re-apply before paint (no-op in production).
  useLayoutEffect(() => {
    if (!document.documentElement.hasAttribute("data-theme")) applyTheme(resolveTheme());
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
        tone === "light" ? "border-parchment/30 text-parchment hover:border-parchment hover:bg-parchment/10" : "border-rule-strong text-charcoal hover:border-charcoal",
        className,
      )}
    >
      {/* Both icons are rendered so the button is stable before hydration; CSS on <html data-theme> picks one. */}
      <Sun aria-hidden className="theme-icon-sun h-[18px] w-[18px]" strokeWidth={1.75} />
      <Moon aria-hidden className="theme-icon-moon absolute h-[18px] w-[18px]" strokeWidth={1.75} />
    </button>
  );
}
