import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Sayvela | Real-time voice translation và transcription",
  description:
    "Sayvela giúp bạn dịch giọng nói, ghi transcript thời gian thực, tách người nói và phát lại bản dịch với trải nghiệm glass hiện đại.",
  keywords: [
    "real-time voice translation",
    "speech transcription",
    "speaker diarization",
    "multilingual meetings",
    "Sayvela",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sayvela | Real-time voice translation",
    description:
      "Nền tảng transcript và translation thời gian thực cho cuộc họp đa ngôn ngữ.",
    url: "/",
    siteName: "Sayvela",
    images: [
      {
        url: "/sayvela-og.svg",
        width: 1200,
        height: 630,
        alt: "Sayvela realtime translation platform",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sayvela | Real-time voice translation",
    description:
      "Dual audio capture, transcription, translation, speaker diarization và TTS trong một workflow.",
    images: ["/sayvela-og.svg"],
  },
};

export default function Home() {
  return <LandingPage />;
}
