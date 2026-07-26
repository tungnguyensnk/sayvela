export type LandingFeature = {
  title: string;
  description: string;
};

export type LandingWorkflowStep = {
  title: string;
  description: string;
};

export type LandingTrustStat = {
  value: string;
  label: string;
};

export const landingFeatures: LandingFeature[] = [
  {
    title: "Omni-Channel Audio Capture",
    description:
      "Capture system and microphone audio simultaneously without interference or lag.",
  },
  {
    title: "Real-time AI Transcription",
    description:
      "Convert speech into accurate text instantly with high-speed AI.",
  },
  {
    title: "Neural Machine Translation",
    description:
      "Get instant, context-aware translations optimized for industry and business terminology.",
  },
  {
    title: "Smart Speaker Diarization",
    description:
      "Automatically identify who said what for clear, structured meeting records.",
  },
  {
    title: "Seamless Voice Synthesis",
    description:
      "Deliver natural-sounding translations with seamless Neural Text-to-Speech.",
  },
  {
    title: "Enterprise-Grade Security",
    description:
      "Protect sensitive conversations with end-to-end encryption and screen-capture safeguards.",
  },
];

export const landingWorkflowSteps: LandingWorkflowStep[] = [
  {
    title: "Seamless Integration",
    description:
      "Choose your audio input and target language. Sayvela handles the rest.",
  },
  {
    title: "Real-time AI Processing",
    description:
      "Transcribe, translate, and identify speakers simultaneously in real time.",
  },
  {
    title: "Actionable Insights",
    description:
      "Communicate confidently and decide faster with optimized meeting intelligence.",
  },
];

export const landingTrustStats: LandingTrustStat[] = [
  { value: "< 500ms", label: "AI processing latency" },
  { value: "Real-time", label: "Transcription & Translation" },
  { value: "Zero Trust", label: "Enterprise-grade security" },
];

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sayvela",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows, Web",
  description:
    "Sayvela is a real-time voice translation and transcription platform for multilingual meetings, featuring dual-audio capture, speaker diarization, TTS, and content protection.",
  featureList: landingFeatures.map((feature) => feature.title),
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};
