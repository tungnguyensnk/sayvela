"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

type Theme = "light" | "dark";

const STORAGE_KEY = "sayvela-theme";

// Thẻ gốc là nguồn sự thật: ThemeScript đã đóng dấu trước khi trang vẽ,
// nên nút đọc đúng giá trị mà stylesheet đang dùng.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((listener) => listener());
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { m } = useI18n();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Glyph = theme === "dark" ? MoonIcon : SunIcon;

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      className={`btn btn-ghost h-8 w-8 px-0 text-muted ${className}`.trim()}
      title={`${m.theme.label}: ${m.theme[theme]}`}
      aria-label={m.theme.switchTo(m.theme[next])}
    >
      <Glyph />
    </button>
  );
}
