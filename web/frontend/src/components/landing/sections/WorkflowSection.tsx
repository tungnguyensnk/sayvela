import type { LandingWorkflowStep } from "@/components/landing/landing-content";

export function WorkflowSection({ steps }: { steps: LandingWorkflowStep[] }) {
  return (
    <section id="workflow" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="glass-panel p-8 sm:p-10">
        <div className="section-eyebrow">How it works</div>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Ba bước để đi từ âm thanh thô đến phản hồi chính xác hơn
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="glass-panel-muted p-6">
              <div className="glass-chip w-fit">{`0${index + 1}`}</div>
              <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
