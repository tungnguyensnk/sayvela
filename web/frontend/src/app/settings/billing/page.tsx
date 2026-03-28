import { LandingHeader } from "@/components/landing/LandingHeader";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";

export default function BillingSettingsPage() {
  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="glass-panel p-10">
            <div className="section-eyebrow">Billing</div>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Quản lý gói subscription
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              Mở Stripe customer portal để đổi gói, cập nhật phương thức thanh toán hoặc hủy.
            </p>
            <div className="mt-8 max-w-sm">
              <ManageBillingButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

