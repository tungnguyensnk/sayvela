import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSettingsDashboard } from "@/components/billing/BillingSettingsDashboard";
import { requireAuth } from "@/lib/auth-guard";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return { title: m.meta.billing };
}

export default async function BillingSettingsPage() {
  await requireAuth("/settings/billing");

  return (
    <AppShell>
      <BillingSettingsDashboard />
    </AppShell>
  );
}
