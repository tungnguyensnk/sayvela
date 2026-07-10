// session sync service — creates and uploads session data via rust api commands
import {
  createSession as apiCreate,
  finalizeSession as apiFinalize,
} from "./apiClient";
import { getStoredAuth } from "./authService";

// creates a new session on the backend; returns sessionId or null when unauthenticated
export async function createSession({ title }) {
  if (!getStoredAuth()?.token) return null;
  const data = await apiCreate({ title });
  return data?.id ?? null;
}

// updates session metadata (duration, status, title) when session ends
export async function finalizeSession(sessionId, { durationSeconds, status = "completed", title }) {
  if (!getStoredAuth()?.token || !sessionId) return;
  await apiFinalize(sessionId, { durationSeconds, status, title });
}
