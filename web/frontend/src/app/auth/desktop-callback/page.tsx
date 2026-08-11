import type { Metadata } from "next";
import { Suspense } from "react";
import { DesktopCallbackView } from "./DesktopCallbackView";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getServerI18n();
  return {
    title: m.meta.desktopCallback,
    robots: { index: false, follow: false },
  };
}

export default function DesktopCallbackPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-5 py-10">
      <Suspense>
        <DesktopCallbackView />
      </Suspense>
    </main>
  );
}
