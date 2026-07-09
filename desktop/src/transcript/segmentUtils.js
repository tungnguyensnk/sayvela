export function groupsToSegments(groups) {
  return groups
    .filter((g) => g.finalText || g.text)
    .map((g) => ({
      id: g.id || crypto.randomUUID(),
      speaker: g.speaker ?? undefined,
      text: g.finalText || g.text || "",
      startMs: g.startMs ?? 0,
      endMs: g.endMs ?? 0,
      language: g.language ?? undefined,
      translationStatus: g.translationStatus ?? undefined,
      originId: g.originId ?? undefined,
    }));
}
