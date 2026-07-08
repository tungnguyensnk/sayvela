import { TranscriptBubble } from "./TranscriptBubble";

export function TranscriptGrid({ transcriptGroups, langLabelFn }) {
  const groups = Array.isArray(transcriptGroups) ? transcriptGroups : [];
  
  // 1. Group by Session+Seq to form "Turns"
  const turnsMap = new Map();
  for (const g of groups) {
    const key = `${g.sessionId || 'unknown'}-${g.seq}`;
    if (!turnsMap.has(key)) {
      turnsMap.set(key, {
        key,
        sessionId: g.sessionId,
        seq: g.seq,
        createdAt: g.createdAt || 0,
        segments: []
      });
    }
    const turn = turnsMap.get(key);
    turn.segments.push(g);
    // Keep earliest timestamp for sorting
    if (g.createdAt && g.createdAt < turn.createdAt) {
      turn.createdAt = g.createdAt;
    }
  }

  // 2. Sort turns by time
  const turns = Array.from(turnsMap.values()).sort((a, b) => a.createdAt - b.createdAt);

  if (turns.length === 0) {
    return (
      <div className="empty transcript-empty">
        -
      </div>
    );
  }

  // extracts language label and finalization status from a list of segments
  const bubbleMeta = (list) => {
    if (!Array.isArray(list) || list.length === 0) return { langLabel: "-", isFinal: true };
    const lang = list.length === 1 ? list[0]?.language : "";
    return {
      langLabel: langLabelFn?.(lang) || lang || "-",
      isFinal: list.every((g) => Boolean(g?.isFinal)),
    };
  };

  return turns.map((turn) => {
    const row = turn.segments;
    const original = row.filter((g) => g.translationStatus === "original");
    const translated = row.filter((g) => g.translationStatus !== "original");
    
    // Determine speaker label
    let speakerLabel = "SPEAKER ?";
    const rawSpeaker = String(original[0]?.speaker ?? row[0]?.speaker ?? "0");
    
    if (turn.sessionId === 'mic') {
      speakerLabel = "ME";
    } else {
      speakerLabel = `SPEAKER ${rawSpeaker}`;
    }

    const oMeta = bubbleMeta(original);
    const tMeta = bubbleMeta(translated);

    return (
      <div key={turn.key} className="tr-row">
        <div className="tr-col">
          <div className="speaker-label">{speakerLabel}</div>
          <TranscriptBubble
            langLabel={oMeta.langLabel}
            segments={original}
            isFinal={oMeta.isFinal}
            isTranslation={false}
          />
        </div>
        <div className="tr-col">
          <div className="speaker-label">{speakerLabel}</div>
          <TranscriptBubble
            langLabel={tMeta.langLabel}
            segments={translated}
            isFinal={tMeta.isFinal}
            isTranslation={true}
          />
        </div>
      </div>
    );
  });
}
