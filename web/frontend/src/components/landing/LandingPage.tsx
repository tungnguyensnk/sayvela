import dynamic from "next/dynamic";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  landingFeatures,
  landingTrustStats,
  landingWorkflowSteps,
  softwareApplicationSchema,
} from "@/components/landing/landing-content";
import { FeaturesSection } from "@/components/landing/sections/FeaturesSection";
import { HeroSection } from "@/components/landing/sections/HeroSection";
import { LandingFooter } from "@/components/landing/sections/LandingFooter";
import { SectionLoading } from "@/components/landing/sections/SectionLoading";
import { WorkflowSection } from "@/components/landing/sections/WorkflowSection";
import { AnimatedSection } from "@/components/landing/AnimatedSection";
import { FullPageScroller } from "@/components/landing/FullPageScroller";

const UseCasesSection = dynamic(
  () => import("@/components/landing/UseCasesSection"),
  {
    loading: () => <SectionLoading label="Loading use cases..." />,
  },
);

const FaqSection = dynamic(() => import("@/components/landing/FaqSection"), {
  loading: () => <SectionLoading label="Loading FAQs..." />,
});

export function LandingPage() {
  // main landing page component with full-page scroll snapping
  // wraps each section in an animated container for scroll transitions
  return (
    <main className="relative flex min-h-dvh flex-col overflow-visible xl:h-dvh xl:min-h-0 xl:overflow-hidden [@media(max-height:799px)]:!h-auto [@media(max-height:799px)]:!min-h-dvh [@media(max-height:799px)]:!overflow-visible">
      <LandingHeader />

      <div className="relative w-full flex-1 overflow-visible xl:overflow-hidden [@media(max-height:799px)]:!overflow-visible">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <FullPageScroller sectionIds={["hero", "features", "workflow", "use-cases", "faq"]}>
          <div className="flex w-full items-center justify-center px-1 md:px-4 lg:px-6 xl:px-0">
            <AnimatedSection>
              <HeroSection trustStats={landingTrustStats} />
            </AnimatedSection>
          </div>

          <div className="flex w-full items-center justify-center px-1 md:px-4 lg:px-6 xl:px-0">
            <AnimatedSection>
              <FeaturesSection features={landingFeatures} />
            </AnimatedSection>
          </div>

          <div className="flex w-full items-center justify-center px-1 md:px-4 lg:px-6 xl:px-0">
            <AnimatedSection>
              <WorkflowSection steps={landingWorkflowSteps} />
            </AnimatedSection>
          </div>

          <div className="flex w-full items-center justify-center px-1 md:px-4 lg:px-6 xl:px-0">
            <AnimatedSection>
              <UseCasesSection />
            </AnimatedSection>
          </div>

          <div className="flex h-full w-full flex-col justify-between px-1 md:px-4 lg:px-6 xl:px-0">
            <AnimatedSection className="flex flex-1 items-center">
              <FaqSection />
            </AnimatedSection>
            <LandingFooter />
          </div>
        </FullPageScroller>

        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema),
          }}
        />
      </div>
    </main>
  );
}
