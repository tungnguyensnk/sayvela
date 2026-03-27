import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
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
    <main className="relative flex min-h-screen flex-1 items-center overflow-hidden px-6 py-10 sm:px-8">
      <div className="page-glow page-glow-top" />
      <div className="page-glow page-glow-bottom" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="glass-panel hidden flex-col justify-between p-8 lg:flex lg:p-10">
          <div>
            <SayvelaBrand size="sm" priority className="mb-6" />
            <div className="glass-chip w-fit">Secure access</div>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white">
              Sayvela kết nối transcript, translation và privacy trong một workflow gọn gàng.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/70">
              Đăng ký để quản lý phiên làm việc đa ngôn ngữ chuyên nghiệp hơn với
              luồng đăng nhập an toàn, password hashing và trải nghiệm glass nhất quán.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="glass-panel-muted p-5">
              <div className="text-sm font-medium text-white/76">
                Real-time translation
              </div>
              <div className="mt-2 text-sm leading-7 text-white/64">
                Theo dõi transcript, bản dịch và người nói theo thời gian thực trong cùng một không gian làm việc.
              </div>
            </div>
            <div className="glass-panel-muted p-5">
              <div className="text-sm font-medium text-white/76">
                Privacy-ready
              </div>
              <div className="mt-2 text-sm leading-7 text-white/64">
                Content protection, session management và xác thực an toàn giúp giảm rủi ro cho nội dung nhạy cảm.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm text-white/56">
            <Link href="/" className="nav-link">
              ← Quay về landing page
            </Link>
            <div>Works best on desktop, tablet và mobile</div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <AuthForm initialMode={mode} />
        </section>
      </div>
    </main>
  );
}
