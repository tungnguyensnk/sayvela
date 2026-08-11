"use client";

import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";
import { useI18n } from "@/i18n/client";
import { Meter } from "@/components/ui/primitives";

type PlanStatusProps = {
  compact?: boolean;
};

export function PlanStatus({ compact = false }: PlanStatusProps) {
  const { state } = useEntitlement();
  const { m } = useI18n();

  if (state.kind === "unauthenticated") {
    return null;
  }

  if (state.kind === "loading") {
    return (
      <div
        className="skeleton h-6 w-36"
        role="status"
        aria-label={m.nav.checkingSession}
      />
    );
  }

  if (state.kind === "error") {
    return <div className="chip chip-warn">{m.plan.quotaUnavailable}</div>;
  }

  const { entitlement } = state;
  const planLabel = m.plan[entitlement.plan];
  const usageLabel = m.plan.usage(entitlement.minutesUsed, entitlement.minutesPerMonth);
  const pct = entitlement.usagePercentage;

  if (compact) {
    return (
      <Link
        href="/settings/billing"
        className="card-inset flex flex-col gap-2 p-3 transition-colors hover:border-line-strong"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="chip chip-accent">{planLabel}</span>
          <span className="tabular text-xs text-muted">{usageLabel}</span>
        </div>
        <Meter value={pct} label={m.plan.usageTitle(pct)} />
      </Link>
    );
  }

  return (
    <Link
      href="/settings/billing"
      className="chip gap-2 transition-colors hover:border-line-strong hover:text-ink"
      title={m.plan.usageTitle(pct)}
    >
      <span className="tabular">
        {planLabel} · {usageLabel}
      </span>
      <span className="hidden h-1 w-9 overflow-hidden bg-sunken sm:block">
        <span
          className={`block h-full ${
            pct >= 90 ? "bg-crit" : pct >= 75 ? "bg-warn" : "bg-accent"
          }`}
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        />
      </span>
    </Link>
  );
}
