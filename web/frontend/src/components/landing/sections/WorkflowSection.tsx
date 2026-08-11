import type { Messages } from "@/i18n/messages";

export function WorkflowSection({ m }: { m: Messages }) {
  const section = m.landing.workflow;

  return (
    <section id="workflow" className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="rail-row">
          <div className="rail-label">{section.eyebrow}</div>
          <div>
            <h2 className="max-w-2xl text-3xl sm:text-[2.125rem]">{section.title}</h2>

            {/* Số thứ tự có nghĩa: âm thanh chỉ thành thông tin theo đúng trình tự này. */}
            <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {section.steps.map((step, index) => (
                <li key={step.title} className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <span className="tabular text-sm font-medium text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
