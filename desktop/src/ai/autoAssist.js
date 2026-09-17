export const FRAME_KINDS = ["qa", "guide", "code"];
export const FRAME_TOOLS = {
  suggest_answer: "qa",
  guide_steps: "guide",
  show_code: "code",
};
// one slot per kind: answer, how-to and code can all be open together
export const MAX_SLOTS = FRAME_KINDS.length;

const SELF_LABEL = "Tôi";

function labelOf(group) {
  if (group.sessionId === "mic" || group.speaker === "me") return SELF_LABEL;
  const speaker = String(group.speaker ?? "").trim();
  return speaker && speaker !== "0" ? `Người khác ${speaker}` : "Người khác";
}

// builds the transcript snippet sent to the gate and assist models
export function buildTranscriptWindow(groups, { maxAgeMs = 90_000, maxItems = 12, now = Date.now() } = {}) {
  const usable = (Array.isArray(groups) ? groups : [])
    .filter((g) => g?.isFinal && g?.translationStatus === "original")
    .filter((g) => (g.finalText || g.text || "").trim())
    .filter((g) => !g.createdAt || now - g.createdAt <= maxAgeMs)
    .slice(-maxItems);
  return {
    text: usable.map((g) => `[${labelOf(g)}] ${(g.finalText || g.text).trim()}`).join("\n"),
    lastId: usable[usable.length - 1]?.id || "",
    count: usable.length,
  };
}

// condenses one assist turn into a short assistant line reused as history
export function summarizeTurn(toolCalls = [], text = "") {
  const parts = toolCalls.map(({ name, args }) => {
    if (name === "suggest_answer") return `[suggest_answer] ${args?.question || ""}`;
    if (name === "guide_steps") return `[guide_steps] ${args?.goal || ""}`;
    if (name === "show_code") return `[show_code] ${args?.title || ""}`;
    if (name === "close_frame") return `[close_frame] ${args?.kind || ""}`;
    return `[${name}]`;
  });
  if (text.trim()) parts.push(text.trim());
  return parts.join(" | ").slice(0, 600);
}

// picks the panel slot for a kind: existing, then free, then least recently used
export function pickSlot(slots, frames, kind) {
  const existing = slots.findIndex((s) => s === kind);
  if (existing >= 0) return existing;
  const free = slots.findIndex((s) => !s);
  if (free >= 0) return free;
  const updatedAt = (index) => frames?.[slots[index]]?.updatedAt ?? 0;
  return updatedAt(0) <= updatedAt(1) ? 0 : 1;
}

export function nextBackoff(ms, base = 5_000, max = 30_000) {
  return Math.min(ms ? ms * 2 : base, max);
}
