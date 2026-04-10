"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type Props = {
  plan: "lite" | "pro";
  interval?: "month" | "year";
  className?: string;
  label?: string;
};

export function CheckoutButton({
  plan,
  interval = "month",
  className,
  label = plan === "pro" ? "Nâng cấp Pro" : "Nâng cấp Lite",
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
      const res = await fetch("/api/proxy/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        setError(message || "Không thể tạo phiên thanh toán.");
        return;
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data.url) {
        setError("Thiếu URL thanh toán.");
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
        className={className ?? "primary-button w-full"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "Đang chuyển tới thanh toán..." : label}
      </button>
      {error ? <div className="mt-3 text-sm text-rose-200/90">{error}</div> : null}
    </div>
  );
}
