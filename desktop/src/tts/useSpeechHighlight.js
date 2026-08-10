import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

// tracks which transcript segment the voice is reading and how far it has got,
// so the spoken words can be highlighted as they are heard
export function useSpeechHighlight(active) {
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    if (!active) {
      setHighlight(null);
      return;
    }
    let alive = true;
    let unlisten = null;
    listen("tts_progress", ({ payload }) => {
      if (!alive) return;
      const markerId = String(payload?.markerId || "");
      const charIndex = Number(payload?.charIndex) || 0;
      const done = Boolean(payload?.done);
      setHighlight(markerId ? { markerId, charIndex, done } : null);
    })
      .then((fn) => {
        if (alive) unlisten = fn;
        else fn();
      })
      .catch(() => {});
    return () => {
      alive = false;
      unlisten?.();
      setHighlight(null);
    };
  }, [active]);

  return highlight;
}
