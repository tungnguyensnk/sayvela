import { LandingHeader } from "@/components/landing/LandingHeader";
import { BillingSuccessGate } from "@/components/billing/BillingSuccessGate";
import { buildPathWithQuery, requireAuth } from "@/lib/auth-guard";

interface BillingSuccessPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
  const params = searchParams ? await searchParams : {};
  const callbackUrl = buildPathWithQuery("/billing/success", params);
  await requireAuth(callbackUrl);

  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="glass-panel p-10">
            <BillingSuccessGate />
          </div>
        </section>
      </div>
    </main>
  );
}
