import { useEffect, useRef, useState } from "react";
import { LANGUAGE_LABEL_BY_CODE } from "../../languages";
import { TranscriptGrid } from "./TranscriptGrid";

// main component for displaying transcript segments and managing auto-scroll behavior
export function TranscriptPanel({
  transcriptGroups,
  running,
  onExport,
}) {
  // retrieves the display label for a language code
  const langLabel = (code) => LANGUAGE_LABEL_BY_CODE.get(code) || code;
  const [autoScroll, setAutoScroll] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const scrollRef = useRef(null);
  const autoScrollingRef = useRef(false);

  // smoothly scrolls the transcript view to the bottom
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

  function handleExport(fmt) {
    setShowExportMenu(false);
    onExport?.(fmt);
  }

  return (
    <section className="panel transcript-panel" style={{ marginTop: 16 }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="panel-title">Transcript</div>
          <div className="panel-sub">Real-time conversation</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
          {onExport && transcriptGroups.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExportMenu((v) => !v)}
                style={{ fontSize: 11, padding: "4px 8px" }}
              >
                export ▾
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={() => handleExport("txt")}>Plain Text (.txt)</button>
                  <button onClick={() => handleExport("srt")}>Subtitles (.srt)</button>
                  <button onClick={() => handleExport("json")}>JSON (.json)</button>
                </div>
              )}
            </div>
          )}
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
