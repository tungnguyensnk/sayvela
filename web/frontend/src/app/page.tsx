import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { authOptions } from "@/lib/auth";
import { getServerI18n } from "@/i18n/server";
import { LOCALE_TAGS } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, m } = await getServerI18n();

  return {
    title: m.meta.home.title,
    description: m.meta.home.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: m.meta.home.ogTitle,
      description: m.meta.home.ogDescription,
      url: "/",
      siteName: "Sayvela",
      images: [
        {
          url: "/sayvela-og.png",
          type: "image/png",
          width: 1200,
          height: 630,
          alt: m.meta.home.ogTitle,
        },
      ],
      locale: LOCALE_TAGS[locale].replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: m.meta.home.ogTitle,
      description: m.meta.home.ogDescription,
      images: ["/sayvela-og.png"],
    },
  };
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return <LandingPage />;
}
