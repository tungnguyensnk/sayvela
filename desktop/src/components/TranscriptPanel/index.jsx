import { useEffect, useRef, useState } from "react";
import { LANGUAGE_LABEL_BY_CODE } from "../../languages";
import { ActionButton } from "../astryx/AstryxControls";
import { TranscriptGrid } from "./TranscriptGrid";

// main component for displaying transcript segments and managing auto-scroll behavior
export function TranscriptPanel({
  transcriptGroups,
  running,
  onExport,
  loopbackStatus,
  micStatus,
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
    <section className="panel transcript-panel">
      <div className="panel-header transcript-panel-header">
        <div className="transcript-title-row">
          <div className="panel-title">Transcript</div>
          <div className="transcript-status-row">
            {loopbackStatus && <span className="status-badge">Sys: {loopbackStatus}</span>}
            {micStatus && <span className="status-badge">Mic: {micStatus}</span>}
          </div>
        </div>
        <div className="transcript-actions">
          {onExport && transcriptGroups.length > 0 && (
            <div className="export-wrap">
              <ActionButton
                type="button"
                className="transcript-action-btn"
                onClick={() => setShowExportMenu((v) => !v)}
                size="sm"
              >
                export ▾
              </ActionButton>
              {showExportMenu && (
                <div className="export-menu">
                  <ActionButton className="export-menu-item" onClick={() => handleExport("txt")} size="sm" variant="ghost">Plain Text (.txt)</ActionButton>
                  <ActionButton className="export-menu-item" onClick={() => handleExport("srt")} size="sm" variant="ghost">Subtitles (.srt)</ActionButton>
                  <ActionButton className="export-menu-item" onClick={() => handleExport("json")} size="sm" variant="ghost">JSON (.json)</ActionButton>
                </div>
              )}
            </div>
          )}
          <ActionButton
            type="button"
            className={`transcript-action-btn ${autoScroll ? "chip-active" : ""}`}
            onClick={() => {
              setAutoScroll((v) => !v);
              if (!autoScroll) requestAnimationFrame(scrollToBottom);
            }}
            size="sm"
          >
            auto scroll: {autoScroll ? "on" : "off"}
          </ActionButton>
        </div>
      </div>
      <div className="transcript-panel-body">
        <div
          className="transcript-scroll"
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
