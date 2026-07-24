import { RealtimeSegmentBuffer, segmentRealtimeTokens } from "@soniox/client";

const statusOf = (segment) => segment.tokens[0]?.translation_status ?? "original";
const keyOf = (segment) => `${statusOf(segment)}|${segment.speaker ?? "0"}|${segment.language ?? ""}|${segment.start_ms ?? 0}`;

// maps soniox segments to the application transcript contract
export function createTranscriptMapper({ languageHints, targetLanguage, speakerOverride, onText, onTurnEnd }) {
  const buffers = new Map();
  const activeFinalTokens = new Map();
  const completed = [];
  const identities = new Map();
  const originalsBySpeaker = new Map();
  const pendingTranslations = [];
  let nextSeq = 1;

  const identityFor = (segment) => {
    const key = keyOf(segment);
    if (identities.has(key)) return identities.get(key);
    const status = statusOf(segment);
    const speaker = String(speakerOverride || segment.speaker || "0");
    const original = status === "translation" ? originalsBySpeaker.get(speaker) : null;
    const identity = status === "translation"
      ? { id: crypto.randomUUID(), seq: original?.seq ?? nextSeq, originId: original?.id ?? null, createdAt: Date.now(), speaker, status }
      : { id: crypto.randomUUID(), seq: nextSeq++, originId: null, createdAt: Date.now() };
    identities.set(key, identity);
    if (status === "original") {
      originalsBySpeaker.set(speaker, identity);
      for (const candidate of identities.values()) {
        if (candidate.status !== "translation" || candidate.originId || candidate.speaker !== speaker) continue;
        candidate.seq = identity.seq;
        candidate.originId = identity.id;
      }
    }
    return identity;
  };

  const toGroup = (segment) => {
    const identity = identityFor(segment);
    const finalText = segment.tokens.filter((token) => token.is_final).map((token) => token.text).join("");
    const partialText = segment.tokens.filter((token) => !token.is_final).map((token) => token.text).join("");
    return {
      id: identity.id,
      seq: identity.seq,
      originId: identity.originId,
      speaker: String(speakerOverride || segment.speaker || "0"),
      language: segment.language || "",
      translationStatus: statusOf(segment),
      finalText,
      partialText,
      text: finalText + partialText,
      isFinal: !partialText,
      startMs: segment.start_ms ?? 0,
      endMs: segment.end_ms ?? 0,
      createdAt: identity.createdAt,
    };
  };

  const allowed = (segment) => {
    const status = statusOf(segment);
    return status !== "none" && (status === "translation" ? segment.language === targetLanguage : languageHints.includes(segment.language));
  };

  const emitCompleted = (group) => {
    if (group.translationStatus === "translation" && !group.originId) {
      pendingTranslations.push(group);
      return;
    }
    completed.push(group);
    onTurnEnd?.(group);
    if (group.translationStatus !== "original") return;
    for (let i = pendingTranslations.length - 1; i >= 0; i -= 1) {
      const pending = pendingTranslations[i];
      if (pending.speaker !== group.speaker) continue;
      const linked = { ...pending, seq: group.seq, originId: group.id };
      pendingTranslations.splice(i, 1);
      completed.push(linked);
      onTurnEnd?.(linked);
    }
  };

  const emitSnapshot = (live = []) => {
    const groups = [...completed, ...live].sort((a, b) => a.seq - b.seq || (a.translationStatus === "original" ? -1 : 1));
    onText?.({ groups });
  };

  // consumes one sdk result and emits stable plus live transcript groups
  const add = (result, offsetMs = 0) => {
    const tokensByStatus = new Map();
    for (const sourceToken of result.tokens || []) {
      const token = {
        ...sourceToken,
        start_ms: (sourceToken.start_ms ?? 0) + offsetMs,
        end_ms: (sourceToken.end_ms ?? 0) + offsetMs,
      };
      const status = token.translation_status ?? "original";
      if (!tokensByStatus.has(status)) tokensByStatus.set(status, []);
      tokensByStatus.get(status).push(token);
    }
    const partialTokens = new Map();
    const streams = [...tokensByStatus].sort(([status]) => status === "original" ? -1 : 1);
    for (const [status, tokens] of streams) {
      if (!buffers.has(status)) buffers.set(status, new RealtimeSegmentBuffer({ final_only: true }));
      if (!activeFinalTokens.has(status)) activeFinalTokens.set(status, []);
      const scoped = { ...result, tokens };
      const finals = tokens.filter((token) => token.is_final);
      activeFinalTokens.get(status).push(...finals);
      partialTokens.set(status, tokens.filter((token) => !token.is_final));
      const stable = buffers.get(status).add(scoped).filter(allowed);
      const stableTokenCount = stable.reduce((total, segment) => total + segment.tokens.length, 0);
      if (stableTokenCount) activeFinalTokens.set(status, activeFinalTokens.get(status).slice(stableTokenCount));
      stable.map(toGroup).forEach(emitCompleted);
    }
    const live = [];
    for (const [status, finals] of activeFinalTokens) {
      const tokens = [...finals, ...(partialTokens.get(status) || [])];
      live.push(...segmentRealtimeTokens(tokens).filter(allowed).map(toGroup));
    }
    emitSnapshot(live);
  };

  // closes the current utterance so later speech starts a new message
  const endpoint = () => {
    for (const buffer of buffers.values()) buffer.flushAll().filter(allowed).map(toGroup).forEach(emitCompleted);
    activeFinalTokens.clear();
    identities.clear();
    originalsBySpeaker.clear();
    emitSnapshot();
  };

  return { add, endpoint, finish: endpoint };
}
