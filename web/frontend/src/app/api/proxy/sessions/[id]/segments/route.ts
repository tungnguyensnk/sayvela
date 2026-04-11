import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

type Params = { params: Promise<{ id: string }> };

// proxy POST /api/proxy/sessions/:id/segments → bulk insert segments
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const res = await fetch(new URL(`/api/backend/sessions/${id}/segments`, BACKEND_URL), {
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
