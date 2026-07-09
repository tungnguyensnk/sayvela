import { groupsToSegments } from "./segmentUtils";

export function toLoopbackSegment(segment) {
  return { ...segment, source: "loopback" };
}

export function toMicSegment(segment) {
  return {
    ...segment,
    source: "mic",
    speaker: segment.translationStatus === "original" ? (segment.speaker ?? "me") : segment.speaker,
  };
}

export function getRemainingSegments({ loopbackGroups, micGroups, sentIds }) {
  const alreadySent = sentIds ?? new Set();
  const loopbackSegs = groupsToSegments(loopbackGroups).map(toLoopbackSegment).filter((s) => !alreadySent.has(s.id));
  const micSegs = groupsToSegments(micGroups).map(toMicSegment).filter((s) => !alreadySent.has(s.id));
  return [...loopbackSegs, ...micSegs].sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
}
