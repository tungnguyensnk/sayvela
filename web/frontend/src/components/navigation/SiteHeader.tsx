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

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/48 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center leading-none">
          <SayvelaBrand size="sm" priority />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-3 text-sm text-white/68 lg:flex">
          {variant === "app"
            ? appPrimaryNavItems.map((item) => (
                <NavItemLink
                  key={`${item.label}-${item.href}`}
                  item={item}
                  indicatorLayoutId="desktop-nav-selection"
                  isActive={item.availability === "available" && item.kind === "internal"
                    ? isActiveInternalLink(pathname, activeHash, item.href)
                    : false}
                />
              ))
            : marketingNavItems.map((item) => (
                <NavItemLink
                  key={`${item.label}-${item.href}`}
                  item={item}
                  indicatorLayoutId="desktop-nav-selection"
                  isActive={item.availability === "available" && item.kind === "internal"
                    ? isActiveInternalLink(pathname, activeHash, item.href)
                    : false}
                />
              ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {status === "loading" ? (
            <div className="flex flex-wrap items-center gap-3" aria-busy="true">
              <div className="glass-chip text-center text-sm text-white/80 animate-pulse">
                Checking session…
              </div>
              <div className="glass-button w-44 opacity-60 pointer-events-none" aria-hidden="true" />
              <div className="glass-button w-32 opacity-60 pointer-events-none" aria-hidden="true" />
            </div>
          ) : variant === "app" ? (
            <div className="flex flex-wrap items-center gap-3">
              <PlanStatus />
              <UserMenu />
            </div>
          ) : (
            <AuthActions />
          )}
        </div>

        <MobileHeaderMenu variant={variant} activePathname={pathname} activeHash={activeHash} />
      </div>
    </header>
  );
}
