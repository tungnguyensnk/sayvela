import { requireAuth } from "@/lib/auth-guard";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SessionList } from "@/components/sessions/SessionList";

export const metadata = { title: "Sessions — Sayvela" };

export default async function SessionsPage() {
  await requireAuth("/sessions");

  return (
    <main className="relative flex-1">
      <LandingHeader />
      <div className="relative overflow-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:px-8 lg:pt-20">
          <div className="mb-8 flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white/90">Sessions</h1>
            <p className="text-sm text-white/50">
              Your transcription session history synced from the desktop app.
            </p>
          </div>
          <SessionList />
        </section>
      </div>
    </main>
  );
}
