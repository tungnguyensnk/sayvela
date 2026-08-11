import Link from "next/link";
import type { Messages } from "@/i18n/messages";
import { ConsolePreview } from "@/components/landing/ConsolePreview";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Tiêu đề là một chuỗi duy nhất trong từ điển, phần được nhấn nằm giữa [[…]].
 * Nhờ vậy mỗi ngôn ngữ tự quyết định dấu câu và khoảng trắng của mình.
 */
function splitHeadline(title: string) {
  const match = title.match(/^([\S\s]*?)\[\[([\S\s]+?)\]\]([\S\s]*)$/);
  if (!match) return { lead: title, accent: "", tail: "" };
  return { lead: match[1], accent: match[2], tail: match[3] };
}

export function HeroSection({ m }: { m: Messages }) {
  const hero = m.landing.hero;
  const { lead, accent, tail } = splitHeadline(hero.title);
  const stats = [m.landing.stats.latency, m.landing.stats.channels, m.landing.stats.security];

  return (
    <section id="hero" className="border-b border-line">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_minmax(0,25rem)] lg:gap-14 lg:pb-24 lg:pt-20">
        <div className="flex flex-col items-start">
          <span className="eyebrow text-accent">{hero.eyebrow}</span>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[3.375rem]">
            {lead}
            <span className="text-accent">{accent}</span>
            {tail}
          </h1>

          <p className="measure mt-5 text-base leading-7 text-muted sm:text-[1.0625rem]">
            {hero.lede}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth?mode=register" className="btn btn-primary btn-lg">
              {hero.primary}
              <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/pricing" className="btn btn-secondary btn-lg">
              {hero.secondary}
            </Link>
          </div>

          <dl className="mt-10 grid w-full grid-cols-1 border-t border-line sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-b border-line py-4 sm:border-b-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0"
              >
                <dt className="text-xs text-faint">{stat.label}</dt>
                <dd className="tabular mt-1.5 text-base font-medium text-ink">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="w-full lg:justify-self-end">
          <ConsolePreview />
        </div>
      </div>
    </section>
  );
}
