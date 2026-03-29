"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function BillingSuccessRedirect({ delayMs = 5000 }: { delayMs?: number }) {
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
      {secondsLeft}
    </span>
  );
}
