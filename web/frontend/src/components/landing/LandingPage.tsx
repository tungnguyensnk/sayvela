import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildSoftwareSchema } from "@/components/landing/landing-content";
import { FaqSection } from "@/components/landing/FaqSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { SectionSpy } from "@/components/landing/SectionSpy";
import { CtaSection } from "@/components/landing/sections/CtaSection";
import { FeaturesSection } from "@/components/landing/sections/FeaturesSection";
import { HeroSection } from "@/components/landing/sections/HeroSection";
import { LandingFooter } from "@/components/landing/sections/LandingFooter";
import { WorkflowSection } from "@/components/landing/sections/WorkflowSection";
import { getServerI18n } from "@/i18n/server";

const SECTION_IDS = ["hero", "features", "workflow", "use-cases", "faq"];

export async function LandingPage() {
  const { m } = await getServerI18n();

  return (
    <>
      <LandingHeader />

      <main className="flex-1">
        <SectionSpy sectionIds={SECTION_IDS} />

        <HeroSection m={m} />
        <FeaturesSection m={m} />
        <WorkflowSection m={m} />
        <UseCasesSection m={m} />
        <FaqSection m={m} />
        <CtaSection m={m} />
      </main>

      <LandingFooter m={m} />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildSoftwareSchema(m)),
        }}
      />
    </>
  );
}
