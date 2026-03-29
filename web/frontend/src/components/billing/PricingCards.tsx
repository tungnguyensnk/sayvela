"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
  type BillingInterval,
} from "@/lib/billing-catalog";
import { useEntitlement } from "@/lib/entitlement";
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

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const { state } = useEntitlement();

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

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-white/62">
          Thanh toán qua Stripe. Bạn có thể hủy bất kỳ lúc nào.
        </div>
        <div className="flex items-center gap-3">
          <IntervalToggle interval={interval} onChange={setInterval} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <PricingPlanCard
          className="glass-panel-muted flex flex-col p-6"
          title="Free"
          badge={isFree ? <div className="glass-chip glass-chip-active">đang dùng</div> : undefined}
          price={<div className="mt-2 text-3xl font-semibold text-white">0</div>}
          priceCaption={<div className="mt-1 text-sm text-white/62">USD / tháng</div>}
          features={
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>{BILLING_PLAN_MINUTES.free} phút / tháng</li>
              <li>transcription + translation cơ bản</li>
              <li>history {BILLING_PLAN_HISTORY_DAYS.free} ngày</li>
            </ul>
          }
          footer={
            state.kind === "unauthenticated" ? (
              <Link href="/auth?mode=register" className="glass-button w-full">
                Bắt đầu miễn phí
              </Link>
            ) : state.kind === "loading" ? (
              <div className="text-sm text-white/60">Đang kiểm tra phiên...</div>
            ) : state.kind === "error" ? (
              <div className="space-y-3">
                <div className="text-sm text-rose-200/90">{state.message}</div>
                <ManageBillingButton className="glass-button w-full" label="Quản lý" />
              </div>
            ) : isFree ? (
              <ManageBillingButton label="Quản lý" />
            ) : null}
        />

        <PricingPlanCard
          className="glass-panel-muted flex flex-col p-6"
          title="Lite"
          badge={
            isLite ? <div className="glass-chip glass-chip-active">đang dùng</div> : <div className="glass-chip">tiết kiệm</div>
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
          priceCaption={<div className="mt-1 text-sm text-white/62">USD / người dùng / {interval === "month" ? "tháng" : "năm"}</div>}
          features={
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>{BILLING_PLAN_MINUTES.lite} phút / tháng</li>
              <li>transcription + translation</li>
              <li>history {BILLING_PLAN_HISTORY_DAYS.lite} ngày</li>
            </ul>
          }
          footer={
            showLoadingEntitlement ? (
              <div className="text-sm text-white/60">Đang kiểm tra subscription...</div>
            ) : isPro ? (
              <></>
            ) : isLite ? (
              <ManageBillingButton label="Quản lý" />
            ) : (
              <CheckoutButton
                plan="lite"
                interval={interval}
                label="Nâng cấp Lite"
              />
            )}
        />

        <PricingPlanCard
          className="glass-panel flex flex-col border-cyan-200/18 bg-white/10 p-6"
          title="Pro"
          badge={isPro ? <div className="glass-chip glass-chip-active">đang dùng</div> : <div className="glass-chip">khuyến nghị</div>}
          price={
            <AnimatedPrice
              interval={interval}
              monthlyPrice={proMonthlyPrice}
              yearlyListPrice={proYearlyListPrice}
              yearlyPrice={proYearlyPrice}
              monthsSaved={proMonthsSaved}
            />
          }
          priceCaption={
            <div className="mt-1 text-sm text-white/62">USD / người dùng / {interval === "month" ? "tháng" : "năm"}</div>
          }
          features={
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>{BILLING_PLAN_MINUTES.pro} phút / tháng</li>
              <li>dual audio capture</li>
              <li>speaker diarization</li>
              <li>mic translation TTS</li>
              <li>history {BILLING_PLAN_HISTORY_DAYS.pro} ngày</li>
            </ul>
          }
          footer={
            showLoadingEntitlement ? (
              <div className="text-sm text-white/60">Đang kiểm tra subscription...</div>
            ) : isPro ? (
              <ManageBillingButton label="Quản lý" />
            ) : (
              <CheckoutButton
                plan="pro"
                interval={interval}
                label="Nâng cấp Pro"
              />
            )}
        />

        <PricingPlanCard
          className="glass-panel-muted flex flex-col p-6"
          title="Enterprise"
          price={<div className="mt-2 text-3xl font-semibold text-white">Custom</div>}
          priceCaption={<div className="mt-1 text-sm text-white/62">SSO · SLA · invoice</div>}
          features={
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>seat + quota tùy chỉnh</li>
              <li>SSO/SAML</li>
              <li>audit log</li>
              <li>invoice và hợp đồng doanh nghiệp</li>
            </ul>
          }
          footer={
            <a href="mailto:sales@sayvela.local" className="glass-button w-full">
              Liên hệ sales
            </a>
          }
        />
      </div>
    </div>
  );
}
