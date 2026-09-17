import { useEffect, useRef, useState } from "react";
import { ActionButton } from "../astryx/AstryxControls";
import { TranscriptGrid } from "./TranscriptGrid";

// how far from the bottom still counts as following the conversation
const NEAR_BOTTOM_PX = 24;

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
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingSince, setStreamingSince] = useState({ loopback: 0, mic: 0 });
  const scrollRef = useRef(null);

  // formats byte counts into compact kilobyte labels
  const kbLabel = (bytes) => `${Math.round((bytes || 0) / 1024)} KB`;

  // returns stream status until one second passes, then returns kilobyte count
  const statusLabel = (key, status, bytes) => {
    if (status !== "streaming") return status;
    const since = streamingSince[key];
    return since && Date.now() - since >= 1000 ? kbLabel(bytes) : status;
  };

  // scrolls the transcript view to the bottom
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // auto scroll always parks the view at the bottom, so sitting away from it can
  // only be the result of the reader scrolling inside the transcript themselves
  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
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
        <div className="panel-title">Transcript</div>
        {titleAction}
        <div className="transcript-meters">
          {loopbackStatus && <span className="tr-meter">SYS {statusLabel("loopback", loopbackStatus, loopbackBytes)}</span>}
          {micStatus && <span className="tr-meter">MIC {statusLabel("mic", micStatus, micBytes)}</span>}
        </div>
      </div>
      <div className="transcript-panel-body">
        <div
          className="transcript-scroll"
          ref={scrollRef}
          onScroll={() => {
            if (autoScroll && !isNearBottom()) setAutoScroll(false);
          }}
          onWheel={(e) => {
            // scrolling up inside the transcript means the reader wants to look back
            if (autoScroll && e.deltaY < 0) setAutoScroll(false);
          }}
        >
          <div className="transcript-grid">
            <div className="transcript-spacer" />
            <TranscriptGrid transcriptGroups={transcriptGroups} speech={speech} />
          </div>
        </div>
        <div className="transcript-footer">
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
    </section>
  );
}
