"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { NavItemLink } from "@/components/navigation/NavItemLink";
import {
  appPrimaryNavItems,
  appSecondaryNavItems,
  marketingNavItems,
  type NavItem,
} from "@/components/navigation/nav-items";
import { AuthActions } from "@/components/landing/AuthActions";
import { PlanStatus } from "@/components/navigation/PlanStatus";
import { UserMenu } from "@/components/navigation/UserMenu";

type MobileHeaderMenuProps = {
  variant: "marketing" | "app";
  activePathname: string | null;
  activeHash?: string;
};

function isItemActive(item: NavItem, pathname: string | null, hash: string = "") {
  if (!pathname) return false;
  if (item.kind !== "internal") return false;
  if (item.availability !== "available") return false;
  if (item.href === "/#hero") return pathname === "/" && (hash === "" || hash === "#hero");
  if (item.href.startsWith("/#")) {
    return pathname === "/" && hash === item.href.replace("/", "");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileHeaderMenu({ variant, activePathname, activeHash = "" }: MobileHeaderMenuProps) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navItems = variant === "app" ? appPrimaryNavItems : marketingNavItems;
  const secondaryItems = variant === "app" ? appSecondaryNavItems : [];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="glass-button min-h-[3.25rem] px-4"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className="absolute left-4 right-4 top-4 rounded-3xl border border-white/12 bg-slate-950/78 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white/90">Navigation</div>
              <button
                type="button"
                className="glass-button min-h-[2.75rem] px-4 text-sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <NavItemLink
                  key={`${item.label}-${item.href}`}
                  item={item}
                  isActive={isItemActive(item, activePathname, activeHash)}
                  className="w-full justify-between px-4 py-3"
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>

            {secondaryItems.length > 0 ? (
              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/50">
                  More
                </div>
                <div className="flex flex-col gap-2">
                  {secondaryItems.map((item) => (
                    <NavItemLink
                      key={`${item.label}-${item.href}`}
                      item={item}
                      isActive={isItemActive(item, activePathname, activeHash)}
                      className="w-full justify-between px-4 py-3"
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 border-t border-white/10 pt-5">
              {variant === "app" ? (
                <div className="flex flex-col gap-3">
                  <PlanStatus compact />
                  {status === "authenticated" ? (
                    <UserMenu compact onNavigate={() => setOpen(false)} />
                  ) : null}
                </div>
              ) : (
                <AuthActions compact />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
