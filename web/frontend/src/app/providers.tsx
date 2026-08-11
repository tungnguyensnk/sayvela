"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import type { Entitlement } from "@/lib/entitlement";
import { EntitlementProvider } from "@/lib/entitlement";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { store } from "@/lib/store";

export function AppProviders({
  children,
  session,
  locale,
  initialEntitlement,
}: {
  children: React.ReactNode;
  session?: Session | null;
  locale: Locale;
  initialEntitlement?: ({ plan: Entitlement["plan"] } & Partial<Entitlement>) | null;
}) {
  return (
    <I18nProvider locale={locale}>
      <SessionProvider session={session}>
        <EntitlementProvider initialEntitlement={initialEntitlement}>
          <ReduxProvider store={store}>{children}</ReduxProvider>
        </EntitlementProvider>
      </SessionProvider>
    </I18nProvider>
  );
}
