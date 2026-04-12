import { useEffect, useRef, useState } from "react";
import { fetchSettings, updateSettings } from "../services/settingsService";

const DEFAULT_SETTINGS = {
  loopbackDeviceId: "default-loopback",
  loopbackInputLangs: ["ja", "en"],
  loopbackOutputLang: "vi",
  loopbackContextId: null,
  micDeviceId: "default-mic",
  micInputLangs: ["vi"],
  micOutputLang: "ja",
  micTtsEnabled: false,
  micTtsVoiceId: "",
  micTtsRate: 1.1,
  micTtsPitch: 1,
  micTtsVolume: 1,
  micTtsOutputDeviceId: "default-loopback",
  contentProtectionEnabled: true,
};

// loads and persists user settings; merges with defaults on first load
export function useSettings(isAuthenticated) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // loads settings from backend or localStorage cache on auth change
  useEffect(() => {
    if (!isAuthenticated) { setLoaded(false); return; }
    fetchSettings().then((remote) => {
      if (remote && typeof remote === "object") {
        setSettings((prev) => ({ ...prev, ...remote }));
      }
      setLoaded(true);
    });
  }, [isAuthenticated]);

  // debounced update — coalesces rapid setting changes into one network call
  const update = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateSettings(next), 600);
      return next;
    });
  };

  return { settings, update, loaded };
}
