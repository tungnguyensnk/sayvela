import { requireAuth } from "@/lib/auth-guard";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import Link from "next/link";

export const metadata = { title: "Session Detail — Sayvela" };

type Props = { params: Promise<{ id: string }> };

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  await requireAuth(`/sessions/${id}`);

  return (
    <main className="relative flex-1">
      <LandingHeader />
      <div className="relative overflow-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />
        <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <Link
            href="/sessions"
            className="mb-6 inline-flex items-center gap-1 text-sm text-white/45 hover:text-white/70 transition-colors"
          >
            ← All sessions
          </Link>
          <SessionDetail id={id} />
        </section>
      </div>
    </main>
  );
}
