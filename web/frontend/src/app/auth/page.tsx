import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
import { MicIcon, ShieldIcon, UsersIcon } from "@/components/ui/icons";
import { authOptions } from "@/lib/auth";
import { normalizeAuthMode } from "@/lib/auth-validation";
import { getServerI18n } from "@/i18n/server";

const POINT_ICONS = [MicIcon, UsersIcon, ShieldIcon];

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();

  return {
    title: m.meta.auth.title,
    description: m.meta.auth.description,
    alternates: { canonical: "/auth" },
    robots: { index: false, follow: true },
  };
}

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const session = await getServerSession(authOptions);
  const { m } = await getServerI18n();

  const params = searchParams ? await searchParams : {};
  const mode = normalizeAuthMode(
    Array.isArray(params.mode) ? params.mode[0] : params.mode,
  );
  const callbackUrl = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const desktop = params.desktop === "1" || params.desktop === "true";
  const desktopCode = Array.isArray(params.code) ? params.code[0] : (params.code ?? "");

  if (session) {
    if (desktop) {
      redirect(`/auth/desktop-callback?code=${encodeURIComponent(desktopCode)}`);
    }
    const safe = callbackUrl?.trim();
    const destination = safe && !safe.startsWith("/auth") ? safe : "/";
    redirect(destination);
  }

  const side = m.auth.side;

  return (
    <main className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <section className="hidden border-r border-line bg-surface lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
        <Link href="/">
          <SayvelaBrand />
        </Link>

        <div>
          <h2 className="max-w-md text-3xl">{side.title}</h2>
          <ul className="mt-8 flex max-w-md flex-col gap-4">
            {side.points.map((point, index) => {
              const Glyph = POINT_ICONS[index] ?? MicIcon;
              return (
                <li key={point.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-raised text-accent">
                    <Glyph width={16} height={16} />
                  </span>
                  <span>
                    <span className="block font-display text-sm font-semibold">
                      {point.title}
                    </span>
                    <span className="block text-sm leading-6 text-muted">
                      {point.body}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="tabular text-xs text-faint">{side.strip}</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Link href="/" className="lg:hidden">
            <SayvelaBrand />
          </Link>
          <AuthForm
            initialMode={mode}
            callbackUrl={callbackUrl}
            desktop={desktop}
            desktopCode={desktopCode}
          />
        </div>
      </section>
    </main>
  );
}
