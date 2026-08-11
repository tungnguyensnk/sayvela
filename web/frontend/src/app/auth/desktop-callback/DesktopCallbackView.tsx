"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

export function DesktopCallbackView() {
  const searchParams = useSearchParams();
  const { m } = useI18n();
  const t = m.auth.callback;
  const code = searchParams.get("code");

  const [status, setStatus] = useState("idle");

  const sendToken = useCallback(async () => {
    if (!code) return;
    setStatus("sending");

    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const res = await fetch("/api/proxy/auth/pending-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (res.ok) {
          setStatus("sent");
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }

    setStatus("error");
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const timeoutId = window.setTimeout(() => {
      void sendToken();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [code, sendToken]);

  if (code) {
    return (
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-ok/30 bg-ok-soft text-ok">
          <CheckIcon width={22} height={22} />
        </div>
        <div className="eyebrow">{t.successEyebrow}</div>
        <h1 className="mt-3 text-2xl">{t.successTitle}</h1>
        {status === "sent" ? (
          <p className="mt-3 text-sm leading-6 text-muted">{t.sent}</p>
        ) : status === "error" ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">{t.failed}</p>
            <button
              type="button"
              className="btn btn-primary btn-block mt-5"
              onClick={sendToken}
            >
              {m.common.retry}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">{t.sending}</p>
        )}
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md p-8 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-crit/30 bg-crit-soft text-crit">
        <CloseIcon width={22} height={22} />
      </div>
      <h1 className="text-2xl">{t.invalidTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{t.invalidBody}</p>
      <a href="/auth?desktop=1" className="btn btn-primary btn-block mt-5">
        {t.signInAgain}
      </a>
    </div>
  );
}
