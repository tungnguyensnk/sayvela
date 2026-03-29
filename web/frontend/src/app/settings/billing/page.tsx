import { LandingHeader } from "@/components/landing/LandingHeader";
import { BillingSettingsDashboard } from "@/components/billing/BillingSettingsDashboard";
import { requireAuth } from "@/lib/auth-guard";

export default async function BillingSettingsPage() {
  await requireAuth("/settings/billing");

  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <BillingSettingsDashboard />
        </section>
      </div>
    </main>
  );
}
