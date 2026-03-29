"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublicApiUrl } from "@/lib/api";
import { BillingSuccessRedirect } from "@/components/billing/BillingSuccessRedirect";

type ViewState = "missing" | "verifying" | "paid" | "unpaid" | "invalid";

export function BillingSuccessGate({ accessToken }: { accessToken: string }) {
  const searchParams = useSearchParams();
  const [viewState, setViewState] = useState<ViewState>("verifying");
  const [canRetry, setCanRetry] = useState(false);
  const inflight = useRef(false);

  const sessionId = useMemo(() => {
    const raw = searchParams.get("session_id");
    return raw?.trim() ? raw.trim() : null;
  }, [searchParams]);

  const verify = useCallback(async () => {
    if (!sessionId || !accessToken || inflight.current) return;
    inflight.current = true;
    setCanRetry(false);
    setViewState("verifying");

    try {
      const res = await fetch(
        getPublicApiUrl(
          `/api/backend/billing/checkout-session/verify?session_id=${encodeURIComponent(sessionId)}`,
        ),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
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
  }, [accessToken, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setViewState("missing");
      return;
    }
    if (!accessToken) {
      setViewState("invalid");
      setCanRetry(false);
      return;
    }

    void verify();
  }, [accessToken, sessionId, verify]);

  if (viewState === "missing") {
    return (
      <>
        <div className="section-eyebrow">Link không hợp lệ</div>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Thiếu session_id</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          Không tìm thấy thông tin phiên thanh toán. Vui lòng quay lại trang Pricing để thực hiện
          thanh toán.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/pricing" className="primary-button">
            Quay lại Pricing
          </Link>
          <Link href="/settings/billing" className="glass-button">
            Tới Billing
          </Link>
        </div>
      </>
    );
  }

  if (viewState === "verifying") {
    return (
      <>
        <div className="section-eyebrow">Đang xác minh</div>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Đang kiểm tra thanh toán…
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          Hệ thống đang xác thực phiên thanh toán từ Stripe và đồng bộ subscription cho tài khoản.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/settings/billing" className="glass-button">
            Tới Billing
          </Link>
        </div>
      </>
    );
  }

  if (viewState === "paid") {
    return (
      <>
        <div className="section-eyebrow">Xong rồi — thanh toán đã được ghi nhận</div>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Gói của bạn đã sẵn sàng</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          Bạn sẽ được tự động chuyển về Billing sau <BillingSuccessRedirect /> giây.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/settings/billing" className="primary-button">
            Đi tới Billing
          </Link>
          <Link href="/" className="glass-button">
            Về trang chủ
          </Link>
        </div>
      </>
    );
  }

  const title =
    viewState === "unpaid" ? "Thanh toán chưa hoàn tất" : "Không thể xác thực phiên thanh toán";
  const description =
    viewState === "unpaid"
      ? "Phiên thanh toán này chưa ở trạng thái paid. Nếu bạn vừa thanh toán, hãy thử lại sau vài giây."
      : "Link này không hợp lệ hoặc không thuộc về tài khoản hiện tại. Vui lòng quay lại Pricing để tạo phiên thanh toán mới.";

  return (
    <>
      <div className="section-eyebrow">{viewState === "unpaid" ? "Chưa hoàn tất" : "Không hợp lệ"}</div>
      <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">{description}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        {canRetry ? (
          <button type="button" className="primary-button" onClick={verify}>
            Thử lại
          </button>
        ) : null}
        <Link href="/pricing" className="glass-button">
          Quay lại Pricing
        </Link>
        <Link href="/settings/billing" className="glass-button">
          Tới Billing
        </Link>
      </div>
    </>
  );
}
