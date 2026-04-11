// entitlement service — checks quota and usage from the backend
import { getAuthHeader } from "./authService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:80/api";

// fetches current entitlement for the authenticated user; returns null if not authenticated
export async function fetchEntitlement() {
  const headers = getAuthHeader();
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE}/backend/billing/entitlement`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// records minutes used after a session ends; silently fails if not authenticated
export async function recordUsage(minutes) {
  const headers = getAuthHeader();
  if (!headers.Authorization || minutes <= 0) return;
  try {
    await fetch(`${API_BASE}/backend/billing/usage`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
  } catch {}
}
