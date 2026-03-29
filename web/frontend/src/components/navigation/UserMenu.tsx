"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { NavItemLink } from "@/components/navigation/NavItemLink";
import { userMenuItems } from "@/components/navigation/nav-items";

type UserMenuProps = {
  compact?: boolean;
  onNavigate?: () => void;
};

export function UserMenu({ compact = false, onNavigate }: UserMenuProps) {
  const { data: session } = useSession();
  const userLabel = session?.user?.email ?? session?.user?.name ?? "người dùng";
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!event.target) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerClassName = compact
    ? "glass-button w-full justify-between"
    : "glass-button";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="max-w-[14rem] truncate text-left text-sm font-semibold text-white/90">
          {userLabel}
        </span>
        <span aria-hidden="true" className="text-white/70">
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/12 bg-slate-950/78 p-2 shadow-2xl backdrop-blur-xl"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/50">
            Account
          </div>
          <div className="flex flex-col gap-1">
            {userMenuItems.map((item) => (
              <NavItemLink
                key={`${item.label}-${item.href}`}
                item={item}
                className="w-full justify-between px-3 py-2 text-sm"
                onNavigate={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              />
            ))}
            <button
              type="button"
              role="menuitem"
              className="nav-link inline-flex w-full items-center justify-between rounded-full border border-transparent px-3 py-2 text-sm transition hover:border-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
