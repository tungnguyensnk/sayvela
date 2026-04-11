import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

export async function POST(req: NextRequest) {
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(new URL("/api/backend/auth/pending-token", BACKEND_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

