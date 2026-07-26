"use client";

const useCases = [
  {
    title: "Global Board Meetings",
    description:
      "Break language barriers in strategic meetings and make faster decisions with instant translations.",
  },
  {
    title: "Global User Research",
    description:
      "Streamline global user interviews and capture accurate insights automatically.",
  },
  {
    title: "Cross-border Customer Success",
    description:
      "Deliver consistent global customer support across every language.",
  },
];

export default function UseCasesSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="glass-panel p-8 sm:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="section-eyebrow">Enterprise Solutions</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Built for global teams
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Deploy across every touchpoint, from internal strategy to global customer success.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="glass-panel-muted p-6">
              <div className="text-lg font-semibold text-white">
                {useCase.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {useCase.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
