"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { BillingSuccessRedirect } from "@/components/billing/BillingSuccessRedirect";
import { useI18n } from "@/i18n/client";
import { AlertIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";

type ViewState = "missing" | "verifying" | "paid" | "unpaid" | "invalid";
type Tone = "ok" | "warn" | "crit" | "pending";

const TONE: Record<Tone, { ring: string; icon: ReactNode }> = {
  ok: { ring: "border-ok/30 bg-ok-soft text-ok", icon: <CheckIcon width={22} height={22} /> },
  warn: {
    ring: "border-warn/30 bg-warn-soft text-warn",
    icon: <AlertIcon width={22} height={22} />,
  },
  crit: {
    ring: "border-crit/30 bg-crit-soft text-crit",
    icon: <AlertIcon width={22} height={22} />,
  },
  pending: {
    ring: "border-line bg-raised text-muted",
    icon: <ClockIcon width={22} height={22} />,
  },
};

function StatusPanel({
  tone,
  eyebrow,
  title,
  description,
  actions,
}: {
  tone: Tone;
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="card p-8 sm:p-10">
      <span
        className={`flex h-12 w-12 items-center justify-center border ${TONE[tone].ring}`}
      >
        {TONE[tone].icon}
      </span>
      <div className="eyebrow mt-5">{eyebrow}</div>
      <h1 className="mt-3 text-2xl sm:text-3xl">{title}</h1>
      <p className="measure mt-3 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}

export function BillingSuccessGate() {
  const searchParams = useSearchParams();
  const { m } = useI18n();
  const s = m.billing.success;
  const [viewState, setViewState] = useState<ViewState>("verifying");
  const [canRetry, setCanRetry] = useState(false);
  const inflight = useRef(false);

  const sessionId = useMemo(() => {
    const raw = searchParams.get("session_id");
    return raw?.trim() ? raw.trim() : null;
  }, [searchParams]);

  const verify = useCallback(async () => {
    if (!sessionId || inflight.current) return;
    inflight.current = true;
    setCanRetry(false);
    setViewState("verifying");

    try {
      const res = await fetch(
        `/api/proxy/billing/checkout-session/verify?session_id=${encodeURIComponent(sessionId)}`,
        { method: "GET" },
      );

      if (res.ok) {
        setViewState("paid");
        return;
      }

      if (res.status === 409) {
        setViewState("unpaid");
        setCanRetry(true);
        return;
      }

      setViewState("invalid");
      setCanRetry(true);
    } catch {
      setViewState("invalid");
      setCanRetry(true);
    } finally {
      inflight.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setViewState("missing");
      return;
    }

    void verify();
  }, [sessionId, verify]);

  if (viewState === "missing") {
    return (
      <StatusPanel
        tone="crit"
        eyebrow={s.missingEyebrow}
        title={s.missingTitle}
        description={s.missingBody}
        actions={
          <>
            <Link href="/pricing" className="btn btn-primary">
              {s.backToPricing}
            </Link>
            <Link href="/settings/billing" className="btn btn-secondary">
              {s.goBilling}
            </Link>
          </>
        }
      />
    );
  }

  if (viewState === "verifying") {
    return (
      <StatusPanel
        tone="pending"
        eyebrow={s.verifyingEyebrow}
        title={s.verifyingTitle}
        description={s.verifyingBody}
        actions={
          <Link href="/settings/billing" className="btn btn-secondary">
            {s.goBilling}
          </Link>
        }
      />
    );
  }

  if (viewState === "paid") {
    return (
      <StatusPanel
        tone="ok"
        eyebrow={s.paidEyebrow}
        title={s.paidTitle}
        description={<BillingSuccessRedirect render={(seconds) => s.paidBody(seconds)} />}
        actions={
          <>
            <Link href="/settings/billing" className="btn btn-primary">
              {s.goBilling}
            </Link>
            <Link href="/" className="btn btn-secondary">
              {s.goHome}
            </Link>
          </>
        }
      />
    );
  }

  const unpaid = viewState === "unpaid";

  return (
    <StatusPanel
      tone={unpaid ? "warn" : "crit"}
      eyebrow={unpaid ? s.unpaidEyebrow : s.invalidEyebrow}
      title={unpaid ? s.unpaidTitle : s.invalidTitle}
      description={unpaid ? s.unpaidBody : s.invalidBody}
      actions={
        <>
          {canRetry ? (
            <button type="button" className="btn btn-primary" onClick={verify}>
              {m.common.retry}
            </button>
          ) : null}
          <Link href="/pricing" className="btn btn-secondary">
            {s.backToPricing}
          </Link>
          <Link href="/settings/billing" className="btn btn-ghost">
            {s.goBilling}
          </Link>
        </>
      }
    />
  );
}
