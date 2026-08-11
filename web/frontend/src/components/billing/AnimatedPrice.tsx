"use client";

import type { BillingInterval } from "@/lib/billing-catalog";
import { useI18n } from "@/i18n/client";

export function AnimatedPrice({
  interval,
  monthlyPrice,
  yearlyListPrice,
  yearlyPrice,
  monthsSaved,
}: {
  interval: BillingInterval;
  monthlyPrice: number;
  yearlyListPrice: number;
  yearlyPrice: number;
  monthsSaved: number;
}) {
  const { m } = useI18n();

  return (
    <div className="mt-3 grid grid-cols-1 grid-rows-1 items-center">
      <div
        className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out ${
          interval === "month" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={interval !== "month"}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-medium text-muted">$</span>
          <span className="font-display text-4xl font-semibold leading-none tabular-nums">
            {monthlyPrice}
          </span>
        </div>
      </div>

      <div
        className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out ${
          interval === "year" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={interval !== "year"}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-medium text-muted">$</span>
          <span className="font-display text-4xl font-semibold leading-none tabular-nums">
            {yearlyPrice}
          </span>
          <span className="text-base text-faint line-through decoration-1 tabular-nums">
            {yearlyListPrice}
          </span>
          <span className="chip chip-ok whitespace-nowrap">
            {m.pricing.saveMonths(monthsSaved)}
          </span>
        </div>
      </div>
    </div>
  );
}
