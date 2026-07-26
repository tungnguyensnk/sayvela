import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { UsageSummaryCard } from "@/components/dashboard/UsageSummaryCard";
import { RecentSessions } from "@/components/dashboard/RecentSessions";

export const metadata = { title: "Dashboard — Sayvela" };

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");

  return (
    <main className="relative flex-1">
      <LandingHeader />
      <div className="relative overflow-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="mb-8 flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white/90">Welcome back</h1>
            <p className="text-sm text-white/50">
              {(session as { user?: { email?: string } }).user?.email}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <UsageSummaryCard />

              <div className="glass-panel p-6 flex flex-col gap-4">
                <p className="text-xs text-white/50 uppercase tracking-wider">Quick Actions</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href="https://sayvela.com/download"
                    target="_blank"
                    rel="noreferrer"
                    className="glass-button flex items-center gap-2 justify-center py-3 text-sm"
                  >
                    ⬇️ Download desktop app
                  </a>
                  <Link href="/sessions" className="glass-button flex items-center gap-2 justify-center py-3 text-sm">
                    📋 View sessions
                  </Link>
                  <Link
                    href="/settings/billing"
                    className="glass-button flex items-center gap-2 justify-center py-3 text-sm"
                  >
                    ⚙️ Billing settings
                  </Link>
                  <Link href="/pricing" className="glass-button flex items-center gap-2 justify-center py-3 text-sm">
                    🚀 Upgrade plan
                  </Link>
                </div>
              </div>
            </div>

            <RecentSessions />
          </div>
        </section>
      </div>
    </main>
  );
}
