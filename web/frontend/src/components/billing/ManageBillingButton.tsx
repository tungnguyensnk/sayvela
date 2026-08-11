"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/auth-fetch";
import { useI18n } from "@/i18n/client";

type Props = {
  className?: string;
  label?: string;
};

export function ManageBillingButton({ className, label }: Props) {
  const { status } = useSession();
  const { m } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = label ?? m.common.manage;

  async function handleClick() {
    setError(null);

    if (status !== "authenticated") {
      window.location.href = "/auth?mode=login";
      return;
    }

    setIsLoading(true);
    try {
      const res = await authFetch("/api/proxy/billing/portal", { method: "POST" });

      if (!res.ok) {
        setError(m.billing.portal.failed);
        return;
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data.url) {
        setError(m.billing.portal.missingUrl);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(m.billing.portal.network);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        className={className ?? "btn btn-secondary btn-block"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? m.billing.portal.opening : text}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-crit">
          {error}
        </p>
      ) : null}
    </div>
  );
}
