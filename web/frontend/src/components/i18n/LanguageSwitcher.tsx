"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALES,
  LOCALE_CODES,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { CheckIcon, GlobeIcon } from "@/components/ui/icons";

const ONE_YEAR = 60 * 60 * 24 * 365;

function persistLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, m } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current || !event.target) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: Locale) {
    persistLocale(next);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={rootRef} className={`relative ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        className={`btn btn-ghost gap-1.5 px-2 ${compact ? "w-full justify-between" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={m.language.action}
        onClick={() => setOpen((prev) => !prev)}
      >
        <GlobeIcon width={16} height={16} />
        <span className="tabular text-xs">{LOCALE_CODES[locale]}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="card absolute right-0 z-50 mt-1 w-44 p-1 shadow-float"
        >
          <div className="eyebrow px-2.5 py-1.5">{m.language.label}</div>
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors ${
                option === locale
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-raised hover:text-ink"
              }`}
              onClick={() => choose(option)}
            >
              <span className="flex-1 text-left">{LOCALE_NAMES[option]}</span>
              {option === locale ? <CheckIcon width={15} height={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
