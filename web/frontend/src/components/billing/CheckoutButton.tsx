"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/auth-fetch";
import { useI18n } from "@/i18n/client";

type Props = {
  plan: "lite" | "pro";
  interval?: "month" | "year";
  className?: string;
  label?: string;
};

export function CheckoutButton({ plan, interval = "month", className, label }: Props) {
  const { status } = useSession();
  const { m } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = label ?? m.billing.checkout.upgradeTo(m.plan[plan]);

  async function handleClick() {
    setError(null);

    if (status !== "authenticated") {
      window.location.href = "/auth?mode=login";
      return;
    }

    setIsLoading(true);
    try {
      const res = await authFetch("/api/proxy/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      if (!res.ok) {
        setError(m.billing.checkout.failed);
        return;
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data.url) {
        setError(m.billing.checkout.missingUrl);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(m.billing.checkout.network);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        className={className ?? "btn btn-primary btn-block"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? m.billing.checkout.redirecting : text}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-crit">
          {error}
        </p>
      ) : null}
    </div>
  );
}
