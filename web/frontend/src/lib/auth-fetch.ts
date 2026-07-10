import { signOut } from "next-auth/react";

let signOutPromise: Promise<unknown> | null = null;

export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status === 401 && !signOutPromise) {
    signOutPromise = signOut({ callbackUrl: "/auth?mode=login" });
  }
  return response;
}
