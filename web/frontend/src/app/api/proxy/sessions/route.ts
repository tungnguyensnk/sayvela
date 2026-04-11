import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

// proxy GET/POST /api/proxy/sessions → backend sessions
export async function GET(req: NextRequest) {
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const backendUrl = new URL("/api/backend/sessions", BACKEND_URL);
  searchParams.forEach((v, k) => backendUrl.searchParams.set(k, v));

  const res = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const res = await fetch(new URL("/api/backend/sessions", BACKEND_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
