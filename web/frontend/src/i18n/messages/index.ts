import type { Locale } from "@/i18n/config";
import { vi, type Messages } from "@/i18n/messages/vi";
import { en } from "@/i18n/messages/en";
import { ja } from "@/i18n/messages/ja";

export type { Messages };

export const dictionaries: Record<Locale, Messages> = { vi, en, ja };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
