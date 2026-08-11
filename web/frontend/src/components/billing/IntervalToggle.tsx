"use client";

import type { BillingInterval } from "@/lib/billing-catalog";
import { useI18n } from "@/i18n/client";

export function IntervalToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  const { m } = useI18n();
  const options: { value: BillingInterval; label: string }[] = [
    { value: "month", label: m.pricing.monthly },
    { value: "year", label: m.pricing.yearly },
  ];

  return (
    <div
      role="group"
      aria-label={m.pricing.intervalGroup}
      className="relative inline-flex border border-line bg-raised p-0.5"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] border border-line bg-surface transition-transform duration-200 ease-out ${
          interval === "year" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={interval === option.value}
          className={`relative z-10 min-w-20 px-4 py-1.5 font-display text-sm font-medium transition-colors ${
            interval === option.value ? "text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
