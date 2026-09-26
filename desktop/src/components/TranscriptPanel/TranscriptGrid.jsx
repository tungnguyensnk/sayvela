import { useEffect, useState } from "react";
import { TranscriptBubble } from "./TranscriptBubble";

// a sentence the voice has not reached after this long is not coming (muted,
// passed through), so its counter stops
const WAIT_LIMIT_MS = 15_000;

// seconds from the moment you began the sentence to the moment the voice began
// it; counts up live until then
function LagLabel({ startAt, spokenAt }) {
  const [now, setNow] = useState(Date.now());
  const waiting = Boolean(startAt) && !spokenAt && Date.now() - startAt < WAIT_LIMIT_MS;
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [waiting]);
  const end = spokenAt || (waiting ? now : null);
  if (!startAt || !end) return null;
  return <span className="tr-lag">{((end - startAt) / 1000).toFixed(1)}s</span>;
}

// formats the clock label shown next to a speaker
function timeLabel(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// groups raw segments into turns ordered from oldest to newest
export function toTurns(groups) {
  const turnsMap = new Map();
  for (const g of groups) {
    const key = `${g.sessionId || "unknown"}-${g.seq}`;
    if (!turnsMap.has(key)) {
      turnsMap.set(key, { key, sessionId: g.sessionId, createdAt: g.createdAt || 0, segments: [] });
    }
    const turn = turnsMap.get(key);
    turn.segments.push(g);
    if (g.createdAt && g.createdAt < turn.createdAt) turn.createdAt = g.createdAt;
  }
  return Array.from(turnsMap.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function TranscriptGrid({ transcriptGroups, speech }) {
  const turns = toTurns(Array.isArray(transcriptGroups) ? transcriptGroups : []);
  if (turns.length === 0) return null;

  return turns.map((turn, index) => {
    const original = turn.segments.filter((g) => g.translationStatus === "original");
    const translated = turn.segments.filter((g) => g.translationStatus !== "original");
    const isMe = turn.sessionId === "mic";
    // the original always stays on top, but the line the reader actually
    // understands gets the big type: their own words, or the translation.
    // this does not wait for the translation to arrive, so the type never jumps
    const leadIsTranslation = !isMe || !original.length;
    const speaker = String(original[0]?.speaker ?? turn.segments[0]?.speaker ?? "0");
    const live = turn.segments.some((g) => !g.isFinal);
    const latest = index === turns.length - 1;
    // when the voice first reached any part of this turn's translation
    const spokenAt = Math.min(...translated.map((g) => speech?.spokenAt?.get(g.id) ?? Infinity));

    return (
      <div
        key={turn.key}
        className={`tr-turn${latest ? " tr-turn--latest" : ""}${isMe ? " tr-turn--me" : ""}`}
      >
        <div className="tr-turn-meta">
          <span className="tr-speaker">{isMe ? "ME" : `SPEAKER ${speaker}`}</span>
          <span className="tr-time">{live ? "đang nói" : timeLabel(turn.createdAt)}</span>
          {isMe && speech ? (
            <LagLabel startAt={original[0]?.startAt} spokenAt={Number.isFinite(spokenAt) ? spokenAt : null} />
          ) : null}
        </div>
        {original.length ? (
          <div className={leadIsTranslation ? "tr-sub" : "tr-lead"}>
            <TranscriptBubble segments={original} isFinal={original.every((g) => g.isFinal)} />
          </div>
        ) : null}
        {translated.length ? (
          <div className={leadIsTranslation ? "tr-lead" : "tr-sub"}>
            <TranscriptBubble
              segments={translated}
              isFinal={translated.every((g) => g.isFinal)}
              isTranslation
              speech={speech}
            />
          </div>
        ) : null}
      </div>
    );
  });
}
