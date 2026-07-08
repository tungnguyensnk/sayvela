// hook to fetch and manage session list from backend
import { useCallback, useEffect, useState } from "react";
import { listSessions, deleteSession } from "../services/apiClient";

// fetches sessions for the authenticated user; refreshes when isAuthenticated or refreshKey changes
export function useSessions(isAuthenticated, refreshKey = 0) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated) { setSessions([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await listSessions(1, 50);
      setSessions(data?.items ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  // removes a session by id from backend and local state
  const remove = useCallback(async (id) => {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  }, []);

  return { sessions, loading, error, refresh: fetch, remove };
}
