"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { NavIcon, NavItem } from "@/components/navigation/nav-items";
import { useI18n } from "@/i18n/client";
import { CardIcon, GaugeIcon, ListIcon, SparkIcon } from "@/components/ui/icons";

type Variant = "tab" | "pill" | "row";

type NavItemLinkProps = {
  item: NavItem;
  isActive?: boolean;
  onNavigate?: () => void;
  className?: string;
  indicatorLayoutId?: string;
  variant?: Variant;
};

const ICONS: Record<NavIcon, typeof GaugeIcon> = {
  gauge: GaugeIcon,
  list: ListIcon,
  card: CardIcon,
  spark: SparkIcon,
};

const BASE: Record<Variant, string> = {
  tab: "relative inline-flex h-10 items-center gap-2 whitespace-nowrap px-1 font-display text-sm font-medium transition-colors",
  pill: "nav-link",
  row: "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 font-display text-sm font-medium transition-colors",
};

function stateClass(variant: Variant, isActive: boolean) {
  if (variant === "tab") return isActive ? "text-ink" : "text-muted hover:text-ink";
  if (variant === "pill") return isActive ? "nav-link-active bg-raised" : "";
  return isActive ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised hover:text-ink";
}

export function NavItemLink({
  item,
  isActive = false,
  onNavigate,
  className,
  indicatorLayoutId,
  variant = "pill",
}: NavItemLinkProps) {
  const { m } = useI18n();
  const label = m.nav[item.id];
  const Glyph = item.icon ? ICONS[item.icon] : null;
  const showIcon = Glyph && variant !== "pill";
  const combined = [BASE[variant], stateClass(variant, isActive), className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {showIcon ? <Glyph className="shrink-0 opacity-80" /> : null}
      <span>{label}</span>
    </>
  );

  if (item.availability === "soon") {
    return (
      <button
        type="button"
        className={`${combined} cursor-not-allowed opacity-55`}
        aria-disabled="true"
        onClick={onNavigate}
      >
        {content}
        <span className="tabular ml-auto rounded-sm border border-line bg-raised px-1.5 py-0.5 text-[0.65rem] text-faint">
          {m.nav.soon}
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
        className={combined}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={combined}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      {content}
      {isActive && variant === "tab" ? (
        indicatorLayoutId ? (
          <motion.span
            layoutId={indicatorLayoutId}
            className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.7 }}
          />
        ) : (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
        )
      ) : null}
    </Link>
  );
}
