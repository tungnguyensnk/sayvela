// central api client that proxies all backend calls through rust tauri commands to avoid cors
import { invoke } from "@tauri-apps/api/core";
import { getStoredAuth } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:80/api";

// returns { apiUrl, token } for authenticated rust commands; throws if not auth
function getInvokeArgs() {
  const auth = getStoredAuth();
  const token = auth?.token;
  if (!token) throw new Error("not authenticated");
  return { apiUrl: API_URL, token };
}

// ── settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  return invoke("api_get_settings", getInvokeArgs());
}

export async function updateSettings(settingsJson) {
  return invoke("api_update_settings", { ...getInvokeArgs(), settingsJson });
}

// ── contexts ──────────────────────────────────────────────────────────────────

export async function listContexts() {
  return invoke("api_list_contexts", getInvokeArgs());
}

export async function createContext(payload) {
  return invoke("api_create_context", { ...getInvokeArgs(), payload });
}

export async function updateContext(id, payload) {
  return invoke("api_update_context", { ...getInvokeArgs(), id, payload });
}

export async function deleteContext(id) {
  return invoke("api_delete_context", { ...getInvokeArgs(), id });
}

// ── billing ───────────────────────────────────────────────────────────────────

export async function getEntitlement() {
  return invoke("api_get_entitlement", getInvokeArgs());
}

export async function recordUsage(minutes) {
  if (minutes <= 0) return;
  return invoke("api_record_usage", { ...getInvokeArgs(), minutes });
}

// ── sessions ──────────────────────────────────────────────────────────────────

export async function createSession({ title, language }) {
  return invoke("api_create_session", { ...getInvokeArgs(), title: title ?? null, language });
}

export async function finalizeSession(sessionId, { durationSeconds, status = "completed" }) {
  return invoke("api_finalize_session", {
    ...getInvokeArgs(),
    sessionId,
    durationSeconds,
    status,
  });
}

export async function uploadSegments(sessionId, segments) {
  return invoke("api_upload_segments", { ...getInvokeArgs(), sessionId, segments });
}

// ── auth ──────────────────────────────────────────────────────────────────────

export async function getMe() {
  return invoke("api_get_me", getInvokeArgs());
}
