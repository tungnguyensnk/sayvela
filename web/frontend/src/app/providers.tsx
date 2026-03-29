"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import type { Entitlement } from "@/lib/entitlement";
import { EntitlementProvider } from "@/lib/entitlement";
import { store } from "@/lib/store";

export function AppProviders({
  children,
  session,
  initialEntitlement,
}: {
  children: React.ReactNode;
  session?: Session | null;
  initialEntitlement?: ({ plan: Entitlement["plan"] } & Partial<Entitlement>) | null;
}) {
  return (
    <SessionProvider session={session}>
      <EntitlementProvider initialEntitlement={initialEntitlement}>
        <ReduxProvider store={store}>{children}</ReduxProvider>
      </EntitlementProvider>
    </SessionProvider>
  );
}
