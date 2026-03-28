import Link from "next/link";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";
import { AuthActions } from "@/components/landing/AuthActions";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/48 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center leading-none">
          <SayvelaBrand size="sm" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-white/68 lg:flex">
          <a href="#features" className="nav-link">
            Tính năng
          </a>
          <a href="#workflow" className="nav-link">
            Cách hoạt động
          </a>
          <a href="#use-cases" className="nav-link">
            Use cases
          </a>
          <a href="#faq" className="nav-link">
            FAQ
          </a>
        </nav>

        <AuthActions />
      </div>
    </header>
  );
}
