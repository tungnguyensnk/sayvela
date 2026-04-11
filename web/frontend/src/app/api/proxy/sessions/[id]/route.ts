import type { NextRequest } from "next/server";
import { getRequestToken, BACKEND_URL } from "@/lib/server-token";

type Params = { params: Promise<{ id: string }> };

// proxy GET/PUT/DELETE /api/proxy/sessions/:id → backend
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(new URL(`/api/backend/sessions/${id}`, BACKEND_URL), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const res = await fetch(new URL(`/api/backend/sessions/${id}`, BACKEND_URL), {
    method: "PUT",
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

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = await getRequestToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(new URL(`/api/backend/sessions/${id}`, BACKEND_URL), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  return new Response(null, { status: res.status });
}
