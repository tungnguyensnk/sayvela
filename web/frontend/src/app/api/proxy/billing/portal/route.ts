import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

// proxy POST /api/proxy/billing/portal → backend
export async function POST(req: NextRequest) {
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(new URL("/api/backend/billing/portal", BACKEND_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
