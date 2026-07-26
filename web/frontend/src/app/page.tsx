import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sayvela | Real-Time Voice Translation & Transcription",
  description:
    "Translate speech, transcribe in real time, identify speakers, and play back translations in one modern workspace.",
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
      "Real-time transcription and translation for multilingual meetings.",
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
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sayvela | Real-time voice translation",
    description:
      "Dual-audio capture, transcription, translation, speaker diarization, and TTS in one workflow.",
    images: ["/sayvela-og.svg"],
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return <LandingPage />;
}
