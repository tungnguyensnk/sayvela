import { useCallback, useRef, useState } from "react";
import { startSonioxSession } from "./sonioxSession";

// hook that provides state and controls for managing a transcription session
export function useTranscript() {
  const sessionRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  // starts a new transcription session with the provided options
  const start = useCallback(async (opts = {}) => {
    if (sessionRef.current) return;
    setError("");
    setGroups([]);
    setStatus("starting");

    try {
      const session = await startSonioxSession({
        ...opts,
        onState: (s) => setStatus(s),
        onText: ({ groups: nextGroups }) => setGroups(Array.isArray(nextGroups) ? nextGroups : []),
        onTurnEnd: opts.onTurnEnd,
      });
      sessionRef.current = session;
    } catch (e) {
      setStatus("error");
      setError(String(e));
      throw e;
    }
  }, []);

  // stops the currently active transcription session
  const stop = useCallback(async () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    try {
      await s?.stop?.();
    } finally {
      setStatus("idle");
    }
  }, []);

  return {
    status,
    groups,
    error,
    start,
    stop,
    running: status !== "idle" && status !== "closed" && status !== "error",
  };
}
