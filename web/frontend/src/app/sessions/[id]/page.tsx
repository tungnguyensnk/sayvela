import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/AppShell";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return { title: m.meta.sessionDetail };
}

type Props = { params: Promise<{ id: string }> };

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  await requireAuth(`/sessions/${id}`);
  const { m } = await getServerI18n();

  return (
    <AppShell width="narrow">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 font-display text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon width={15} height={15} />
        {m.sessions.backToList}
      </Link>
      <div className="mt-6">
        <SessionDetail id={id} />
      </div>
    </AppShell>
  );
}
