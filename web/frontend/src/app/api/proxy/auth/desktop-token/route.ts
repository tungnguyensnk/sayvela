import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

// proxy GET /api/proxy/auth/desktop-token → backend GET /api/backend/auth/desktop-token
export async function GET(req: NextRequest) {
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(new URL("/api/backend/auth/desktop-token", BACKEND_URL), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
