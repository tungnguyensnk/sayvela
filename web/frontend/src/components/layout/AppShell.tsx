import type { ReactNode } from "react";
import { SiteHeader } from "@/components/navigation/SiteHeader";

/** Shared frame for every signed-in screen: header, tab nav, one measured column. */
export function AppShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div
          className={`mx-auto w-full px-5 py-8 sm:px-8 sm:py-10 ${
            width === "narrow" ? "max-w-4xl" : "max-w-6xl"
          }`}
        >
          {children}
        </div>
      </main>
    </>
  );
}
