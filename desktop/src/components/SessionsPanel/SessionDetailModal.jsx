import { useEffect, useMemo, useState } from "react";
import { CommonModal } from "../CommonModal";
import { TranscriptGrid } from "../TranscriptPanel/TranscriptGrid";
import { getSession } from "../../services/apiClient";

// maps persisted segments by ordering originals first and attaching translations by origin_id
function toTranscriptGroups(detail) {
  const segments = detail?.segments || [];
  const originals = segments
    .filter((seg) => !seg.originId)
    .sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || String(a.id).localeCompare(String(b.id)));
  const translationsByOrigin = new Map();
  for (const seg of segments) {
    if (!seg.originId) continue;
    const key = String(seg.originId);
    const list = translationsByOrigin.get(key) || [];
    list.push(seg);
    translationsByOrigin.set(key, list);
  }
  return originals.flatMap((original, index) => {
    const base = {
      sessionId: original.source === "mic" ? "mic" : "loopback",
      seq: index,
      speaker: original.speaker || "0",
      partialText: "",
      isFinal: true,
      createdAt: original.startMs ?? index,
    };
    const translations = (translationsByOrigin.get(String(original.id)) || [])
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || String(a.id).localeCompare(String(b.id)));
    return [
      {
        ...base,
        id: original.id,
        language: original.language || "",
        translationStatus: "original",
        finalText: original.text || "",
      },
      ...translations.map((translation) => ({
        ...base,
        id: translation.id,
        language: translation.language || "",
        translationStatus: "translation",
        finalText: translation.text || "",
      })),
    ];
  });
}

// renders read-only session summary and transcript segments in the shared modal shell
export function SessionDetailModal({ session, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!session?.id) {
      setDetail(null);
      setError(null);
      return () => { cancelled = true; };
    }
    setDetail(session);
    setLoading(true);
    setError(null);
    getSession(session.id)
      .then((data) => { if (!cancelled) setDetail(data || session); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session]);

  const active = detail || session;
  const transcriptGroups = useMemo(() => toTranscriptGroups(active), [active]);

  return (
    <CommonModal
      open={Boolean(session)}
      title={active?.title ?? "Untitled"}
      onClose={onClose}
      className="sesp-detail-modal"
    >
      {active && (
        <>
          <div className="sesp-summary-box">
            <span className="sesp-summary-label">Summary</span>
            <p>{active.summary || "No summary yet."}</p>
          </div>
          <div className="sesp-segments-box">
            <div className="sesp-segments-head">
              <span>Transcript</span>
              {loading && <small>Loading…</small>}
              {error && <small className="sesp-error-text">{error}</small>}
            </div>
            <div className="transcript-grid sesp-transcript-grid">
              <TranscriptGrid transcriptGroups={transcriptGroups} langLabelFn={(lang) => lang || "-"} />
            </div>
          </div>
        </>
      )}
    </CommonModal>
  );
}
