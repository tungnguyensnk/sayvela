import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PREFERENCES, mergePreferences } from "../config/defaultPreferences";
import { fetchSettings, updateSettings } from "../services/settingsService";

// loads and persists user settings; merges with defaults on first load
export function useSettings(isAuthenticated) {
  const [settings, setSettings] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);
  const loadedRef = useRef(false);

  // loads settings from backend or localStorage cache on auth change
  useEffect(() => {
    let alive = true;
    clearTimeout(saveTimer.current);
    pendingSave.current = null;
    loadedRef.current = false;
    if (!isAuthenticated) {
      setSettings(DEFAULT_PREFERENCES);
      setLoaded(false);
      return () => { alive = false; };
    }
    fetchSettings().then((remote) => {
      if (!alive) return;
      setSettings(mergePreferences(remote));
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      alive = false;
      clearTimeout(saveTimer.current);
    };
  }, [isAuthenticated]);

  // debounced update — coalesces rapid setting changes into one network call
  const update = useCallback((patch) => {
    // before the load resolves the state is still defaults, so saving now would
    // overwrite the stored preferences with them
    if (!loadedRef.current) return;
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // the timer saves the latest value rather than the snapshot captured here
      pendingSave.current = next;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const value = pendingSave.current;
        pendingSave.current = null;
        if (value) updateSettings(value);
      }, 600);
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
