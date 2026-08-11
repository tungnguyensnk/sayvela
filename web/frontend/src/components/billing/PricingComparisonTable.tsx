"use client";

import Link from "next/link";
import {
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
} from "@/lib/billing-catalog";
import { useEntitlement } from "@/lib/entitlement";
import { useI18n } from "@/i18n/client";
import { type Value, renderValue } from "@/components/billing/comparison-values";

const YES: Value = { kind: "yes" };
const NO: Value = { kind: "no" };
const CUSTOM: Value = { kind: "custom" };

export function PricingComparisonTable() {
  const { state } = useEntitlement();
  const { m } = useI18n();
  const c = m.pricing.comparison;

  const showUpgradeHint =
    state.kind === "ready" &&
    (state.entitlement.plan === "free" || state.entitlement.plan === "lite");

  const rows: Array<{
    label: string;
    free: Value;
    lite: Value;
    pro: Value;
    enterprise: Value;
  }> = [
    {
      label: c.rows.minutes,
      free: { kind: "text", text: `${BILLING_PLAN_MINUTES.free}` },
      lite: { kind: "text", text: `${BILLING_PLAN_MINUTES.lite}` },
      pro: { kind: "text", text: `${BILLING_PLAN_MINUTES.pro}` },
      enterprise: CUSTOM,
    },
    { label: c.rows.transcription, free: YES, lite: YES, pro: YES, enterprise: CUSTOM },
    { label: c.rows.dualAudio, free: NO, lite: NO, pro: YES, enterprise: CUSTOM },
    { label: c.rows.diarization, free: NO, lite: NO, pro: YES, enterprise: CUSTOM },
    { label: c.rows.tts, free: NO, lite: NO, pro: YES, enterprise: CUSTOM },
    { label: c.rows.protection, free: NO, lite: NO, pro: YES, enterprise: CUSTOM },
    {
      label: c.rows.retention,
      free: { kind: "text", text: m.common.days(BILLING_PLAN_HISTORY_DAYS.free) },
      lite: { kind: "text", text: m.common.days(BILLING_PLAN_HISTORY_DAYS.lite) },
      pro: { kind: "text", text: m.common.days(BILLING_PLAN_HISTORY_DAYS.pro) },
      enterprise: CUSTOM,
    },
    { label: c.rows.portal, free: NO, lite: YES, pro: YES, enterprise: CUSTOM },
    { label: c.rows.sso, free: NO, lite: NO, pro: NO, enterprise: YES },
    { label: c.rows.audit, free: NO, lite: NO, pro: NO, enterprise: YES },
    { label: c.rows.invoice, free: NO, lite: NO, pro: NO, enterprise: YES },
  ];

  const labels = { yes: c.yes, no: c.no, custom: c.customValue };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{c.title}</h2>
          <p className="measure mt-2 text-sm leading-6 text-muted">{c.lede}</p>
        </div>
        {showUpgradeHint ? (
          <Link href="/settings/billing" className="btn btn-secondary">
            {c.upgradeCta}
          </Link>
        ) : null}
      </div>

      <div className="scroll-x mt-6 border border-line bg-surface">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-raised">
              <th scope="col" className="eyebrow px-5 py-3">
                {c.feature}
              </th>
              {[m.plan.free, m.plan.lite, m.plan.pro, m.plan.enterprise].map((plan) => (
                <th
                  key={plan}
                  scope="col"
                  className={`px-5 py-3 text-center font-display text-xs font-semibold ${
                    plan === m.plan.pro ? "text-accent" : "text-muted"
                  }`}
                >
                  {plan}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-3.5 text-sm font-medium text-ink">
                  {row.label}
                </th>
                <td className="px-5 py-3.5 text-center">{renderValue(row.free, labels)}</td>
                <td className="px-5 py-3.5 text-center">{renderValue(row.lite, labels)}</td>
                <td className="bg-ai-soft/60 px-5 py-3.5 text-center">
                  {renderValue(row.pro, labels)}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {renderValue(row.enterprise, labels)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
