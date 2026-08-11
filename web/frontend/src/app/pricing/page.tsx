import type { Metadata } from "next";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { LandingFooter } from "@/components/landing/sections/LandingFooter";
import { PricingCards } from "@/components/billing/PricingCards";
import { PricingComparisonTable } from "@/components/billing/PricingComparisonTable";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return {
    title: m.meta.pricing.title,
    description: m.meta.pricing.description,
  };
}

export default async function PricingPage() {
  const { m } = await getServerI18n();

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="rail-row">
              <div className="rail-label">{m.pricing.eyebrow}</div>
              <div>
                <h1 className="max-w-2xl text-3xl sm:text-4xl">{m.pricing.title}</h1>
                <p className="measure mt-4 text-base leading-7 text-muted">
                  {m.pricing.lede}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-line py-12 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <PricingCards />
          </div>
        </section>

        <section className="border-b border-line py-12 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <PricingComparisonTable />
          </div>
        </section>
      </main>

      <LandingFooter m={m} />
    </>
  );
}
