import { useState } from "react";
import { ActionButton } from "../astryx/AstryxControls";
import { SessionDetailModal } from "./SessionDetailModal";
import "./SessionsPanel.css";

// formats duration in seconds to readable string (e.g. "5m 30s")
function formatDuration(sec) {
  if (!sec) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// formats ISO date string to short locale date
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// displays past sessions with status, timing, modal details and delete action
export function SessionsPanel({ sessions, loading, error, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const handleOpenKeyDown = (event, session) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelectedSession(session);
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setConfirmId(null);
  };

  return (
    <div className="sesp panel">
      <div className="panel-header">
        <span className="panel-title">Sessions</span>
      </div>

      <div className="sesp-body">
        {loading && <div className="sesp-empty">Loading…</div>}
        {error && <div className="sesp-empty sesp-error">{error}</div>}
        {!loading && !error && sessions.length === 0 && (
          <div className="sesp-empty">No sessions yet.</div>
        )}
        {!loading && !error && sessions.map((s) => (
          <div
            key={s.id}
            className="sesp-item"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedSession(s)}
            onKeyDown={(event) => handleOpenKeyDown(event, s)}
          >
            <div className="sesp-item-content">
              <div className="sesp-item-topline">
                <span className="sesp-item-title">{s.title ?? "Untitled"}</span>
              </div>
              <div className="sesp-item-meta">
                <span className={`sesp-status sesp-status-${s.status || "unknown"}`}>{s.status || "unknown"}</span>
                <span>⏱ {formatDuration(s.durationSeconds)}</span>
                <span>{formatDate(s.createdAt)}</span>
              </div>
              {s.summary && <p className="sesp-item-summary">{s.summary}</p>}
            </div>
            <div className="sesp-item-actions" onClick={(e) => e.stopPropagation()}>
              {confirmId === s.id ? (
                <>
                  <ActionButton className="sesp-tiny-btn" onClick={() => handleDelete(s.id)} size="sm" variant="destructive">Confirm</ActionButton>
                  <ActionButton className="sesp-tiny-btn sesp-tiny-btn-cancel" onClick={() => setConfirmId(null)} size="sm">Cancel</ActionButton>
                </>
              ) : (
                <ActionButton className="sesp-tiny-btn" onClick={() => setConfirmId(s.id)} size="sm" variant="destructive">Delete</ActionButton>
              )}
            </div>
          </div>
        ))}
      </div>
      <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    </div>
  );
}
