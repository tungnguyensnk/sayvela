import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/primitives";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { DownloadIcon } from "@/components/ui/icons";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return { title: m.meta.dashboard };
}

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const { m } = await getServerI18n();
  const email = (session as { user?: { email?: string } }).user?.email;

  return (
    <AppShell>
      <PageHeader
        eyebrow={m.dashboard.eyebrow}
        title={m.dashboard.title}
        description={email}
        actions={
          <a
            href="https://sayvela.com/download"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            <DownloadIcon width={16} height={16} />
            {m.dashboard.download}
          </a>
        }
      />

      <div className="mt-8 flex flex-col gap-6">
        <DashboardStats />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <RecentSessions />
          <QuickActions />
        </div>
      </div>
    </AppShell>
  );
}
