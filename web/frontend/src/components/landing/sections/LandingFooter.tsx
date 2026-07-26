import Link from "next/link";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 text-sm text-white/64 sm:px-8 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <SayvelaBrand size="sm" />
          <p className="mt-3 max-w-xl leading-7">
            Real-time voice translation and transcription for multilingual teams, built for speed, clarity, and privacy.
          </p>
        </div>

        <div className="grid gap-3 md:justify-items-end">
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#workflow" className="nav-link">
            Workflow
          </a>
          <a href="#faq" className="nav-link">
            FAQ
          </a>
          <Link href="/auth?mode=register" className="nav-link">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}
