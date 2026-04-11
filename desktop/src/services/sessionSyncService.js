// session sync service — creates and uploads session data to the backend
import { getAuthHeader } from "./authService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:80/api";

// creates a new session on the backend; returns sessionId or null on failure
export async function createSession({ title, language }) {
  const headers = getAuthHeader();
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE}/backend/sessions`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title, language }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch {
    return null;
  }
}

// updates session metadata (duration, status) when session ends
export async function finalizeSession(sessionId, { durationSeconds, status = "completed" }) {
  const headers = getAuthHeader();
  if (!headers.Authorization || !sessionId) return;
  try {
    await fetch(`${API_BASE}/backend/sessions/${sessionId}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ durationSeconds, status }),
    });
  } catch {}
}

// bulk-uploads transcript segments to the backend session
export async function uploadSegments(sessionId, segments) {
  const headers = getAuthHeader();
  if (!headers.Authorization || !sessionId || segments.length === 0) return;
  try {
    await fetch(`${API_BASE}/backend/sessions/${sessionId}/segments`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ segments }),
    });
  } catch {}
}
