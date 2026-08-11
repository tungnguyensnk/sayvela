import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Condensed, Source_Serif_4 } from "next/font/google";
import { getServerSession } from "next-auth/next";
import "./globals.css";
import { AppProviders } from "./providers";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { authOptions } from "@/lib/auth";
import { getServerI18n } from "@/i18n/server";
import { LOCALE_TAGS } from "@/i18n/config";
import { getSessionToken, BACKEND_URL } from "@/lib/server-token";

// Nhãn thiết bị: sans hẹp cho tiêu đề, số liệu và nút.
const display = IBM_Plex_Sans_Condensed({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

// Phần đọc: biên bản là văn bản để đọc, không phải nhãn để liếc.
const body = Source_Serif_4({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "600"],
  variable: "--font-body",
  display: "swap",
});

// Dữ liệu: dấu thời gian, quota, giá — luôn xếp thẳng cột.
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost"),
  title: {
    default: "Sayvela",
    template: "%s",
  },
  description:
    "Sayvela captures both audio channels of a meeting and turns them into a bilingual transcript in real time.",
  applicationName: "Sayvela",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/sayvela-app-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/brand/sayvela-app-icon.png", sizes: "512x512" }],
  },
  alternates: {
    canonical: "/",
  },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaece6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const accessToken = await getSessionToken();
  const { locale } = await getServerI18n();
  let initialEntitlement: { plan: "free" | "lite" | "pro" } | null = null;

  if (accessToken) {
    try {
      const res = await fetch(new URL("/api/backend/billing/entitlement", BACKEND_URL), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        initialEntitlement = (await res.json()) as { plan: "free" | "lite" | "pro" };
      }
    } catch {}
  }

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`h-full antialiased ${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <AppProviders
          session={session}
          locale={locale}
          initialEntitlement={initialEntitlement}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
