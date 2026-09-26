import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

// tracks which transcript segment the voice is reading and how far it has got,
// so the spoken words can be highlighted as they are heard. also remembers
// when the voice first reached each segment, for the lag readout
export function useSpeechHighlight(active) {
  const [highlight, setHighlight] = useState(null);
  const spokenAtRef = useRef(new Map());

  useEffect(() => {
    const spokenAt = spokenAtRef.current;
    // the readouts stay once the voice is off, only the marking goes
    setHighlight({ markerId: "", charIndex: 0, spokenAt });
    if (!active) return undefined;
    let alive = true;
    let unlisten = null;
    listen("tts_progress", ({ payload }) => {
      if (!alive) return;
      const markerId = String(payload?.markerId || "");
      const charIndex = Number(payload?.charIndex) || 0;
      const done = Boolean(payload?.done);
      if (markerId && !spokenAt.has(markerId)) spokenAt.set(markerId, Date.now());
      // once the voice has finished nothing stays marked
      setHighlight({ markerId: done ? "" : markerId, charIndex, spokenAt });
    })
      .then((fn) => {
        if (alive) unlisten = fn;
        else fn();
      })
      .catch(() => {});
    return () => {
      alive = false;
      unlisten?.();
    };
  }, [active]);

  return highlight;
}
