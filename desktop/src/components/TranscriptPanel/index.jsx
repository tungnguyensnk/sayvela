import { useEffect, useRef, useState } from "react";
import { ActionButton } from "../astryx/AstryxControls";
import { TranscriptGrid } from "./TranscriptGrid";

// main component for displaying transcript segments and managing auto-scroll behavior
export function TranscriptPanel({
  transcriptGroups,
  running,
  loopbackStatus,
  loopbackBytes,
  micStatus,
  micBytes,
  titleAction,
  speech,
}) {
  // retrieves compact language code for transcript pills
  const langLabel = (code) => code || "-";
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingSince, setStreamingSince] = useState({ loopback: 0, mic: 0 });
  const scrollRef = useRef(null);
  const autoScrollingRef = useRef(false);

  // formats byte counts into compact kilobyte labels
  const kbLabel = (bytes) => `${Math.round((bytes || 0) / 1024)} KB`;

  // returns stream status until one second passes, then returns kilobyte count
  const statusLabel = (key, status, bytes) => {
    if (status !== "streaming") return status;
    const since = streamingSince[key];
    return since && Date.now() - since >= 1000 ? kbLabel(bytes) : status;
  };

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
    setStreamingSince((current) => ({
      loopback: loopbackStatus === "streaming" ? current.loopback || Date.now() : 0,
      mic: micStatus === "streaming" ? current.mic || Date.now() : 0,
    }));
  }, [loopbackStatus, micStatus]);

  useEffect(() => {
    if (loopbackStatus !== "streaming" && micStatus !== "streaming") return undefined;
    const timer = setInterval(() => setStreamingSince((current) => ({ ...current })), 250);
    return () => clearInterval(timer);
  }, [loopbackStatus, micStatus]);

  useEffect(() => {
    if (!autoScroll) return;
    scrollToBottom();
  }, [autoScroll, transcriptGroups]);

  return (
    <section className="panel transcript-panel">
      <div className="panel-header transcript-panel-header">
        <div className="transcript-title-row">
          <div className="panel-title">Transcript</div>
          {titleAction}
          <div className="transcript-status-row">
            {loopbackStatus && <span className="status-badge">Sys: {statusLabel("loopback", loopbackStatus, loopbackBytes)}</span>}
            {micStatus && <span className="status-badge">Mic: {statusLabel("mic", micStatus, micBytes)}</span>}
          </div>
        </div>
        <div className="transcript-actions">
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
            <TranscriptGrid transcriptGroups={transcriptGroups} langLabelFn={langLabel} speech={speech} />
          </div>
        </div>
      </div>
    </section>
  );
}
