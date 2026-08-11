export const LOCALES = ["vi", "en", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "sayvela_locale";

/** Tên hiển thị viết bằng chính ngôn ngữ đó — người dùng nhận ra nhanh hơn. */
export const LOCALE_NAMES: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ja: "日本語",
};

export const LOCALE_CODES: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
  ja: "JA",
};

/** Thẻ BCP 47 dùng cho <html lang> và Intl. */
export const LOCALE_TAGS: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  ja: "ja-JP",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Chọn ngôn ngữ gần nhất từ header Accept-Language khi người dùng chưa chọn. */
export function matchAcceptLanguage(header?: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
