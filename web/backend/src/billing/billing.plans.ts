export type BillingPlanSlug = 'free' | 'lite' | 'pro';
export type BillingInterval = 'month' | 'year';

export type BillingPlan = {
  slug: BillingPlanSlug;
  name: string;
  description: string;
  intervals: BillingInterval[];
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    description:
      'Bắt đầu miễn phí để trải nghiệm transcription + translation cơ bản.',
    intervals: [],
  },
  {
    slug: 'lite',
    name: 'Lite',
    description: 'Tier trung gian giữa Free và Pro.',
    intervals: ['month', 'year'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    description:
      'Mở khóa dual audio, TTS, speaker diarization và history dài hơn.',
    intervals: ['month', 'year'],
  },
];

export function getStripePriceId(
  plan: BillingPlanSlug,
  interval: BillingInterval,
) {
  if (plan === 'free') return null;

  if (plan === 'lite') {
    if (interval === 'month') {
      return process.env.STRIPE_PRICE_LITE_MONTHLY ?? null;
    }
    return process.env.STRIPE_PRICE_LITE_YEARLY ?? null;
  }

  if (interval === 'month') {
    return process.env.STRIPE_PRICE_PRO_MONTHLY ?? null;
  }

  return process.env.STRIPE_PRICE_PRO_YEARLY ?? null;
}
