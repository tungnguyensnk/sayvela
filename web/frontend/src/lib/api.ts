const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function getPublicApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (PUBLIC_API_URL) {
    return new URL(path, PUBLIC_API_URL).toString();
  }

  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }

  return new URL(path, "http://localhost").toString();
}
