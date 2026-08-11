import { AppShell } from "@/components/layout/AppShell";
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
    <AppShell width="narrow">
      <BillingSuccessGate />
    </AppShell>
  );
}
