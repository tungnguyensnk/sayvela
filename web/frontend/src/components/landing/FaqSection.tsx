import type { Messages } from "@/i18n/messages";
import { ChevronDownIcon } from "@/components/ui/icons";

export function FaqSection({ m }: { m: Messages }) {
  const section = m.landing.faq;

  return (
    <section id="faq" className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="rail-row">
          <div className="rail-label">{section.eyebrow}</div>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-14">
            <h2 className="text-3xl sm:text-[2.125rem]">{section.title}</h2>

            <div className="border border-line bg-surface">
              {section.items.map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-line last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-sm font-semibold transition-colors hover:bg-raised [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDownIcon className="shrink-0 text-faint transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-6 text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
