import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { authOptions } from "@/lib/auth";
import { normalizeAuthMode } from "@/lib/auth-validation";

export const metadata: Metadata = {
  title: "Sign in or sign up | Sayvela",
  description:
    "Create an account or sign in to Sayvela to start using secure voice translation, transcription, and multilingual workflows.",
  alternates: {
    canonical: "/auth",
  },
  robots: {
    index: false,
    follow: true,
  },
};

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const session = await getServerSession(authOptions);

  const params = searchParams ? await searchParams : {};
  const mode = normalizeAuthMode(
    Array.isArray(params.mode) ? params.mode[0] : params.mode,
  );
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const desktop = params.desktop === "1" || params.desktop === "true";
  const desktopCode = Array.isArray(params.code) ? params.code[0] : (params.code ?? "");

  if (session) {
    if (desktop) {
      // if already logged in with a code, go straight to desktop-callback
      redirect(`/auth/desktop-callback?code=${encodeURIComponent(desktopCode)}`);
    }
    const safe = callbackUrl?.trim();
    const destination = safe && !safe.startsWith("/auth") ? safe : "/";
    redirect(destination);
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-10 sm:px-8">
      <div className="page-glow page-glow-top" />
      <div className="page-glow page-glow-bottom" />

      <div className="mx-auto flex w-full max-w-6xl justify-center">
        <section className="flex items-center justify-center">
          <AuthForm initialMode={mode} callbackUrl={callbackUrl} desktop={desktop} desktopCode={desktopCode} />
        </section>
      </div>
    </main>
  );
}
