import { LandingHeader } from "@/components/landing/LandingHeader";
import { PricingCards } from "@/components/billing/PricingCards";
import { PricingComparisonTable } from "@/components/billing/PricingComparisonTable";

export default function PricingPage() {
  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="glass-panel p-10">
            <div className="section-eyebrow">Pricing</div>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Chọn gói phù hợp với nhịp làm việc của bạn
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
              Bạn có thể bắt đầu miễn phí, nâng cấp Pro khi cần dual audio, TTS và
              workflow đầy đủ. Enterprise dành cho tổ chức có yêu cầu bảo mật và
              procurement riêng.
            </p>
            <PricingCards />
            <PricingComparisonTable />
          </div>
        </section>
      </div>
    </main>
  );
}
