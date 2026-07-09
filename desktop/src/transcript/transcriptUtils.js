// calculates the byte size of an audio chunk or buffer
export function byteSize(chunk) {
  if (!chunk) return 0;
  if (typeof chunk.length === "number") return chunk.length;
  if (typeof chunk.byteLength === "number") return chunk.byteLength;
  return 0;
}

// generates a unique identifier key for a transcript group
function groupKey(g) {
  if (!g) return "";
  if (g.id) return String(g.id);
  return String(`${g.createdAt || 0}-${g.seq || 0}-${g.speaker || ""}`);
}

// combines final and partial text of a transcript group into a single string
function groupFullText(g) {
  const finalText = typeof g?.finalText === "string" ? g.finalText : "";
  const partialText = typeof g?.partialText === "string" ? g.partialText : "";
  return `${finalText}${partialText}`;
}

// parses a string to extract a binary answer (0 or 1)
export function parseBinaryAnswer(s) {
  const m = String(s || "").match(/[01]/);
  return m ? Number(m[0]) : 0;
}

// builds a formatted string of recent speaker dialogue starting from a specific cursor
export function buildSpeakerDelta(groups, cursor) {
  const list = Array.isArray(groups) ? groups : [];
  const filtered = list.filter((g) => {
    if (!g) return false;
    if (String(g.translationStatus || "original") !== "original") return false;
    const sp = String(g.speaker || "").trim().toLowerCase();
    if (!sp) return false;
    if (sp === "me") return false;
    return true;
  });

  let startIndex = 0;
  let startOffset = 0;
  if (cursor?.groupKey) {
    const idx = filtered.findIndex((g) => groupKey(g) === cursor.groupKey);
    if (idx >= 0) {
      startIndex = idx;
      startOffset = Math.max(0, Number(cursor.textLen) || 0);
    }
  }

  const lines = [];
  for (let i = startIndex; i < filtered.length; i++) {
    const g = filtered[i];
    let text = groupFullText(g);
    if (i === startIndex && startOffset > 0) {
      text = text.slice(Math.min(startOffset, text.length));
    }
    text = String(text || "").trim();
    if (!text) continue;
    lines.push(`SPEAKER ${String(g.speaker)}: ${text}`);
  }
  return lines.join("\n").trim();
}

// finds the current end position (cursor) in the transcript groups for the other speakers
export function cursorAtEnd(groups) {
  const list = Array.isArray(groups) ? groups : [];
  const filtered = list.filter((g) => {
    if (!g) return false;
    if (String(g.translationStatus || "original") !== "original") return false;
    const sp = String(g.speaker || "").trim().toLowerCase();
    if (!sp) return false;
    if (sp === "me") return false;
    return true;
  });
  const last = filtered[filtered.length - 1];
  if (!last) return { groupKey: "", textLen: 0 };
  return { groupKey: groupKey(last), textLen: groupFullText(last).length };
}

// merges and formats recent conversation history from both system and mic audio, limited by characters
export function buildRecentConversationText(loopbackGroups, micGroups, limitChars = 2000) {
  const sys = (Array.isArray(loopbackGroups) ? loopbackGroups : []).map((g) => ({ ...g, sessionId: "sys" }));
  const mic = (Array.isArray(micGroups) ? micGroups : []).map((g) => ({ ...g, sessionId: "mic" }));
  const merged = [...sys, ...mic].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const lines = [];

  for (const g of merged) {
    if (!g) continue;
    if (String(g.translationStatus || "original") !== "original") continue;
    const text = String(groupFullText(g) || "").trim();
    if (!text) continue;
    const label = g.sessionId === "mic" ? "ME" : `SPEAKER ${String(g.speaker || "").trim()}`;
    lines.push(`${label}: ${text}`);
  }

  const all = lines.join("\n").trim();
  if (all.length <= limitChars) return all;
  return all.slice(all.length - limitChars);
}
