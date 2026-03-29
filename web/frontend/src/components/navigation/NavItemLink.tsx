"use client";

import Link from "next/link";
import type { NavItem } from "@/components/navigation/nav-items";

type NavItemLinkProps = {
  item: NavItem;
  isActive?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function NavItemLink({ item, isActive = false, onNavigate, className }: NavItemLinkProps) {
  const baseClassName = `${isActive ? "glass-chip-active" : "nav-link"} inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm transition hover:border-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30`;
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  if (item.availability === "soon") {
    return (
      <button
        type="button"
        className={`${combinedClassName} cursor-not-allowed opacity-60`}
        aria-disabled="true"
        onClick={onNavigate}
      >
        <span>{item.label}</span>
        <span className="rounded-full border border-white/14 bg-white/8 px-2 py-0.5 text-[0.7rem] text-white/70">
          Sắp có
        </span>
      </button>
    );
  }

  if (item.kind === "external") {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={combinedClassName}
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={combinedClassName} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}
