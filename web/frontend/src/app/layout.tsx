import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import "./globals.css";
import { AppProviders } from "./providers";
import { authOptions } from "@/lib/auth";
import { getSessionToken, BACKEND_URL } from "@/lib/server-token";

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
  const accessToken = await getSessionToken();
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
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-white">
        <AppProviders session={session} initialEntitlement={initialEntitlement}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
