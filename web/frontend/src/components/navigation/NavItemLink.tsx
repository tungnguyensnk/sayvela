"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { NavItem } from "@/components/navigation/nav-items";

type NavItemLinkProps = {
  item: NavItem;
  isActive?: boolean;
  onNavigate?: () => void;
  className?: string;
  indicatorLayoutId?: string;
};

export function NavItemLink({ item, isActive = false, onNavigate, className, indicatorLayoutId }: NavItemLinkProps) {
  const activeClassName = isActive && !indicatorLayoutId ? "glass-chip-active" : "nav-link";
  const baseClassName = `${activeClassName} relative inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm transition-colors duration-300 ease-out hover:border-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30`;
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  const handleNavigate = (event?: React.MouseEvent<HTMLAnchorElement>) => {
    if (event && item.href.startsWith("/#") && window.location.pathname === "/") {
      event.preventDefault();
      const sectionId = item.href.slice(2);
      window.history.pushState(null, "", item.href);
      window.dispatchEvent(new CustomEvent("landing:navigate", { detail: { sectionId } }));
    }
    onNavigate?.();
  };

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
    <Link href={item.href} className={combinedClassName} onClick={handleNavigate}>
      {isActive && indicatorLayoutId ? (
        <motion.span
          layoutId={indicatorLayoutId}
          className="glass-chip-active absolute inset-0 rounded-full"
          transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
        />
      ) : null}
      <span className={`relative z-10 transition-colors duration-300 ${isActive ? "text-white" : ""}`}>
        {item.label}
      </span>
    </Link>
  );
}
