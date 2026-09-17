import { invoke } from "@tauri-apps/api/core";

// lists monitors available for the assist screenshot
export async function listMonitors() {
  try {
    const out = await invoke("screen_list_monitors");
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

// frames one monitor in red, or clears the frame when passed nothing
export async function highlightMonitor(monitorId) {
  try {
    await invoke("screen_highlight", { monitorId: monitorId || null });
  } catch {}
}

// captures the chosen monitor as a jpeg data url with a content hash
export async function captureScreen(monitorId) {
  return invoke("screen_capture", { monitorId: monitorId || null, maxWidth: 1280 });
}
