import type { LandingFeature } from "@/components/landing/landing-content";

export function FeaturesSection({ features }: { features: LandingFeature[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="section-eyebrow">Core technology</div>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            AI that redefines <br className="hidden sm:block" /> how you work
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-white/68 sm:text-base">
          A high-speed, secure data pipeline built for accurate, confident decisions.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="glass-panel group min-h-52 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/28 hover:bg-white/12"
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-cyan-100 transition duration-300 group-hover:bg-cyan-300/18">
              {feature.title.charAt(0)}
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
