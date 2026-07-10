function segmentId(g) {
  return [g.originId, g.speaker, g.startMs, g.endMs, g.language, g.finalText || g.text || ""]
    .map((v) => encodeURIComponent(String(v ?? "")))
    .join(":");
}

export function groupsToSegments(groups) {
  return groups
    .filter((g) => g.finalText || g.text)
    .map((g) => ({
      id: g.id || segmentId(g),
      speaker: g.speaker ?? undefined,
      text: g.finalText || g.text || "",
      startMs: g.startMs ?? 0,
      endMs: g.endMs ?? 0,
      language: g.language ?? undefined,
      translationStatus: g.translationStatus ?? undefined,
      originId: g.originId ?? undefined,
    }));
}
