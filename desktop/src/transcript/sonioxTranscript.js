import { RealtimeSegmentBuffer, segmentRealtimeTokens } from "@soniox/client";
import { v7 as createId } from "uuid";

const statusOf = (segment) => segment.tokens[0]?.translation_status ?? "original";
const keyOf = (segment) => `${statusOf(segment)}|${segment.speaker ?? "0"}|${segment.language ?? ""}|${segment.start_ms ?? 0}`;

// maps soniox segments to the application transcript contract
export function createTranscriptMapper({ languageHints, targetLanguage, speakerOverride, onText, onTurnEnd, onEndpoint }) {
  const buffers = new Map();
  const activeFinalTokens = new Map();
  const completed = [];
  const identities = new Map();
  const originalsBySpeaker = new Map();
  // speakers whose original tokens arrived since the last endpoint
  const freshSpeakers = new Set();
  const pendingTranslations = [];
  let nextSeq = 1;
  let wallOffset = null;

  const identityFor = (segment) => {
    const key = keyOf(segment);
    if (identities.has(key)) return identities.get(key);
    const status = statusOf(segment);
    const speaker = String(speakerOverride || segment.speaker || "0");
    const last = status === "translation" ? originalsBySpeaker.get(speaker) : null;
    // a translation follows its spoken tokens, so an original closed by the
    // endpoint still owns one only while no newer speech came from that speaker
    const original = last && (!last.closed || !freshSpeakers.has(speaker)) ? last : null;
    const identity = status === "translation"
      ? { id: createId(), seq: original?.seq ?? nextSeq, originId: original?.id ?? null, createdAt: Date.now(), speaker, status }
      : { id: createId(), seq: nextSeq++, originId: null, createdAt: Date.now() };
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
      // wall clock ms when this speech began, for the lag readout
      startAt: wallOffset === null ? null : wallOffset + (segment.start_ms ?? 0),
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

  // emits translations still waiting when the utterance closes; keeping them would
  // let a later, unrelated original of the same speaker adopt them
  const releasePending = () => {
    for (const pending of pendingTranslations.splice(0)) {
      const orphan = { ...pending, seq: nextSeq++ };
      completed.push(orphan);
      onTurnEnd?.(orphan);
    }
  };

  const emitSnapshot = (live = []) => {
    const groups = [...completed, ...live].sort((a, b) => a.seq - b.seq || (a.translationStatus === "original" ? -1 : 1));
    onText?.({ groups });
  };

  // translated tokens carry no timestamps, so the ones that arrive before any
  // new speech are the tail of the utterance the endpoint closed; the first
  // new speech settles them so they do not merge with the next translation
  const settleLateTranslations = () => {
    const buffer = buffers.get("translation");
    if (buffer) buffer.flushAll().filter(allowed).map(toGroup).forEach(emitCompleted);
    activeFinalTokens.delete("translation");
    for (const [key, identity] of identities) if (identity.status === "translation") identities.delete(key);
  };

  // consumes one sdk result and emits stable plus live transcript groups
  const add = (result, offsetMs = 0, clockOffset = null) => {
    if (Number.isFinite(clockOffset)) wallOffset = clockOffset;
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
    const originals = tokensByStatus.get("original") || [];
    if (originals.length && freshSpeakers.size === 0) settleLateTranslations();
    for (const token of originals) freshSpeakers.add(String(speakerOverride || token.speaker || "0"));
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
    // originals first, so a translation always finds the original it follows
    for (const [status, finals] of [...activeFinalTokens].sort(([status]) => status === "original" ? -1 : 1)) {
      const tokens = [...finals, ...(partialTokens.get(status) || [])];
      live.push(...segmentRealtimeTokens(tokens).filter(allowed).map(toGroup));
    }
    emitSnapshot(live);
  };

  // closes the current utterance so later speech starts a new message. the last
  // original of each speaker is kept but marked closed: the translation of the
  // final sentence often lands after the endpoint and must still join it
  const endpoint = () => {
    for (const buffer of buffers.values()) buffer.flushAll().filter(allowed).map(toGroup).forEach(emitCompleted);
    releasePending();
    activeFinalTokens.clear();
    identities.clear();
    for (const identity of originalsBySpeaker.values()) identity.closed = true;
    freshSpeakers.clear();
    emitSnapshot();
    onEndpoint?.();
  };

  return { add, endpoint, finish: endpoint };
}
