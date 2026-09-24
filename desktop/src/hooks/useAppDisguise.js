import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { iconBytes } from "../services/disguiseService";

const APP_TITLE = "Sayvela";

// swaps the taskbar / alt-tab icon and the window title for the chosen app;
// returns what is applied so the tray can match it
export function useAppDisguise(id) {
  const [applied, setApplied] = useState({ title: APP_TITLE, icon: null });

  useEffect(() => {
    let alive = true;
    invoke("disguise_apply", { id: id || null })
      .then((option) => {
        if (!alive) return;
        // null means sayvela itself, also when the app is not installed here
        setApplied(option ? { title: option.title, icon: iconBytes(option.icon) } : { title: APP_TITLE, icon: null });
      })
      .catch((err) => console.error("app disguise failed", err));
    return () => {
      alive = false;
    };
  }, [id]);

  return applied;
}
