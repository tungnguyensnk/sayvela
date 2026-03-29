"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getPublicApiUrl } from "@/lib/api";

type Props = {
  className?: string;
  label?: string;
};

export function ManageBillingButton({
  className,
  label = "Quản lý",
}: Props) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = useMemo(() => {
    const value = (session as unknown as { accessToken?: string } | null)?.accessToken;
    return value ?? null;
  }, [session]);

  async function handleClick() {
    setError(null);

    if (!accessToken || status !== "authenticated") {
      window.location.href = "/auth?mode=login";
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getPublicApiUrl("/api/backend/billing/portal"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        setError(message || "Không thể mở trang quản lý billing.");
        return;
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data.url) {
        setError("Thiếu URL portal.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Có lỗi xảy ra khi kết nối tới server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        className={className ?? "glass-button w-full"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "Đang mở portal..." : label}
      </button>
      {error ? <div className="mt-3 text-sm text-rose-200/90">{error}</div> : null}
    </div>
  );
}

