import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { authOptions } from "@/lib/auth";
import { normalizeAuthMode } from "@/lib/auth-validation";

export const metadata: Metadata = {
  title: "Đăng nhập hoặc đăng ký | Sayvela",
  description:
    "Tạo tài khoản hoặc đăng nhập Sayvela để bắt đầu sử dụng voice translation, transcription và workflow đa ngôn ngữ an toàn.",
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

  if (session) {
    redirect("/");
  }

  const params = searchParams ? await searchParams : {};
  const mode = normalizeAuthMode(
    Array.isArray(params.mode) ? params.mode[0] : params.mode,
  );

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-10 sm:px-8">
      <div className="page-glow page-glow-top" />
      <div className="page-glow page-glow-bottom" />

      <div className="mx-auto flex w-full max-w-6xl justify-center">
        <section className="flex items-center justify-center">
          <AuthForm initialMode={mode} />
        </section>
      </div>
    </main>
  );
}
