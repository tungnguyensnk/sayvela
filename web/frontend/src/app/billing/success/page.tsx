import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function BillingSuccessPage() {
  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="glass-panel p-10">
            <div className="section-eyebrow">Thanh toán thành công</div>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Subscription đang được kích hoạt
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              Stripe đã xác nhận thanh toán. Hệ thống sẽ đồng bộ subscription qua webhook
              và mở khóa entitlement cho tài khoản của bạn.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/settings/billing" className="primary-button">
                Đi tới Billing
              </Link>
              <Link href="/" className="glass-button">
                Về trang chủ
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
