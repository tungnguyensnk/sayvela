"use client";

import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";

type PlanStatusProps = {
  compact?: boolean;
};

function formatPlanLabel(plan: string) {
  if (plan === "free") return "Free";
  if (plan === "lite") return "Lite";
  if (plan === "pro") return "Pro";
  return plan;
}

export function PlanStatus({ compact = false }: PlanStatusProps) {
  const { state } = useEntitlement();

  if (state.kind === "unauthenticated") {
    return null;
  }

  if (state.kind === "loading") {
    return (
      <div className={`flex ${compact ? "flex-col items-stretch" : "items-center"} gap-2`}>
        <div className="glass-chip text-sm text-white/80 animate-pulse">Đang kiểm tra gói…</div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={`flex ${compact ? "flex-col items-stretch" : "items-center"} gap-2`}>
        <div className="glass-chip text-sm text-white/80">Không thể kiểm tra gói</div>
      </div>
    );
  }

  const { entitlement } = state;
  const planLabel = formatPlanLabel(entitlement.plan);
  const usageLabel = compact
    ? `${entitlement.minutesUsed}/${entitlement.minutesPerMonth} phút`
    : `${entitlement.minutesUsed}/${entitlement.minutesPerMonth} phút`;

  const showUpgrade =
    entitlement.plan === "free" ||
    (entitlement.plan === "lite" && entitlement.upgradeRecommendation === "pro");

  const upgradeLabel =
    entitlement.plan === "lite" && entitlement.upgradeRecommendation === "pro"
      ? "Upgrade Pro"
      : "Nâng cấp";

  return (
    <div className={`flex ${compact ? "flex-col items-stretch" : "flex-wrap items-center"} gap-2`}>
      <div className="glass-chip text-center text-sm text-white/80">
        {planLabel} · {usageLabel}
      </div>
      {showUpgrade ? (
        <Link href="/pricing" className="primary-button min-h-[2.75rem] px-5 text-sm">
          {upgradeLabel}
        </Link>
      ) : null}
    </div>
  );
}
