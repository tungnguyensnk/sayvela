import { LOCALE_TAGS, type Locale } from "@/i18n/config";

/**
 * Bản ghi do backend phát ra theo giờ Việt Nam, nên mọi mốc thời gian được
 * hiển thị trong cùng một múi giờ dù người xem đang ở đâu — tránh việc hai
 * người nhìn cùng một phiên lại thấy hai giờ khác nhau.
 */
const TZ = "Asia/Ho_Chi_Minh";

function tag(locale: Locale) {
  return LOCALE_TAGS[locale];
}

function parse(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "5m 30s" — với tiếng Nhật dùng ký hiệu 分/秒 cho quen mắt. */
export function formatDuration(seconds: number, locale: Locale = "vi") {
  const units =
    locale === "ja"
      ? { h: "時間", m: "分", s: "秒", gap: "" }
      : { h: "h", m: "m", s: "s", gap: " " };

  if (!Number.isFinite(seconds) || seconds <= 0) return `0${units.s}`;

  if (seconds < 60) return `${Math.round(seconds)}${units.s}`;

  const totalMinutes = Math.floor(seconds / 60);
  const restSeconds = Math.round(seconds % 60);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    return `${hours}${units.h}${units.gap}${totalMinutes % 60}${units.m}`;
  }

  return restSeconds > 0
    ? `${totalMinutes}${units.m}${units.gap}${restSeconds}${units.s}`
    : `${totalMinutes}${units.m}`;
}

export function formatDateTime(value: string | null, locale: Locale = "vi") {
  const date = parse(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(tag(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(date);
}

export function formatShortDateTime(value: string | null, locale: Locale = "vi") {
  const date = parse(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(tag(locale), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(date);
}

/** Ngày dạng dài dùng trong phần thanh toán: "29 thg 4, 2026" · "29 Apr 2026" · "2026年4月29日". */
export function formatLongDate(value: string | null, locale: Locale = "vi") {
  const date = parse(value);
  if (!date) return null;

  if (locale === "vi") {
    const parts = new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: TZ,
    }).formatToParts(date);

    const day = parts.find((part) => part.type === "day")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const year = parts.find((part) => part.type === "year")?.value;

    if (day && month && year) return `${day} thg ${month}, ${year}`;
  }

  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
    timeZone: TZ,
  }).format(date);
}

/** mm:ss cho từng lượt nói trong biên bản. */
export function formatTimecode(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
