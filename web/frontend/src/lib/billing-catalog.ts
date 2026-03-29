export type BillingPlan = "free" | "lite" | "pro";
export type BillingInterval = "month" | "year";

export type BillingFeatures = {
  dualAudio: boolean;
  speakerDiarization: boolean;
  micTranslationTts: boolean;
  extendedHistory: boolean;
  contentProtection: boolean;
};

export const BILLING_FEATURE_LABELS: Record<keyof BillingFeatures, string> = {
  dualAudio: "dual audio capture",
  speakerDiarization: "speaker diarization",
  micTranslationTts: "mic translation TTS",
  extendedHistory: "lưu history dài hơn",
  contentProtection: "content protection",
};

export const BILLING_PLAN_MINUTES: Record<BillingPlan, number> = {
  free: 300,
  lite: 900,
  pro: 2400,
};

export const BILLING_PLAN_HISTORY_DAYS: Record<BillingPlan, number> = {
  free: 3,
  lite: 14,
  pro: 30,
};

export const BILLING_PLAN_FEATURES: Record<BillingPlan, BillingFeatures> = {
  free: {
    dualAudio: false,
    speakerDiarization: false,
    micTranslationTts: false,
    extendedHistory: false,
    contentProtection: false,
  },
  lite: {
    dualAudio: false,
    speakerDiarization: false,
    micTranslationTts: false,
    extendedHistory: true,
    contentProtection: false,
  },
  pro: {
    dualAudio: true,
    speakerDiarization: true,
    micTranslationTts: true,
    extendedHistory: true,
    contentProtection: true,
  },
};

export function getUpgradeRecommendation(plan: BillingPlan) {
  if (plan === "free") return "lite";
  if (plan === "lite") return "pro";
  return null;
}

