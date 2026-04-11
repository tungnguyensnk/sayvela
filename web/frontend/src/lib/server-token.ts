import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import type { JWT } from "next-auth/jwt";

// returns the backend accessToken for the current server session (server components / route handlers)
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = await getToken({
    req: {
      headers: Object.fromEntries(headerStore.entries()),
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
    } as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return (token as (JWT & { accessToken?: string }) | null)?.accessToken ?? null;
}

// returns the backend accessToken from a NextRequest jwt cookie (route handlers)
export async function getRequestToken(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return (token as (JWT & { accessToken?: string }) | null)?.accessToken ?? null;
}

export const BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";
