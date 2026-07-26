import Link from "next/link";
import type { LandingTrustStat } from "@/components/landing/landing-content";

export function HeroSection({ trustStats }: { trustStats: LandingTrustStat[] }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-12 pt-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
      <div className="flex flex-col justify-center">
        <div className="glass-chip w-fit border-cyan-500/30 text-cyan-200">🚀 AI Voice Intelligence Platform</div>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
          Break language barriers with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400">real-time AI</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
          Analyze, translate, and synthesize speech with near-zero latency and enterprise-grade security.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/auth?mode=register" className="primary-button">
            Start free
          </Link>
          <Link href="/pricing" className="glass-button">
            View pricing
          </Link>
          <a href="#features" className="glass-button">
            Explore features
          </a>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {trustStats.map((stat) => (
            <div key={stat.label} className="glass-panel-muted p-5">
              <div className="text-2xl font-semibold text-white">{stat.value}</div>
              <div className="mt-2 text-sm text-white/62">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="floating-orb left-5 top-5" />
        <div className="floating-orb floating-orb-secondary bottom-10 right-8" />

        <div className="glass-panel hero-visual relative overflow-hidden p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/72">Live workspace</div>
              <div className="mt-2 text-2xl font-semibold text-white">Real-time transcription workspace</div>
            </div>
            <div className="glass-chip">Speaker lanes</div>
          </div>

          <div className="mt-8 grid gap-4">
            <div className="glass-panel-muted p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/70">System audio</div>
                  <div className="mt-2 text-lg text-white">
                    “We need the Japanese translation for the meeting notes.”
                  </div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-cyan-400/14 ring-1 ring-cyan-200/28" />
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-white/10">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-panel-muted p-5">
                <div className="text-sm text-white/62">Transcript</div>
                <div className="mt-3 text-sm leading-7 text-white/80">
                  こんにちは。会議メモの翻訳をすぐに共有します。
                </div>
              </div>
              <div className="glass-panel-muted p-5">
                <div className="text-sm text-white/62">Translation</div>
                <div className="mt-3 text-sm leading-7 text-white/80">
                  Hello, I’ll share the translated meeting notes now.
                </div>
              </div>
            </div>

            <div className="glass-panel-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white/62">Mic translation TTS</div>
                  <div className="mt-2 text-base text-white">
                    Japanese voice output · 1.0x · privacy protection enabled
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="text-sm text-white/70">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
