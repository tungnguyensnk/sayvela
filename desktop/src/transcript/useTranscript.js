import { useCallback, useRef, useState } from "react";
import { startSonioxSession } from "./sonioxSession";

// hook that provides state and controls for managing a transcription session
export function useTranscript() {
  const sessionRef = useRef(null);
  const generationRef = useRef(0);
  const groupsRef = useRef([]);
  const [status, setStatus] = useState("idle");
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  // starts a new transcription session with the provided options
  const start = useCallback(async (opts = {}) => {
    if (sessionRef.current) return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const baseGroups = opts.preserveGroups ? groupsRef.current : [];
    const seqOffset = baseGroups.reduce((max, group) => Math.max(max, Number(group?.seq) || 0), 0);
    sessionRef.current = { stop: async () => {} };
    setError("");
    if (!opts.preserveGroups) {
      groupsRef.current = [];
      setGroups([]);
    }
    setStatus("starting");

    try {
      let session;
      const mapGroup = (group) => ({ ...group, seq: (Number(group?.seq) || 0) + seqOffset });
      session = await startSonioxSession({
        ...opts,
        onState: (s) => {
          if (generationRef.current === generation) setStatus(s);
        },
        onError: (e) => {
          if (generationRef.current !== generation) return;
          generationRef.current += 1;
          sessionRef.current = null;
          setError(String(e || "Soniox network error"));
          setStatus("error");
        },
        onText: ({ groups: nextGroups }) => {
          if (generationRef.current !== generation) return;
          const current = [...baseGroups, ...(Array.isArray(nextGroups) ? nextGroups.map(mapGroup) : [])];
          groupsRef.current = current;
          setGroups(current);
        },
        onTurnEnd: (group) => {
          if (generationRef.current === generation) opts.onTurnEnd?.(mapGroup(group));
        },
      });
      if (generationRef.current !== generation) {
        await session.stop?.();
        return;
      }
      sessionRef.current = session;
    } catch (e) {
      if (generationRef.current !== generation) return;
      generationRef.current += 1;
      sessionRef.current = null;
      setStatus("error");
      setError(String(e));
      throw e;
    }
  }, []);

  // stops the currently active transcription session
  const stop = useCallback(async () => {
    generationRef.current += 1;
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
