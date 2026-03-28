"use client";

import { useState } from "react";
import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";

type BillingInterval = "month" | "year";

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const { state } = useEntitlement();

  const liteMonthlyPrice = 9;
  const liteYearlyPrice = 90;
  const liteYearlyListPrice = liteMonthlyPrice * 12;
  const liteMonthsSaved = Math.max(
    0,
    Math.round(liteYearlyListPrice / liteMonthlyPrice - liteYearlyPrice / liteMonthlyPrice),
  );

  const monthlyPrice = 24;
  const yearlyPrice = 240;
  const yearlyListPrice = monthlyPrice * 12;
  const monthsSaved = Math.max(0, Math.round(yearlyListPrice / monthlyPrice - yearlyPrice / monthlyPrice));
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
          <div className="relative inline-flex rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur">
            <div
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] transform-gpu rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 shadow-[0_10px_24px_-18px_rgba(56,189,248,0.8)] will-change-transform transition-transform duration-200 ease-out ${
                interval === "year" ? "translate-x-full" : "translate-x-0"
              }`}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                interval === "month" ? "text-slate-950" : "text-white/70"
              }`}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                interval === "year" ? "text-slate-950" : "text-white/70"
              }`}
            >
              Năm
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <article className="glass-panel-muted flex flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-white">Free</div>
            {isFree ? (
              <div className="glass-chip">đang dùng</div>
            ) : isLite ? (
              <div className="glass-chip">đã có Lite</div>
            ) : isPro ? (
              <div className="glass-chip">đã có Pro</div>
            ) : null}
          </div>
          <div className="mt-2 text-3xl font-semibold text-white">0</div>
          <div className="mt-1 text-sm text-white/62">USD / tháng</div>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>300 phút / tháng</li>
            <li>transcription + translation cơ bản</li>
            <li>history 3 ngày</li>
          </ul>
          <div className="mt-auto pt-8">
            {state.kind === "unauthenticated" ? (
              <Link href="/auth?mode=register" className="glass-button w-full">
                Bắt đầu miễn phí
              </Link>
            ) : state.kind === "loading" ? (
              <div className="text-sm text-white/60">Đang kiểm tra phiên...</div>
            ) : state.kind === "error" ? (
              <div className="space-y-3">
                <div className="text-sm text-rose-200/90">{state.message}</div>
                <ManageBillingButton className="glass-button w-full" label="Quản lý subscription" />
              </div>
            ) : isPro ? (
              <button
                type="button"
                className="glass-button w-full opacity-70 pointer-events-none"
                aria-disabled="true"
              >
                Đang dùng Pro
              </button>
            ) : isLite ? (
              <button
                type="button"
                className="glass-button w-full opacity-70 pointer-events-none"
                aria-disabled="true"
              >
                Đang dùng Lite
              </button>
            ) : (
              <button
                type="button"
                className="glass-button w-full opacity-70 pointer-events-none"
                aria-disabled="true"
              >
                Đang dùng Free
              </button>
            )}
          </div>
        </article>

        <article className="glass-panel-muted flex flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-white">Lite</div>
            {isLite ? <div className="glass-chip">đang dùng</div> : <div className="glass-chip">tiết kiệm</div>}
          </div>

          <div className="mt-2 grid grid-cols-1 grid-rows-1 items-center">
            <div
              className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-opacity transition-transform duration-200 ease-out ${
                interval === "month" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
              }`}
              aria-hidden={interval !== "month"}
            >
              <div className="text-3xl font-semibold leading-none text-white">{liteMonthlyPrice}</div>
            </div>
            <div
              className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-opacity transition-transform duration-200 ease-out ${
                interval === "year" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-1"
              }`}
              aria-hidden={interval !== "year"}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold leading-none text-white/40 line-through">{liteYearlyListPrice}</span>
                <span className="text-3xl font-semibold leading-none text-white">{liteYearlyPrice}</span>
                <span className="whitespace-nowrap text-sm font-medium leading-none text-emerald-200/85">
                  tiết kiệm {liteMonthsSaved} tháng
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 text-sm text-white/62">USD / người dùng / {interval === "month" ? "tháng" : "năm"}</div>

          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>900 phút / tháng</li>
            <li>transcription + translation</li>
            <li>history 14 ngày</li>
          </ul>

          <div className="mt-auto pt-8">
            {showLoadingEntitlement ? (
              <div className="text-sm text-white/60">Đang kiểm tra subscription...</div>
            ) : isPro ? (
              <button
                type="button"
                className="glass-button w-full opacity-70 pointer-events-none"
                aria-disabled="true"
              >
                Đã có Pro
              </button>
            ) : isLite ? (
              <ManageBillingButton label="Quản lý subscription" />
            ) : (
              <CheckoutButton
                plan="lite"
                interval={interval}
                label={interval === "month" ? "Nâng cấp Lite (tháng)" : "Nâng cấp Lite (năm)"}
              />
            )}
          </div>
        </article>

        <article className="glass-panel flex flex-col border-cyan-200/18 bg-white/10 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-white">Pro</div>
            {isPro ? (
              <div className="glass-chip">đang dùng</div>
            ) : (
              <div className="glass-chip">khuyến nghị</div>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 grid-rows-1 items-center">
            <div
              className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-opacity transition-transform duration-200 ease-out ${
                interval === "month"
                  ? "opacity-100 translate-y-0"
                  : "pointer-events-none opacity-0 -translate-y-1"
              }`}
              aria-hidden={interval !== "month"}
            >
              <div className="text-3xl font-semibold leading-none text-white">
                {monthlyPrice}
              </div>
            </div>
            <div
              className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-opacity transition-transform duration-200 ease-out ${
                interval === "year"
                  ? "opacity-100 translate-y-0"
                  : "pointer-events-none opacity-0 translate-y-1"
              }`}
              aria-hidden={interval !== "year"}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold leading-none text-white/40 line-through">
                  {yearlyListPrice}
                </span>
                <span className="text-3xl font-semibold leading-none text-white">
                  {yearlyPrice}
                </span>
                <span className="whitespace-nowrap text-sm font-medium leading-none text-emerald-200/85">
                  tiết kiệm {monthsSaved} tháng
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 text-sm text-white/62">
            USD / người dùng / {interval === "month" ? "tháng" : "năm"}
          </div>

          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>2400 phút / tháng</li>
            <li>dual audio capture</li>
            <li>speaker diarization</li>
            <li>mic translation TTS</li>
            <li>history 30 ngày</li>
          </ul>

          <div className="mt-auto pt-8">
            {showLoadingEntitlement ? (
              <div className="text-sm text-white/60">Đang kiểm tra subscription...</div>
            ) : isPro ? (
              <ManageBillingButton label="Quản lý subscription" />
            ) : (
              <CheckoutButton
                plan="pro"
                interval={interval}
                label={interval === "month" ? "Nâng cấp Pro (tháng)" : "Nâng cấp Pro (năm)"}
              />
            )}
          </div>
        </article>

        <article className="glass-panel-muted flex flex-col p-6">
          <div className="text-lg font-semibold text-white">Enterprise</div>
          <div className="mt-2 text-3xl font-semibold text-white">Custom</div>
          <div className="mt-1 text-sm text-white/62">SSO · SLA · invoice</div>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>seat + quota tùy chỉnh</li>
            <li>SSO/SAML</li>
            <li>audit log</li>
            <li>invoice và hợp đồng doanh nghiệp</li>
          </ul>
          <div className="mt-auto pt-8">
            <a href="mailto:sales@sayvela.local" className="glass-button w-full">
              Liên hệ sales
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
