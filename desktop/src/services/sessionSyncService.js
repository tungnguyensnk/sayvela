// session sync service — creates and uploads session data via rust api commands
import {
  createSession as apiCreate,
  finalizeSession as apiFinalize,
  uploadSegments as apiUpload,
} from "./apiClient";
import { getStoredAuth } from "./authService";

// creates a new session on the backend; returns sessionId or null on failure
export async function createSession({ title, language }) {
  if (!getStoredAuth()?.token) return null;
  try {
    const data = await apiCreate({ title, language });
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// updates session metadata (duration, status) when session ends
export async function finalizeSession(sessionId, { durationSeconds, status = "completed" }) {
  if (!getStoredAuth()?.token || !sessionId) return;
  try {
    await apiFinalize(sessionId, { durationSeconds, status });
  } catch {}
}

// bulk-uploads transcript segments to the backend session
export async function uploadSegments(sessionId, segments) {
  if (!getStoredAuth()?.token || !sessionId || !segments?.length) return;
  try {
    await apiUpload(sessionId, segments);
  } catch {}
}
