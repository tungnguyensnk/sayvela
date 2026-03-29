import type { BillingInterval, BillingPlan } from "@/lib/billing-catalog";

type PlanPricing = Record<BillingInterval, number>;

export const PLAN_PRICING: Record<Extract<BillingPlan, "lite" | "pro">, PlanPricing> = {
  lite: {
    month: 9,
    year: 90,
  },
  pro: {
    month: 24,
    year: 240,
  },
};

export function getYearlyListPrice(monthlyPrice: number) {
  return monthlyPrice * 12;
}

export function calculateMonthsSaved({
  monthlyPrice,
  yearlyPrice,
}: {
  monthlyPrice: number;
  yearlyPrice: number;
}) {
  const yearlyListPrice = getYearlyListPrice(monthlyPrice);
  return Math.max(0, Math.round(yearlyListPrice / monthlyPrice - yearlyPrice / monthlyPrice));
}
