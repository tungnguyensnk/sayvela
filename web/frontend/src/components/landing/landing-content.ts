import type { Messages } from "@/i18n/messages";

export type LandingFeatureIcon =
  | "wave"
  | "spark"
  | "languages"
  | "users"
  | "speaker"
  | "shield";

/** Thứ tự icon khớp với thứ tự tính năng trong từ điển. */
export const FEATURE_ICONS: LandingFeatureIcon[] = [
  "wave",
  "spark",
  "languages",
  "users",
  "speaker",
  "shield",
];

/** Structured data giữ nguyên tiếng Anh để công cụ tìm kiếm đọc nhất quán. */
export function buildSoftwareSchema(m: Messages) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sayvela",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, Web",
    description: m.meta.home.description,
    featureList: m.landing.features.items.map((feature) => feature.title),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}
