// contexts service — crud for user soniox contexts via rust api commands
import {
  listContexts,
  createContext as apiCreate,
  updateContext as apiUpdate,
  deleteContext as apiDelete,
} from "./apiClient";

// fetches all contexts owned by the authenticated user
export async function fetchContexts() {
  try {
    const result = await listContexts();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

// creates a new context; returns created row or throws on error
export async function createContext(payload) {
  return apiCreate(payload);
}

// updates an existing context by id; returns updated row or throws on error
export async function updateContext(id, payload) {
  return apiUpdate(id, payload);
}

// deletes a context by id; throws on error
export async function deleteContext(id) {
  return apiDelete(id);
}
