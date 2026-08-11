import type { Messages } from "@/i18n/messages";

export function UseCasesSection({ m }: { m: Messages }) {
  const section = m.landing.useCases;

  return (
    <section id="use-cases" className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="rail-row">
          <div className="rail-label">{section.eyebrow}</div>
          <div>
            <h2 className="max-w-xl text-3xl sm:text-[2.125rem]">{section.title}</h2>
            <p className="measure mt-4 text-sm leading-7 text-muted">{section.lede}</p>

            <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
              {section.items.map((useCase) => (
                <article key={useCase.title} className="flex flex-col bg-surface p-6">
                  <span className="tabular text-[0.7rem] uppercase tracking-wider text-faint">
                    {useCase.lane}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {useCase.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
