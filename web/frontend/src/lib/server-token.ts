import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import type { JWT } from "next-auth/jwt";

// returns the backend accessToken for the current server session (server components / route handlers)
export async function getSessionToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session as unknown as { accessToken?: string } | null)?.accessToken ?? null;
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
