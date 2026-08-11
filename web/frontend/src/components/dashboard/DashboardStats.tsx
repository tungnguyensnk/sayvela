"use client";

import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";
import { useSessions } from "@/hooks/useSessions";
import { useI18n } from "@/i18n/client";
import { BILLING_PLAN_HISTORY_DAYS } from "@/lib/billing-catalog";
import { Meter, Skeleton } from "@/components/ui/primitives";
import { ClockIcon, GaugeIcon, ListIcon } from "@/components/ui/icons";
import { formatLongDate } from "@/lib/format";

function Tile({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{eyebrow}</span>
        <span className="text-faint">{icon}</span>
      </div>
      {children}
    </div>
  );
}

export function DashboardStats() {
  const { state } = useEntitlement();
  const { state: sessionsState } = useSessions(1, 1);
  const { locale, m } = useI18n();

  if (state.kind === "loading" || state.kind === "unauthenticated") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted">{m.dashboard.billingError}</p>
        <Link href="/settings/billing" className="btn btn-secondary btn-sm">
          {m.dashboard.openBilling}
        </Link>
      </div>
    );
  }

  const e = state.entitlement;
  const pct = Math.min(100, e.usagePercentage);
  const resetAt = formatLongDate(e.cycleEndsAt, locale);
  const totalSessions = sessionsState.kind === "ready" ? sessionsState.data.total : null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile eyebrow={m.dashboard.tiles.usage} icon={<GaugeIcon />}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-semibold tabular-nums">
            {e.minutesUsed}
          </span>
          <span className="text-sm text-muted tabular-nums">
            / {e.minutesPerMonth} {m.common.minutesShort}
          </span>
        </div>
        <Meter value={pct} label={m.plan.usageTitle(pct)} />
        <p className="text-xs text-muted">
          {m.dashboard.tiles.usageRemaining(e.minutesRemaining)}
          {resetAt ? ` · ${m.dashboard.tiles.usageReset(resetAt)}` : ""}
        </p>
      </Tile>

      <Tile eyebrow={m.dashboard.tiles.plan} icon={<ClockIcon />}>
        <div className="flex items-center gap-2">
          <span className="font-display text-3xl font-semibold">{m.plan[e.plan]}</span>
          <span className="chip chip-accent">{m.plan.current}</span>
        </div>
        <p className="text-xs text-muted">
          {m.dashboard.tiles.planRetention(BILLING_PLAN_HISTORY_DAYS[e.plan])}
        </p>
        {e.upgradeRecommendation ? (
          <Link
            href="/pricing"
            className="font-display text-xs font-semibold text-accent hover:underline"
          >
            {m.dashboard.tiles.planUpgrade(m.plan[e.upgradeRecommendation])} →
          </Link>
        ) : null}
      </Tile>

      <Tile eyebrow={m.dashboard.tiles.sessions} icon={<ListIcon />}>
        {totalSessions === null ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <span className="font-display text-3xl font-semibold tabular-nums">
            {totalSessions}
          </span>
        )}
        <p className="text-xs text-muted">{m.dashboard.tiles.sessionsFrom}</p>
        <Link
          href="/sessions"
          className="font-display text-xs font-semibold text-accent hover:underline"
        >
          {m.dashboard.tiles.sessionsAll} →
        </Link>
      </Tile>
    </div>
  );
}
