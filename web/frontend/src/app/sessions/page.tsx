import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/primitives";
import { SessionList } from "@/components/sessions/SessionList";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return { title: m.meta.sessions };
}

export default async function SessionsPage() {
  await requireAuth("/sessions");
  const { m } = await getServerI18n();

  return (
    <AppShell>
      <PageHeader
        eyebrow={m.sessions.eyebrow}
        title={m.sessions.title}
        description={m.sessions.lede}
      />
      <div className="mt-8">
        <SessionList />
      </div>
    </AppShell>
  );
}
