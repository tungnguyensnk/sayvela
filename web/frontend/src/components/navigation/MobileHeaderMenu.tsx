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
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/client";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

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

export function MobileHeaderMenu({
  variant,
  activePathname,
  activeHash = "",
}: MobileHeaderMenuProps) {
  const { status } = useSession();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navItems = variant === "app" ? appPrimaryNavItems : marketingNavItems;
  const secondaryItems = variant === "app" ? appSecondaryNavItems : [];

  return (
    <div className="ml-auto flex items-center gap-1 lg:hidden">
      <LanguageSwitcher />
      <ThemeToggle />
      <button
        type="button"
        className="btn btn-ghost h-8 w-8 px-0"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={m.nav.openMenu}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
            aria-label={m.nav.closeMenu}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-0 top-0 max-h-full overflow-y-auto border-b border-line bg-surface p-5 shadow-float"
          >
            <div className="flex items-center justify-between gap-3">
              <SayvelaBrand size="sm" />
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 px-0"
                aria-label={m.nav.closeMenu}
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavItemLink
                  key={item.id}
                  item={item}
                  variant="row"
                  isActive={isItemActive(item, activePathname, activeHash)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>

            {secondaryItems.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <div className="eyebrow mb-2 px-3">{m.nav.comingSoon}</div>
                <div className="flex flex-col gap-1">
                  {secondaryItems.map((item) => (
                    <NavItemLink
                      key={item.id}
                      item={item}
                      variant="row"
                      isActive={isItemActive(item, activePathname, activeHash)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 border-t border-line pt-4">
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
