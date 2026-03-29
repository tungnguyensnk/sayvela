"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";
import {
  BILLING_FEATURE_LABELS,
  BILLING_PLAN_FEATURES,
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
  type BillingInterval,
  type BillingPlan,
} from "@/lib/billing-catalog";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";

export function formatDateVi(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
  }

  return `${day} thg ${month}, ${year}`;
}

function getPlanLabel(plan: BillingPlan) {
  if (plan === "pro") return "Pro";
  if (plan === "lite") return "Lite";
  return "Free";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-200/90" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.7 13.6 3.7 9.6l1.4-1.4 2.6 2.6 6.9-6.9 1.4 1.4-8.3 8.3Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-white/45" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.3 4 4 5.3 8.7 10 4 14.7 5.3 16 10 11.3 14.7 16 16 14.7 11.3 10 16 5.3 14.7 4 10 8.7 5.3 4Z"
      />
    </svg>
  );
}

function UsageBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 shadow-[0_10px_24px_-18px_rgba(56,189,248,0.8)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PlanFeatures({ plan }: { plan: BillingPlan }) {
  const features = BILLING_PLAN_FEATURES[plan];
  const enabled: string[] = [];
  const disabled: string[] = [];

  for (const key of Object.keys(BILLING_FEATURE_LABELS) as (keyof typeof BILLING_FEATURE_LABELS)[]) {
    if (features[key]) enabled.push(BILLING_FEATURE_LABELS[key]);
    else disabled.push(BILLING_FEATURE_LABELS[key]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel-muted p-6">
        <div className="text-sm font-medium text-white">Đang có</div>
        <ul className="mt-4 space-y-2 text-sm text-white/72">
          <li className="flex items-start gap-2">
            <CheckIcon />
            <span>transcription + translation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            <span>history {BILLING_PLAN_HISTORY_DAYS[plan]} ngày</span>
          </li>
          {enabled.map((label) => (
            <li key={label} className="flex items-start gap-2">
              <CheckIcon />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass-panel-muted p-6">
        <div className="text-sm font-medium text-white">Chưa có</div>
        <ul className="mt-4 space-y-2 text-sm text-white/72">
          {disabled.length === 0 ? (
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>tất cả tính năng cao cấp đã được mở</span>
            </li>
          ) : (
            disabled.map((label) => (
              <li key={label} className="flex items-start gap-2">
                <XIcon />
                <span>{label}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function UpgradeCard({
  currentPlan,
  interval,
  onIntervalChange,
}: {
  currentPlan: BillingPlan;
  interval: BillingInterval;
  onIntervalChange: (value: BillingInterval) => void;
}) {
  const targetPlan = currentPlan === "free" ? "lite" : "pro";
  const title = targetPlan === "lite" ? "Nâng cấp lên Lite" : "Nâng cấp lên Pro";
  const minutes = BILLING_PLAN_MINUTES[targetPlan];
  const historyDays = BILLING_PLAN_HISTORY_DAYS[targetPlan];

  return (
    <div className="glass-panel p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm text-white/68">
            {targetPlan === "lite"
              ? "Dành cho nhu cầu đều đặn: thêm phút và history dài hơn."
              : "Mở khóa workflow đầy đủ: dual audio, diarization, TTS và bảo mật nội dung."}
          </div>
        </div>
        <div className="relative inline-flex rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur">
          <div
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] transform-gpu rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 shadow-[0_10px_24px_-18px_rgba(56,189,248,0.8)] will-change-transform transition-transform duration-200 ease-out ${
              interval === "year" ? "translate-x-full" : "translate-x-0"
            }`}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => onIntervalChange("month")}
            className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              interval === "month" ? "text-slate-950" : "text-white/70"
            }`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => onIntervalChange("year")}
            className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              interval === "year" ? "text-slate-950" : "text-white/70"
            }`}
          >
            Năm
          </button>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-white/72">
        <li className="flex items-start gap-2">
          <CheckIcon />
          <span>{minutes} phút / tháng</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckIcon />
          <span>history {historyDays} ngày</span>
        </li>
        {targetPlan === "pro" ? (
          <>
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>dual audio capture</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>speaker diarization</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon />
              <span>mic translation TTS</span>
            </li>
          </>
        ) : null}
      </ul>

      {currentPlan === "lite" ? (
        <div className="mt-5 text-sm text-emerald-200/85">
          Nâng Lite → Pro sẽ giữ lại số phút còn lại của chu kỳ hiện tại.
        </div>
      ) : null}

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <CheckoutButton
          plan={targetPlan}
          interval={interval}
          label={targetPlan === "lite" ? "Nâng cấp Lite" : "Nâng cấp Pro"}
          className="primary-button w-full"
        />
        <Link href="/pricing" className="glass-button w-full text-center">
          Xem bảng giá
        </Link>
      </div>
    </div>
  );
}

export function BillingSettingsDashboard() {
  const { state } = useEntitlement();
  const [interval, setInterval] = useState<BillingInterval>("month");

  const content = useMemo(() => {
    if (state.kind === "unauthenticated") {
      return null;
    }

    if (state.kind === "loading") {
      return (
        <div className="glass-panel p-10">
          <div className="section-eyebrow">Billing</div>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Quản lý gói subscription
          </h1>
          <div className="mt-6 text-sm text-white/62">Đang tải dữ liệu billing...</div>
        </div>
      );
    }

    if (state.kind === "error") {
      return (
        <div className="glass-panel p-10">
          <div className="section-eyebrow">Billing</div>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Quản lý gói subscription
          </h1>
          <div className="mt-6 text-sm text-rose-200/90">{state.message}</div>
          <div className="mt-8 max-w-sm">
            <ManageBillingButton />
          </div>
        </div>
      );
    }

    const e = state.entitlement;
    const planLabel = getPlanLabel(e.plan);
    const resetAt = formatDateVi(e.cycleEndsAt);
    const used = e.minutesUsed;
    const limit = e.minutesPerMonth;
    const remaining = e.minutesRemaining;

    return (
      <div className="space-y-6">
        <div className="glass-panel p-10">
          <div className="section-eyebrow">Billing</div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Gói hiện tại: {planLabel}
                </h1>
                <div className="glass-chip glass-chip-active">đang dùng</div>
              </div>
              <div className="mt-3 text-sm text-white/68">
                {resetAt ? `Reset quota vào ${resetAt}.` : "Quota được reset theo chu kỳ hiện tại."}
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {e.plan !== "free" ? <ManageBillingButton /> : null}
              <Link href="/pricing" className="glass-button w-full text-center sm:w-auto">
                Pricing
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="glass-panel-muted p-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-white">Quota phút</div>
                <div className="glass-chip">{remaining} phút còn lại</div>
              </div>
              <div className="mt-4 text-2xl font-semibold text-white">
                {remaining} / {limit} phút
              </div>
              <div className="mt-4">
                <UsageBar value={e.usagePercentage} />
              </div>
              <div className="mt-3 text-sm text-white/62">
                Đã dùng {used} phút trong chu kỳ hiện tại.
              </div>
            </div>

            <div className="glass-panel-muted p-6">
              <div className="text-sm font-medium text-white">Tóm tắt</div>
              <ul className="mt-4 space-y-2 text-sm text-white/72">
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  <span>{BILLING_PLAN_MINUTES[e.plan]} phút / tháng</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  <span>history {BILLING_PLAN_HISTORY_DAYS[e.plan]} ngày</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  <span>thanh toán và quản lý qua Stripe</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <PlanFeatures plan={e.plan} />

        {e.plan === "free" || e.plan === "lite" ? (
          <UpgradeCard currentPlan={e.plan} interval={interval} onIntervalChange={setInterval} />
        ) : null}
      </div>
    );
  }, [interval, state]);

  return content;
}
