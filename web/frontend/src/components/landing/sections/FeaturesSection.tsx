import type { Messages } from "@/i18n/messages";
import { FEATURE_ICONS, type LandingFeatureIcon } from "@/components/landing/landing-content";
import {
  LanguagesIcon,
  ShieldIcon,
  SparkIcon,
  SpeakerIcon,
  UsersIcon,
  WaveIcon,
} from "@/components/ui/icons";

const ICONS: Record<LandingFeatureIcon, typeof WaveIcon> = {
  wave: WaveIcon,
  spark: SparkIcon,
  languages: LanguagesIcon,
  users: UsersIcon,
  speaker: SpeakerIcon,
  shield: ShieldIcon,
};

export function FeaturesSection({ m }: { m: Messages }) {
  const section = m.landing.features;

  return (
    <section id="features" className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="rail-row">
          <div className="rail-label">{section.eyebrow}</div>
          <div>
            <h2 className="max-w-xl text-3xl sm:text-[2.125rem]">{section.title}</h2>
            <p className="measure mt-4 text-sm leading-7 text-muted">{section.lede}</p>

            <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((feature, index) => {
                const Glyph = ICONS[FEATURE_ICONS[index] ?? "wave"];
                return (
                  <article
                    key={feature.title}
                    className="flex flex-col bg-surface p-6 transition-colors hover:bg-raised"
                  >
                    <span className="flex h-8 w-8 items-center justify-center border border-line bg-raised text-accent">
                      <Glyph width={17} height={17} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
