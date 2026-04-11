"use client";

import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";

// shows usage summary card with quota progress bar
export function UsageSummaryCard() {
  const { state } = useEntitlement();

  if (state.kind === "loading") {
    return <div className="glass-panel h-36 animate-pulse" />;
  }

  if (state.kind !== "ready") {
    return null;
  }

  const { entitlement } = state;
  const pct = Math.min(100, entitlement.usagePercentage);
  const barColor =
    pct >= 90
      ? "from-red-400 to-rose-500"
      : pct >= 70
        ? "from-amber-400 to-orange-400"
        : "from-cyan-300 via-sky-300 to-violet-400";

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Usage this month</p>
          <p className="text-2xl font-bold text-white/90">
            {entitlement.minutesUsed}
            <span className="text-white/45 text-sm font-normal ml-1">
              / {entitlement.minutesPerMonth} min
            </span>
          </p>
        </div>
        <span className="glass-chip capitalize">{entitlement.plan}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{entitlement.minutesRemaining} min remaining</span>
        {entitlement.upgradeRecommendation && (
          <Link href="/pricing" className="text-sky-400 hover:text-sky-300 transition-colors">
            Upgrade plan →
          </Link>
        )}
      </div>
    </div>
  );
}
