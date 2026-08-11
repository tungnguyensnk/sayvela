"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { NavItemLink } from "@/components/navigation/NavItemLink";
import { userMenuItems } from "@/components/navigation/nav-items";
import { useI18n } from "@/i18n/client";
import { ChevronDownIcon, LogoutIcon } from "@/components/ui/icons";

type UserMenuProps = {
  compact?: boolean;
  onNavigate?: () => void;
};

function initials(label: string) {
  const cleaned = label.replace(/[^a-zA-Z0-9]/g, " ").trim();
  return (cleaned.slice(0, 2) || "SV").toUpperCase();
}

export function UserMenu({ compact = false, onNavigate }: UserMenuProps) {
  const { data: session } = useSession();
  const { m } = useI18n();
  const userLabel = session?.user?.email ?? session?.user?.name ?? m.nav.account;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current || !event.target) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`btn btn-ghost gap-2 ${compact ? "w-full justify-between" : "px-1.5"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          aria-hidden="true"
          className="tabular flex h-6 w-6 shrink-0 items-center justify-center bg-ai-soft text-[0.6rem] font-semibold text-ai"
        >
          {initials(userLabel)}
        </span>
        <span className="max-w-[11rem] truncate text-sm font-medium text-ink">
          {userLabel}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
          width={14}
          height={14}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`card absolute right-0 z-50 mt-1 w-60 p-1 shadow-float ${
            compact ? "left-0" : ""
          }`}
        >
          <div className="px-2.5 py-2">
            <div className="eyebrow">{m.nav.account}</div>
            <div className="mt-1 truncate text-sm font-medium">{userLabel}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <div className="flex flex-col gap-0.5">
            {userMenuItems.map((item) => (
              <NavItemLink
                key={`${item.id}-${item.href}`}
                item={item}
                variant="row"
                onNavigate={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              />
            ))}
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 font-display text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-ink"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogoutIcon className="shrink-0 opacity-80" />
            {m.nav.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );
}
