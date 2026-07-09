import { useEffect, useMemo, useRef } from "react";
import { ActionButton } from "../astryx/AstryxControls";
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
    <section className="panel ai-chat-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">AI Chat</div>
        </div>

        <div className="ai-chat-actions">
          <ActionButton
            type="button"
            className="ai-chat-action-btn"
            onClick={onClear}
            disabled={!messages?.length}
            size="sm"
          >
            clear
          </ActionButton>

          <ActionButton
            type="button"
            className="ai-chat-action-btn"
            onClick={onCancel}
            disabled={!isStreaming}
            size="sm"
          >
            cancel
          </ActionButton>
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
          <ActionButton
            type="button"
            className="ai-chat-send"
            onClick={onSend}
            disabled={!canSend}
            variant="primary"
          >
            send
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
