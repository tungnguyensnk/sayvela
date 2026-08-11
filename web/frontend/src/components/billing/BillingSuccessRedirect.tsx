"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Đếm ngược rồi chuyển trang. Câu chữ do phía gọi quyết định qua `render`,
 * để mỗi ngôn ngữ đặt con số vào đúng chỗ trong câu.
 */
export function BillingSuccessRedirect({
  delayMs = 5000,
  render,
}: {
  delayMs?: number;
  render?: (secondsLeft: number) => ReactNode;
}) {
  const { replace } = useRouter();
  const endAtRef = useRef<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil(delayMs / 1000)),
  );

  useEffect(() => {
    endAtRef.current = Date.now() + delayMs;
    const redirectTimeout = window.setTimeout(() => {
      replace("/settings/billing");
    }, delayMs);

    const tickInterval = window.setInterval(() => {
      const endAt = endAtRef.current ?? Date.now();
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    }, 250);

    return () => {
      window.clearTimeout(redirectTimeout);
      window.clearInterval(tickInterval);
    };
  }, [delayMs, replace]);

  return (
    <span aria-live="polite" aria-atomic="true">
      {render ? render(secondsLeft) : secondsLeft}
    </span>
  );
}
