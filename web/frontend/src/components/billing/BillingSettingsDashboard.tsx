"use client";

import { useState } from "react";
import Link from "next/link";
import { useEntitlement } from "@/lib/entitlement";
import { useI18n } from "@/i18n/client";
import {
  BILLING_PLAN_FEATURES,
  BILLING_PLAN_HISTORY_DAYS,
  BILLING_PLAN_MINUTES,
  type BillingFeatures,
  type BillingInterval,
  type BillingPlan,
} from "@/lib/billing-catalog";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { IntervalToggle } from "@/components/billing/IntervalToggle";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { Meter, PageHeader, Skeleton } from "@/components/ui/primitives";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import { formatLongDate } from "@/lib/format";
import type { Messages } from "@/i18n/messages";

function FeatureLine({ enabled, children }: { enabled: boolean; children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {enabled ? (
        <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-ok" />
      ) : (
        <MinusIcon width={16} height={16} className="mt-0.5 shrink-0 text-faint" />
      )}
      <span className={enabled ? "text-muted" : "text-faint"}>{children}</span>
    </li>
  );
}

function PlanFeatures({ plan, m }: { plan: BillingPlan; m: Messages }) {
  const features = BILLING_PLAN_FEATURES[plan];
  const keys = Object.keys(features) as (keyof BillingFeatures)[];
  const enabled = keys.filter((key) => features[key]);
  const disabled = keys.filter((key) => !features[key]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-display text-sm font-semibold">{m.billing.includedTitle}</h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          <FeatureLine enabled>{m.billing.baseFeature}</FeatureLine>
          <FeatureLine enabled>
            {m.billing.summaryRetention(BILLING_PLAN_HISTORY_DAYS[plan])}
          </FeatureLine>
          {enabled.map((key) => (
            <FeatureLine key={key} enabled>
              {m.billing.features[key]}
            </FeatureLine>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-sm font-semibold">{m.billing.excludedTitle}</h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {disabled.length === 0 ? (
            <FeatureLine enabled>{m.billing.allUnlocked}</FeatureLine>
          ) : (
            disabled.map((key) => (
              <FeatureLine key={key} enabled={false}>
                {m.billing.features[key]}
              </FeatureLine>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function UpgradeCard({
  currentPlan,
  interval,
  onIntervalChange,
  m,
}: {
  currentPlan: BillingPlan;
  interval: BillingInterval;
  onIntervalChange: (value: BillingInterval) => void;
  m: Messages;
}) {
  const targetPlan = currentPlan === "free" ? "lite" : "pro";
  const title = targetPlan === "lite" ? m.billing.upgrade.toLite : m.billing.upgrade.toPro;
  const lede = targetPlan === "lite" ? m.billing.upgrade.liteLede : m.billing.upgrade.proLede;
  const minutes = BILLING_PLAN_MINUTES[targetPlan];
  const historyDays = BILLING_PLAN_HISTORY_DAYS[targetPlan];

  const perks =
    targetPlan === "pro"
      ? [
          m.billing.summaryMinutes(minutes),
          m.billing.summaryRetention(historyDays),
          m.billing.features.dualAudio,
          m.billing.features.speakerDiarization,
          m.billing.features.micTranslationTts,
        ]
      : [m.billing.summaryMinutes(minutes), m.billing.summaryRetention(historyDays)];

  return (
    <section className="card border-accent-line p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="measure mt-2 text-sm leading-6 text-muted">{lede}</p>
        </div>
        <IntervalToggle interval={interval} onChange={onIntervalChange} />
      </div>

      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {perks.map((perk) => (
          <FeatureLine key={perk} enabled>
            {perk}
          </FeatureLine>
        ))}
      </ul>

      {currentPlan === "lite" ? (
        <p className="mt-5 border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok">
          {m.billing.upgrade.keepMinutes}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <CheckoutButton plan={targetPlan} interval={interval} />
        <Link href="/pricing" className="btn btn-secondary btn-block">
          {m.billing.upgrade.viewPricing}
        </Link>
      </div>
    </section>
  );
}

export function BillingSettingsDashboard() {
  const { state } = useEntitlement();
  const { locale, m } = useI18n();
  const [interval, setInterval] = useState<BillingInterval>("month");

  if (state.kind === "unauthenticated") {
    return null;
  }

  if (state.kind === "loading") {
    return (
      <>
        <PageHeader eyebrow={m.billing.eyebrow} title={m.billing.manageTitle} />
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-52" />
        </div>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        <PageHeader eyebrow={m.billing.eyebrow} title={m.billing.manageTitle} />
        <div className="card mt-8 flex flex-col items-start gap-4 p-6">
          <p role="alert" className="text-sm text-crit">
            {m.billing.entitlementError}
          </p>
          <div className="w-full max-w-xs">
            <ManageBillingButton />
          </div>
        </div>
      </>
    );
  }

  const e = state.entitlement;
  const planLabel = m.plan[e.plan];
  const resetAt = formatLongDate(e.cycleEndsAt, locale);

  return (
    <>
      <PageHeader
        eyebrow={m.billing.eyebrow}
        title={m.billing.currentPlan(planLabel)}
        description={resetAt ? m.billing.resetOn(resetAt) : m.billing.resetGeneric}
        actions={
          <>
            <span className="chip chip-accent self-center">{m.plan.current}</span>
            {e.plan !== "free" ? <ManageBillingButton /> : null}
            <Link href="/pricing" className="btn btn-secondary">
              {m.billing.pricingLink}
            </Link>
          </>
        }
      />

      <div className="mt-8 flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold">
                {m.billing.quotaTitle}
              </h2>
              <span className="chip">{m.billing.quotaRemaining(e.minutesRemaining)}</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold tabular-nums">
                {e.minutesUsed}
              </span>
              <span className="text-sm text-muted tabular-nums">
                {m.billing.quotaUsed(e.minutesPerMonth)}
              </span>
            </div>

            <Meter
              className="mt-4"
              value={e.usagePercentage}
              label={m.plan.usageTitle(e.usagePercentage)}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="tabular">{m.billing.quotaPercent(e.usagePercentage)}</span>
              {resetAt ? <span>{m.billing.resetShort(resetAt)}</span> : null}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-sm font-semibold">
              {m.billing.summaryTitle}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <FeatureLine enabled>
                {m.billing.summaryMinutes(BILLING_PLAN_MINUTES[e.plan])}
              </FeatureLine>
              <FeatureLine enabled>
                {m.billing.summaryRetention(BILLING_PLAN_HISTORY_DAYS[e.plan])}
              </FeatureLine>
              <FeatureLine enabled>{m.billing.summaryStripe}</FeatureLine>
            </ul>
          </section>
        </div>

        <PlanFeatures plan={e.plan} m={m} />

        {e.plan === "free" || e.plan === "lite" ? (
          <UpgradeCard
            currentPlan={e.plan}
            interval={interval}
            onIntervalChange={setInterval}
            m={m}
          />
        ) : null}
      </div>
    </>
  );
}
