import { useCallback, useEffect, useState } from "react";
import {
  createContext,
  deleteContext,
  fetchContexts,
  updateContext,
} from "../services/contextsService";

// manages list of user soniox contexts with optimistic local state
export function useContexts(isAuthenticated) {
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) { setContexts([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContexts();
      setContexts(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  // adds a new context and refreshes list
  const add = useCallback(async (payload) => {
    const created = await createContext(payload);
    setContexts((prev) => [created, ...prev]);
    return created;
  }, []);

  // updates context by id with optimistic local update
  const edit = useCallback(async (id, payload) => {
    const updated = await updateContext(id, payload);
    setContexts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  // removes context by id with optimistic local update
  const remove = useCallback(async (id) => {
    await deleteContext(id);
    setContexts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contexts, loading, error, load, add, edit, remove };
}
