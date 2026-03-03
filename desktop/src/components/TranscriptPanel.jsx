import { useEffect, useRef, useState } from "react";

function TranscriptControls({ languages, inputLanguages, onToggleInputLanguage, outputLanguage, onOutputLanguageChange, running }) {
  return (
    <div className="transcript-controls">
      <div className="field" style={{ marginBottom: 0 }}>
        <div className="label">Ngôn ngữ vào</div>
        <div className="chips">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`chip ${inputLanguages.includes(l.code) ? "chip-active" : ""}`}
              disabled={running}
              onClick={() => onToggleInputLanguage?.(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <div className="label">Ngôn ngữ ra</div>
        <div className="row">
          <select
            className="select"
            value={outputLanguage}
            disabled={running}
            onChange={(e) => onOutputLanguageChange?.(e.target.value)}
          >
            <option value="">(tắt dịch)</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({ langLabel, text, isFinal, isTranslation }) {
  return (
    <div className={`bubble ${isFinal ? "" : "partial"}`}>
      <span className="lang-pill">{langLabel}</span>
      <span className={`bubble-text ${isTranslation ? "translation" : ""}`}>{text || "-"}</span>
    </div>
  );
}

function TranscriptGrid({ transcriptGroups, langLabelFn }) {
  const groups = Array.isArray(transcriptGroups) ? transcriptGroups : [];
  const ordered = [...groups].sort((a, b) => (Number(a?.seq) || 0) - (Number(b?.seq) || 0));
  if (ordered.length === 0) {
    return (
      <div className="empty" style={{ gridColumn: "1 / -1" }}>
        -
      </div>
    );
  }

  const bySeq = new Map();
  for (const g of ordered) {
    const seq = Number(g?.seq) || 0;
    if (!bySeq.has(seq)) bySeq.set(seq, []);
    bySeq.get(seq).push(g);
  }
  const seqs = Array.from(bySeq.keys()).sort((a, b) => a - b);

  return seqs.map((seq) => {
    const row = bySeq.get(seq) || [];
    const original = row.filter((g) => g.translationStatus === "original");
    const translated = row.filter((g) => g.translationStatus !== "original");
    const speaker = String(original[0]?.speaker ?? row[0]?.speaker ?? "0");

    const joinText = (list) => {
      const s = list.map((g) => String(g?.text || "")).join("\n").trim();
      return s || "-";
    };
    const bubbleMeta = (list) => {
      if (!Array.isArray(list) || list.length === 0) return { langLabel: "-", isFinal: true };
      const lang = list.length === 1 ? list[0]?.language : "";
      return { langLabel: langLabelFn?.(lang) || lang || "-", isFinal: list.every((g) => Boolean(g?.isFinal)) };
    };

    const oMeta = bubbleMeta(original);
    const tMeta = bubbleMeta(translated);

    return (
      <div key={seq} className="tr-row">
        <div className="tr-col">
          <div className="speaker-label">SPEAKER {speaker}</div>
          <TranscriptBubble langLabel={oMeta.langLabel} text={joinText(original)} isFinal={oMeta.isFinal} isTranslation={false} />
        </div>
        <div className="tr-col">
          <div className="speaker-label">SPEAKER {speaker}</div>
          <TranscriptBubble langLabel={tMeta.langLabel} text={joinText(translated)} isFinal={tMeta.isFinal} isTranslation={true} />
        </div>
      </div>
    );
  });
}

export function TranscriptPanel({
  transcript,
  running,
  inputLanguages,
  onToggleInputLanguage,
  outputLanguage,
  onOutputLanguageChange,
}) {
  const languages = [
    { code: "vi", label: "Vietnamese" },
    { code: "en", label: "English" },
    { code: "ja", label: "Japanese" },
  ];
  const langLabel = (code) => languages.find((l) => l.code === code)?.label || code;
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
  }, [autoScroll, transcript?.groups?.length]);

  return (
    <section className="panel transcript-panel" style={{ marginTop: 16 }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">Transcript</div>
          <div className="panel-sub">soniox websocket</div>
        </div>
      </div>
      <div className="transcript-panel-body" style={{ padding: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="small">
            status: {transcript?.status || "-"} {transcript?.error ? `(${transcript.error})` : ""}
          </div>
          <button
            type="button"
            className={`btn btn-secondary ${autoScroll ? "chip-active" : ""}`}
            onClick={() => {
              setAutoScroll((v) => !v);
              if (!autoScroll) requestAnimationFrame(scrollToBottom);
            }}
          >
            auto scroll: {autoScroll ? "on" : "off"}
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <TranscriptControls
            languages={languages}
            inputLanguages={inputLanguages}
            onToggleInputLanguage={onToggleInputLanguage}
            outputLanguage={outputLanguage}
            onOutputLanguageChange={onOutputLanguageChange}
            running={running}
          />
        </div>

        <div
          className="transcript-scroll"
          style={{ marginTop: 12 }}
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
            <TranscriptGrid transcriptGroups={transcript?.groups} langLabelFn={langLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}
