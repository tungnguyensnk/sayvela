// settings service — loads and persists user settings via rust api commands
import { getSettings, updateSettings as apiUpdateSettings } from "./apiClient";

const CACHE_KEY = "sayvela_settings";

// loads cached settings from localStorage (used when offline or not yet fetched)
export function getCachedSettings() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// persists settings to localStorage cache
export function cacheSettings(settingsJson) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settingsJson));
  } catch {}
}

// clears cached settings on logout
export function clearCachedSettings() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

// fetches settings from backend via rust command; falls back to localStorage cache
export async function fetchSettings() {
  try {
    const data = await getSettings();
    const json = data?.settingsJson ?? data ?? {};
    cacheSettings(json);
    return json;
  } catch {
    return getCachedSettings();
  }
}

// updates settings via rust command; also updates local cache immediately
export async function updateSettings(settingsJson) {
  cacheSettings(settingsJson);
  try {
    await apiUpdateSettings(settingsJson);
  } catch {}
}
