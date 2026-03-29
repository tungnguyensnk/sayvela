"use client";

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

function isActiveInternalLink(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const variant = status === "authenticated" ? "app" : "marketing";

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
                  isActive={item.availability === "available" && item.kind === "internal"
                    ? isActiveInternalLink(pathname, item.href)
                    : false}
                />
              ))
            : marketingNavItems.map((item) => (
                <NavItemLink
                  key={`${item.label}-${item.href}`}
                  item={item}
                  isActive={item.availability === "available" && item.kind === "internal"
                    ? isActiveInternalLink(pathname, item.href)
                    : false}
                />
              ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {status === "loading" ? (
            <div className="flex flex-wrap items-center gap-3" aria-busy="true">
              <div className="glass-chip text-center text-sm text-white/80 animate-pulse">
                Đang kiểm tra phiên…
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

        <MobileHeaderMenu variant={variant} activePathname={pathname} />
      </div>
    </header>
  );
}
