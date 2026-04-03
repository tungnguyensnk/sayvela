import { useEffect, useMemo, useRef } from "react";
import "./AIChatPanel.css";

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function AIChatPanel({
  messages,
  input,
  onChangeInput,
  onSend,
  onCancel,
  onClear,
  isStreaming,
}) {
  const scrollRef = useRef(null);
  const lastMessageId = messages?.length ? messages[messages.length - 1].id : "";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastMessageId]);

  const canSend = useMemo(() => {
    return Boolean((input || "").trim());
  }, [input]);

  return (
    <section className="panel ai-chat-panel" style={{ marginTop: 16 }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">AI Chat</div>
          <div className="panel-sub">Manual + auto answers</div>
        </div>

        <div className="ai-chat-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={!messages?.length}
            style={{ fontSize: 11, padding: "4px 8px", height: 28 }}
          >
            clear
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={!isStreaming}
            style={{ fontSize: 11, padding: "4px 8px", height: 28 }}
          >
            cancel
          </button>
        </div>
      </div>

      <div className="ai-chat-body">
        <div className="ai-chat-scroll" ref={scrollRef}>
          {messages?.length ? (
            <div className="ai-chat-list">
              {messages.map((m) => (
                <div key={m.id} className={`ai-msg ai-msg-${m.role}`}>
                  <div className="ai-msg-meta">
                    <span className="ai-msg-role">{m.role}</span>
                    {m.source ? <span className="ai-msg-source">{m.source}</span> : null}
                    {m.status && m.status !== "done" ? (
                      <span className="ai-msg-status">{m.status}</span>
                    ) : null}
                    {m.createdAt ? <span className="ai-msg-time">{formatTime(m.createdAt)}</span> : null}
                  </div>
                  <div className="ai-msg-text">{m.text || ""}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">chat is ready. type a message, or wait for auto question detection.</div>
          )}
        </div>

        <div className="ai-chat-input-row">
          <textarea
            className="ai-chat-input"
            value={input || ""}
            placeholder="type a message..."
            onChange={(e) => onChangeInput?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend?.();
              }
            }}
            rows={2}
          />
          <button
            type="button"
            className="btn btn-primary ai-chat-send"
            onClick={onSend}
            disabled={!canSend}
          >
            send
          </button>
        </div>
      </div>
    </section>
  );
}

