import { useCallback, useRef, useState } from "react";
import { startSonioxSession } from "./sonioxSession";

// hook that provides state and controls for managing a transcription session
export function useTranscript() {
  const sessionRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [text, setText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  // starts a new transcription session with the provided options
  const start = useCallback(async (opts = {}) => {
    if (sessionRef.current) return;
    setError("");
    setText("");
    setFinalText("");
    setPartialText("");
    setGroups([]);
    setStatus("starting");

    try {
      const session = await startSonioxSession({
        ...opts,
        onState: (s) => setStatus(s),
        onText: (t) => {
          setText(t.text || "");
          setFinalText(t.finalText || "");
          setPartialText(t.partialText || "");
          setGroups(Array.isArray(t.groups) ? t.groups : []);
        },
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
    text,
    finalText,
    partialText,
    groups,
    error,
    start,
    stop,
    running: status !== "idle" && status !== "closed" && status !== "error",
  };
}
