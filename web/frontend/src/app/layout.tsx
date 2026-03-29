import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { authOptions } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost"),
  title: {
    default: "Sayvela",
    template: "%s",
  },
  description:
    "Sayvela là nền tảng voice translation và transcription thời gian thực cho các cuộc họp đa ngôn ngữ.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const accessToken =
    (session as unknown as { accessToken?: string } | null)?.accessToken ?? null;
  let initialEntitlement: { plan: "free" | "lite" | "pro" } | null = null;

  if (accessToken) {
    const apiBase =
      process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

    try {
      const res = await fetch(new URL("/api/backend/billing/entitlement", apiBase), {
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
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white">
        <AppProviders session={session} initialEntitlement={initialEntitlement}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
