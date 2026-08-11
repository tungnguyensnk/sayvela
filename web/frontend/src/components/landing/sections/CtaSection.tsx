import Link from "next/link";
import type { Messages } from "@/i18n/messages";
import { ArrowRightIcon } from "@/components/ui/icons";

export function CtaSection({ m }: { m: Messages }) {
  const section = m.landing.cta;

  return (
    <section className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="card flex flex-col gap-6 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="eyebrow">{section.eyebrow}</span>
            <h2 className="mt-3 max-w-2xl text-2xl sm:text-3xl">{section.title}</h2>
            <p className="measure mt-3 text-sm leading-7 text-muted">{section.lede}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/auth?mode=register" className="btn btn-primary btn-lg">
              {section.primary}
              <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/pricing" className="btn btn-secondary btn-lg">
              {section.secondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
