// auth service for desktop — handles browser-based login flow and credential storage
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";

const WEB_URL = import.meta.env.VITE_WEB_URL || "http://localhost:80";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:80/api";
const STORAGE_KEY = "sayvela_auth";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 90; // 3 minutes total

// retrieve stored auth data from localStorage
export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// persist auth data to localStorage
export function saveAuth(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// remove auth data from localStorage
export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// generate a cryptographically random code for one-time token exchange
function generateCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// open the web login page in the system browser, return the code used
export async function openBrowserLogin() {
  const code = generateCode();
  const url = `${WEB_URL}/auth?desktop=1&code=${code}`;
  await openUrl(url);
  return code;
}

// poll backend until token is available for the given code
// calls onToken(token) when received, calls onError(msg) on failure
export function startPolling(code, onToken, onError) {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    attempts++;
    if (attempts > POLL_MAX_ATTEMPTS) {
      onError("Login timed out. Please try again.");
      return;
    }
    try {
      const token = await invoke("auth_poll_pending_token", { code, api_url: API_URL });
      if (token) {
        onToken(token);
        return;
      }
    } catch {}
    setTimeout(poll, POLL_INTERVAL_MS);
  };

  setTimeout(poll, POLL_INTERVAL_MS);
  return () => { stopped = true; };
}

export function logout() {
  clearAuth();
}

// returns auth header object or empty object if not authenticated
export function getAuthHeader() {
  const auth = getStoredAuth();
  if (!auth?.token) return {};
  return { Authorization: `Bearer ${auth.token}` };
}
