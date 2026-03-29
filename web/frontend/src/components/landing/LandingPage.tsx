import dynamic from "next/dynamic";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  landingFeatures,
  landingTrustStats,
  landingWorkflowSteps,
  softwareApplicationSchema,
} from "@/components/landing/landing-content";
import { CtaSection } from "@/components/landing/sections/CtaSection";
import { FeaturesSection } from "@/components/landing/sections/FeaturesSection";
import { HeroSection } from "@/components/landing/sections/HeroSection";
import { LandingFooter } from "@/components/landing/sections/LandingFooter";
import { SectionLoading } from "@/components/landing/sections/SectionLoading";
import { WorkflowSection } from "@/components/landing/sections/WorkflowSection";

const UseCasesSection = dynamic(
  () => import("@/components/landing/UseCasesSection"),
  {
    loading: () => <SectionLoading label="Đang tải tình huống sử dụng..." />,
  },
);

const FaqSection = dynamic(() => import("@/components/landing/FaqSection"), {
  loading: () => <SectionLoading label="Đang tải câu hỏi thường gặp..." />,
});

export function LandingPage() {
  return (
    <main className="relative flex-1">
      <LandingHeader />

      <div className="relative overflow-x-hidden">
        <div className="page-glow page-glow-top" />
        <div className="page-glow page-glow-bottom" />

        <HeroSection trustStats={landingTrustStats} />
        <FeaturesSection features={landingFeatures} />
        <WorkflowSection steps={landingWorkflowSteps} />

        <UseCasesSection />
        <FaqSection />

        <CtaSection />
        <LandingFooter />

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
