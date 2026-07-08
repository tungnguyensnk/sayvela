import { useMemo } from "react";

export function useMergedTranscriptGroups(loopbackGroups, micGroups) {
  return useMemo(() => {
    const sys = loopbackGroups.map((g) => ({ ...g, sessionId: "sys" }));
    const mic = micGroups.map((g) => ({ ...g, sessionId: "mic" }));
    return [...sys, ...mic].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [loopbackGroups, micGroups]);
}
