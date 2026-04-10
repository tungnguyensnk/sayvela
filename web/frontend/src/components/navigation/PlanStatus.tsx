"use client";

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

  return (
    <div className={`flex ${compact ? "flex-col items-stretch" : "flex-wrap items-center"} gap-2`}>
      <div className="glass-chip text-center text-sm text-white/80">
        {planLabel} · {usageLabel}
      </div>
    </div>
  );
}
