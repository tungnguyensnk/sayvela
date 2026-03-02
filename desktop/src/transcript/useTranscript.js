import { useCallback, useRef, useState } from "react";
import { startSonioxSession } from "./sonioxSession";

export function useTranscript() {
  const sessionRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [text, setText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError("");
    setText("");
    setFinalText("");
    setPartialText("");
    setStatus("starting");

    try {
      const session = await startSonioxSession({
        onState: (s) => setStatus(s),
        onText: (t) => {
          setText(t.text || "");
          setFinalText(t.finalText || "");
          setPartialText(t.partialText || "");
        },
      });
      sessionRef.current = session;
    } catch (e) {
      setStatus("error");
      setError(String(e));
      throw e;
    }
  }, []);

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
    error,
    start,
    stop,
    running: status !== "idle" && status !== "closed" && status !== "error",
  };
}
