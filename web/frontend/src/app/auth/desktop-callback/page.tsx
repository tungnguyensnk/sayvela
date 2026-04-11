import type { Metadata } from "next";
import { Suspense } from "react";
import { DesktopCallbackView } from "./DesktopCallbackView";

export const metadata: Metadata = {
  title: "Mở lại Sayvela | Đăng nhập thành công",
  robots: { index: false, follow: false },
};

export default function DesktopCallbackPage() {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-10">
      <div className="page-glow page-glow-top" />
      <div className="page-glow page-glow-bottom" />
      <Suspense>
        <DesktopCallbackView />
      </Suspense>
    </main>
  );
}
