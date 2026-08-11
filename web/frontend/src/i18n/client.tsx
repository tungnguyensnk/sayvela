"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";

/**
 * Chỉ locale đi qua ranh giới server → client; bản dịch được import trực tiếp
 * trong bundle client vì một số chuỗi là hàm nội suy, không serialize được.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useI18n(): { locale: Locale; m: Messages } {
  const locale = useLocale();
  return useMemo(() => ({ locale, m: getMessages(locale) }), [locale]);
}
