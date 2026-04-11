"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function DesktopCallbackView() {
  const searchParams = useSearchParams();
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
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15">
          <svg className="h-8 w-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="section-eyebrow mb-3">Đăng nhập thành công</div>
        <h1 className="mb-3 text-2xl font-semibold text-white">Quay lại Sayvela</h1>
        {status === "sent" ? (
          <p className="text-sm leading-6 text-white/60">Bạn có thể đóng tab này.</p>
        ) : status === "error" ? (
          <div className="text-sm leading-6 text-white/60">
            <div className="mt-5">
              <button type="button" className="primary-button w-full justify-center" onClick={sendToken}>
                Thử lại
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-white/60">
            Đang gửi thông tin đăng nhập tới ứng dụng…
          </p>
        )}
      </div>
    );
  }

  // no code — show error
  return (
    <div className="glass-panel w-full max-w-md p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-rose-400/30 bg-rose-400/15">
        <svg className="h-8 w-8 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="mb-3 text-2xl font-semibold text-white">Phiên không hợp lệ</h1>
      <p className="mb-6 text-sm text-white/60">
        Hãy thử đăng nhập lại từ ứng dụng Sayvela.
      </p>
      <a href="/auth?desktop=1" className="primary-button inline-flex w-full justify-center">
        Đăng nhập lại
      </a>
    </div>
  );
}
