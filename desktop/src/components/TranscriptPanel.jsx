import { useEffect, useRef, useState } from "react";
import { LANGUAGE_LABEL_BY_CODE } from "../languages";

function TranscriptBubble({ langLabel, segments, isFinal, isTranslation }) {
  const content =
    Array.isArray(segments) && segments.length > 0 ? (
      segments.map((seg, i) => {
        const finalText = seg.finalText || "";
        const partialText = seg.partialText || "";
        
        let prefixSpace = "";
        let highlightText = partialText;
        if (partialText.startsWith(" ")) {
          prefixSpace = " ";
          highlightText = partialText.slice(1);
        }

        return (
          <span key={seg.id || i}>
            {finalText}
            {prefixSpace}
            {highlightText && <span className="text-partial">{highlightText}</span>}
            {i < segments.length - 1 && <br />}
          </span>
        );
      })
    ) : (
      "-"
    );

  return (
    <div className={`bubble ${isFinal ? "" : "partial"}`}>
      <span className="lang-pill">{langLabel}</span>
      <span className={`bubble-text ${isTranslation ? "translation" : ""}`}>{content}</span>
    </div>
  );
}

function TranscriptGrid({ transcriptGroups, langLabelFn }) {
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
      <div className="empty" style={{ gridColumn: "1 / -1" }}>
        -
      </div>
    );
  }

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

export function TranscriptPanel({
  transcriptGroups,
  running,
}) {
  const langLabel = (code) => LANGUAGE_LABEL_BY_CODE.get(code) || code;
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const autoScrollingRef = useRef(false);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    autoScrollingRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      autoScrollingRef.current = false;
    });
  };

  useEffect(() => {
    if (running) setAutoScroll(true);
  }, [running]);

  useEffect(() => {
    if (!autoScroll) return;
    scrollToBottom();
  }, [autoScroll, transcriptGroups]);

  return (
    <section className="panel transcript-panel" style={{ marginTop: 16 }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="panel-title">Transcript</div>
          <div className="panel-sub">Real-time conversation</div>
        </div>
        <button
          type="button"
          className={`btn btn-secondary ${autoScroll ? "chip-active" : ""}`}
          onClick={() => {
            setAutoScroll((v) => !v);
            if (!autoScroll) requestAnimationFrame(scrollToBottom);
          }}
          style={{ fontSize: 11, padding: "4px 8px" }}
        >
          auto scroll: {autoScroll ? "on" : "off"}
        </button>
      </div>
      <div className="transcript-panel-body" style={{ padding: 12 }}>
        <div
          className="transcript-scroll"
          style={{ marginTop: 0 }}
          ref={scrollRef}
          onScroll={() => {
            if (autoScrollingRef.current) return;
            if (autoScroll) setAutoScroll(false);
          }}
          onWheel={() => {
            if (autoScroll) setAutoScroll(false);
          }}
          onTouchStart={() => {
            if (autoScroll) setAutoScroll(false);
          }}
        >
          <div className="transcript-grid">
            <TranscriptGrid transcriptGroups={transcriptGroups} langLabelFn={langLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}
