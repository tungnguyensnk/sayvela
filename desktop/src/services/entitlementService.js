// entitlement service — checks quota and usage via rust api commands
import { getEntitlement, recordUsage as apiRecordUsage } from "./apiClient";
import { getStoredAuth } from "./authService";

// fetches current entitlement for the authenticated user; returns null if not authenticated
export async function fetchEntitlement() {
  if (!getStoredAuth()?.token) return null;
  try {
    return await getEntitlement();
  } catch {
    return null;
  }
}

// records minutes used after a session ends; silently fails if not authenticated
export async function recordUsage(minutes) {
  if (!getStoredAuth()?.token || minutes <= 0) return;
  try {
    await apiRecordUsage(minutes);
  } catch {}
}
