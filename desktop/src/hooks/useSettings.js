import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PREFERENCES, mergePreferences } from "../config/defaultPreferences";
import { fetchSettings, updateSettings } from "../services/settingsService";

// loads and persists user settings; merges with defaults on first load
export function useSettings(isAuthenticated) {
  const [settings, setSettings] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // loads settings from backend or localStorage cache on auth change
  useEffect(() => {
    let alive = true;
    clearTimeout(saveTimer.current);
    if (!isAuthenticated) {
      setSettings(DEFAULT_PREFERENCES);
      setLoaded(false);
      return () => { alive = false; };
    }
    fetchSettings().then((remote) => {
      if (!alive) return;
      setSettings(mergePreferences(remote));
      setLoaded(true);
    });
    return () => {
      alive = false;
      clearTimeout(saveTimer.current);
    };
  }, [isAuthenticated]);

  // debounced update — coalesces rapid setting changes into one network call
  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateSettings(next), 600);
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
