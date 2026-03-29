"use client";

import Link from "next/link";
import {
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
} from "@/lib/billing-catalog";
import { useEntitlement } from "@/lib/entitlement";
import { type Value, renderValue } from "@/components/billing/comparison-values";

const rows: Array<{
  label: string;
  free: Value;
  lite: Value;
  pro: Value;
  enterprise: Value;
}> = [
  {
    label: "Phút mỗi tháng",
    free: { kind: "text", text: `${BILLING_PLAN_MINUTES.free}` },
    lite: { kind: "text", text: `${BILLING_PLAN_MINUTES.lite}` },
    pro: { kind: "text", text: `${BILLING_PLAN_MINUTES.pro}` },
    enterprise: { kind: "custom" },
  },
  {
    label: "Transcription + translation",
    free: { kind: "yes" },
    lite: { kind: "yes" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "Dual audio",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "Speaker diarization",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "Mic translation TTS",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "Content protection",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "Lưu history",
    free: { kind: "text", text: `${BILLING_PLAN_HISTORY_DAYS.free} ngày` },
    lite: { kind: "text", text: `${BILLING_PLAN_HISTORY_DAYS.lite} ngày` },
    pro: { kind: "text", text: `${BILLING_PLAN_HISTORY_DAYS.pro} ngày` },
    enterprise: { kind: "custom" },
  },
  {
    label: "Billing portal self-serve",
    free: { kind: "no" },
    lite: { kind: "yes" },
    pro: { kind: "yes" },
    enterprise: { kind: "custom" },
  },
  {
    label: "SSO/SAML",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "no" },
    enterprise: { kind: "yes" },
  },
  {
    label: "Audit log",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "no" },
    enterprise: { kind: "yes" },
  },
  {
    label: "Invoice / hợp đồng",
    free: { kind: "no" },
    lite: { kind: "no" },
    pro: { kind: "no" },
    enterprise: { kind: "yes" },
  },
];

export function PricingComparisonTable() {
  const { state } = useEntitlement();
  const showUpgradeHint =
    state.kind === "ready" &&
    (state.entitlement.plan === "free" || state.entitlement.plan === "lite");

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">So sánh chi tiết các gói</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
            Đối chiếu nhanh quota và tính năng để chọn gói phù hợp nhất.
          </p>
        </div>
        {showUpgradeHint ? (
          <Link href="/settings/billing" className="glass-button">
            Nâng cấp ngay
          </Link>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[900px] glass-panel-muted p-2">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-white/55">
                <th className="px-4 py-3">Tính năng</th>
                <th className="px-4 py-3">Free</th>
                <th className="px-4 py-3">Lite</th>
                <th className="px-4 py-3">Pro</th>
                <th className="px-4 py-3">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-white/8">
                  <td className="px-4 py-4 text-sm font-medium text-white/80">
                    {row.label}
                  </td>
                  <td className="px-4 py-4">{renderValue(row.free)}</td>
                  <td className="px-4 py-4">{renderValue(row.lite)}</td>
                  <td className="px-4 py-4">{renderValue(row.pro)}</td>
                  <td className="px-4 py-4">{renderValue(row.enterprise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
