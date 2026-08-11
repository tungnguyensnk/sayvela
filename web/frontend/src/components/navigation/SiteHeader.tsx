"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
import { AuthActions } from "@/components/landing/AuthActions";
import { NavItemLink } from "@/components/navigation/NavItemLink";
import { MobileHeaderMenu } from "@/components/navigation/MobileHeaderMenu";
import { PlanStatus } from "@/components/navigation/PlanStatus";
import { UserMenu } from "@/components/navigation/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/client";
import { appPrimaryNavItems, marketingNavItems } from "@/components/navigation/nav-items";

function isActiveInternalLink(pathname: string, hash: string, href: string) {
  if (href === "/#hero") return pathname === "/" && (hash === "" || hash === "#hero");
  if (href.startsWith("/#")) {
    return pathname === "/" && hash === href.replace("/", "");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const { m } = useI18n();
  const variant = status === "authenticated" ? "app" : "marketing";
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const handleSectionChange = (event?: Event) => {
      const sectionId = (event as CustomEvent<{ sectionId?: string }>)?.detail?.sectionId;
      setActiveHash(sectionId ? `#${sectionId}` : window.location.hash);
    };

    window.addEventListener("hashchange", handleSectionChange);
    window.addEventListener("landing:section-change", handleSectionChange);
    queueMicrotask(() => setActiveHash(window.location.hash));
    return () => {
      window.removeEventListener("hashchange", handleSectionChange);
      window.removeEventListener("landing:section-change", handleSectionChange);
    };
  }, []);

  const isActive = (href: string, availability: string, kind: string) =>
    availability === "available" && kind === "internal"
      ? isActiveInternalLink(pathname, activeHash, href)
      : false;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center leading-none">
          <SayvelaBrand size="sm" />
        </Link>

        {variant === "marketing" ? (
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {marketingNavItems.map((item) => (
              <NavItemLink
                key={item.id}
                item={item}
                variant="pill"
                isActive={isActive(item.href, item.availability, item.kind)}
              />
            ))}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="hidden items-center gap-2 lg:flex">
          {status === "loading" ? (
            <div className="flex items-center gap-2" aria-busy="true">
              <span className="chip">{m.nav.checkingSession}</span>
            </div>
          ) : variant === "app" ? (
            <>
              <PlanStatus />
              <LanguageSwitcher />
              <ThemeToggle />
              <div className="mx-1 h-5 w-px bg-line" />
              <UserMenu />
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <ThemeToggle />
              <AuthActions />
            </>
          )}
        </div>

        <MobileHeaderMenu variant={variant} activePathname={pathname} activeHash={activeHash} />
      </div>

      {variant === "app" ? (
        <div className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <nav className="no-scrollbar flex items-center gap-6 overflow-x-auto">
              {appPrimaryNavItems.map((item) => (
                <NavItemLink
                  key={item.id}
                  item={item}
                  variant="tab"
                  indicatorLayoutId="app-nav-selection"
                  isActive={isActive(item.href, item.availability, item.kind)}
                />
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
