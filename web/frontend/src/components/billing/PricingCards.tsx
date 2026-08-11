"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
  type BillingInterval,
} from "@/lib/billing-catalog";
import { useEntitlement } from "@/lib/entitlement";
import { useI18n } from "@/i18n/client";
import { AnimatedPrice } from "@/components/billing/AnimatedPrice";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { IntervalToggle } from "@/components/billing/IntervalToggle";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { PricingPlanCard } from "@/components/billing/PricingPlanCard";
import {
  PLAN_PRICING,
  calculateMonthsSaved,
  getYearlyListPrice,
} from "@/components/billing/pricing-data";

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-xs text-faint">{children}</div>;
}

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const { state } = useEntitlement();
  const { m } = useI18n();
  const p = m.pricing;

  const liteMonthlyPrice = PLAN_PRICING.lite.month;
  const liteYearlyPrice = PLAN_PRICING.lite.year;
  const liteYearlyListPrice = getYearlyListPrice(liteMonthlyPrice);
  const liteMonthsSaved = calculateMonthsSaved({
    monthlyPrice: liteMonthlyPrice,
    yearlyPrice: liteYearlyPrice,
  });

  const proMonthlyPrice = PLAN_PRICING.pro.month;
  const proYearlyPrice = PLAN_PRICING.pro.year;
  const proYearlyListPrice = getYearlyListPrice(proMonthlyPrice);
  const proMonthsSaved = calculateMonthsSaved({
    monthlyPrice: proMonthlyPrice,
    yearlyPrice: proYearlyPrice,
  });

  const showLoadingEntitlement = state.kind === "loading";
  const isPro = state.kind === "ready" && state.entitlement.plan === "pro";
  const isLite = state.kind === "ready" && state.entitlement.plan === "lite";
  const isFree = state.kind === "ready" && state.entitlement.plan === "free";
  const perUser = interval === "month" ? p.perUserMonth : p.perUserYear;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">{p.stripeNote}</p>
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>

      <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
        <PricingPlanCard
          title={m.plan.free}
          badge={isFree ? <span className="chip chip-accent">{m.plan.current}</span> : undefined}
          price={
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-lg font-medium text-muted">$</span>
              <span className="font-display text-4xl font-semibold leading-none tabular-nums">
                0
              </span>
            </div>
          }
          priceCaption={<Caption>{p.perMonth}</Caption>}
          features={p.planFeatures.free(
            BILLING_PLAN_MINUTES.free,
            BILLING_PLAN_HISTORY_DAYS.free,
          )}
          footer={
            state.kind === "unauthenticated" ? (
              <Link href="/auth?mode=register" className="btn btn-secondary btn-block">
                {p.startFree}
              </Link>
            ) : state.kind === "loading" ? (
              <div className="text-sm text-muted">{p.checkingSession}</div>
            ) : state.kind === "error" ? (
              <div className="flex flex-col gap-3">
                <p role="alert" className="text-sm text-crit">
                  {m.billing.entitlementError}
                </p>
                <ManageBillingButton className="btn btn-secondary btn-block" />
              </div>
            ) : isFree ? (
              <ManageBillingButton />
            ) : null
          }
        />

        <PricingPlanCard
          title={m.plan.lite}
          badge={
            isLite ? (
              <span className="chip chip-accent">{m.plan.current}</span>
            ) : (
              <span className="chip">{m.plan.thrifty}</span>
            )
          }
          price={
            <AnimatedPrice
              interval={interval}
              monthlyPrice={liteMonthlyPrice}
              yearlyListPrice={liteYearlyListPrice}
              yearlyPrice={liteYearlyPrice}
              monthsSaved={liteMonthsSaved}
            />
          }
          priceCaption={<Caption>{perUser}</Caption>}
          features={p.planFeatures.lite(
            BILLING_PLAN_MINUTES.lite,
            BILLING_PLAN_HISTORY_DAYS.lite,
          )}
          footer={
            showLoadingEntitlement ? (
              <div className="text-sm text-muted">{p.checkingSubscription}</div>
            ) : isPro ? (
              <></>
            ) : isLite ? (
              <ManageBillingButton />
            ) : (
              <CheckoutButton plan="lite" interval={interval} />
            )
          }
        />

        <PricingPlanCard
          featured
          title={m.plan.pro}
          badge={
            <span className="chip chip-accent">
              {isPro ? m.plan.current : m.plan.recommended}
            </span>
          }
          price={
            <AnimatedPrice
              interval={interval}
              monthlyPrice={proMonthlyPrice}
              yearlyListPrice={proYearlyListPrice}
              yearlyPrice={proYearlyPrice}
              monthsSaved={proMonthsSaved}
            />
          }
          priceCaption={<Caption>{perUser}</Caption>}
          features={p.planFeatures.pro(
            BILLING_PLAN_MINUTES.pro,
            BILLING_PLAN_HISTORY_DAYS.pro,
          )}
          footer={
            showLoadingEntitlement ? (
              <div className="text-sm text-muted">{p.checkingSubscription}</div>
            ) : isPro ? (
              <ManageBillingButton />
            ) : (
              <CheckoutButton plan="pro" interval={interval} />
            )
          }
        />

        <PricingPlanCard
          title={m.plan.enterprise}
          price={
            <div className="mt-3">
              <span className="font-display text-3xl font-semibold leading-none">
                {p.custom}
              </span>
            </div>
          }
          priceCaption={<Caption>{p.enterpriseCaption}</Caption>}
          features={p.planFeatures.enterprise}
          footer={
            <a href="mailto:sales@sayvela.local" className="btn btn-secondary btn-block">
              {p.contactSales}
            </a>
          }
        />
      </div>
    </div>
  );
}
