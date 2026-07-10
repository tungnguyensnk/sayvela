"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/auth-fetch";

type Props = {
  className?: string;
  label?: string;
};

export function ManageBillingButton({
  className,
  label = "Quản lý",
}: Props) {
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
