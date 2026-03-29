export type GuardSearchParams = Record<string, string | string[] | undefined>;

export function buildPathWithQuery(pathname: string, params?: GuardSearchParams) {
  if (!params) return pathname;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) query.append(key, String(item));
      }
      continue;
    }
    query.set(key, String(value));
  }

  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function getLoginUrl(callbackUrl: string, mode: "login" | "register" = "login") {
  const safeCallbackUrl = callbackUrl?.trim() ? callbackUrl.trim() : "/";
  return `/auth?mode=${mode}&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
}

