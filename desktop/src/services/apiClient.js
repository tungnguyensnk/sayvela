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

// wraps invoke calls to detect 401 responses and dispatch an auth expiry event
async function safeInvoke(cmd, args) {
  try {
    return await invoke(cmd, args);
  } catch (e) {
    const msg = String(e);
    if (msg.includes("http 401") || msg.includes("401")) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    throw e;
  }
}

// ── settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  return safeInvoke("api_get_settings", getInvokeArgs());
}

export async function updateSettings(settingsJson) {
  return safeInvoke("api_update_settings", { ...getInvokeArgs(), settingsJson });
}

// ── contexts ──────────────────────────────────────────────────────────────────

export async function listContexts() {
  return safeInvoke("api_list_contexts", getInvokeArgs());
}

export async function createContext(payload) {
  return safeInvoke("api_create_context", { ...getInvokeArgs(), payload });
}

export async function updateContext(id, payload) {
  return safeInvoke("api_update_context", { ...getInvokeArgs(), id, payload });
}

export async function deleteContext(id) {
  return safeInvoke("api_delete_context", { ...getInvokeArgs(), id });
}

// ── billing ───────────────────────────────────────────────────────────────────

export async function getEntitlement() {
  return safeInvoke("api_get_entitlement", getInvokeArgs());
}

export async function recordUsage(minutes) {
  if (minutes <= 0) return;
  return safeInvoke("api_record_usage", { ...getInvokeArgs(), minutes });
}

// ── sessions ──────────────────────────────────────────────────────────────────

export async function createSession({ title }) {
  return safeInvoke("api_create_session", { ...getInvokeArgs(), title: title ?? null });
}

export async function finalizeSession(sessionId, { durationSeconds, status = "completed", title }) {
  return safeInvoke("api_finalize_session", {
    ...getInvokeArgs(),
    sessionId,
    durationSeconds,
    status,
    title: title ?? null,
  });
}

export async function listSessions(page = 1, limit = 20) {
  return safeInvoke("api_list_sessions", { ...getInvokeArgs(), page, limit });
}

export async function getSession(sessionId) {
  return safeInvoke("api_get_session", { ...getInvokeArgs(), sessionId });
}

export async function deleteSession(sessionId) {
  return safeInvoke("api_delete_session", { ...getInvokeArgs(), sessionId });
}
