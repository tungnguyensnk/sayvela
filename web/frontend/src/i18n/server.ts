import { cookies, headers } from "next/headers";
import { isLocale, matchAcceptLanguage, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";

/**
 * Ngôn ngữ do người dùng chọn thắng; chưa chọn thì đoán từ Accept-Language.
 * Cookie chỉ được ghi ở phía client (Server Component không set được cookie).
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  const headerStore = await headers();
  return matchAcceptLanguage(headerStore.get("accept-language"));
}

export async function getServerI18n(): Promise<{ locale: Locale; m: Messages }> {
  const locale = await getLocale();
  return { locale, m: getMessages(locale) };
}
