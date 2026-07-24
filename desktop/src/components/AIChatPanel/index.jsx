import { useEffect, useMemo, useRef } from "react";
import { ActionButton, ActionIconButton } from "../astryx/AstryxControls";
import { ChatMessageContent } from "./ChatMessageContent";
import "./AIChatPanel.css";

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

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
  const inputRef = useRef(null);
  const lastMessage = messages?.[messages.length - 1];
  const scrollKey = lastMessage ? `${lastMessage.id}:${lastMessage.status}:${lastMessage.text?.length ?? 0}` : "";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [scrollKey]);

  const canSend = useMemo(() => {
    return Boolean((input || "").trim());
  }, [input]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "20px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 20), 80)}px`;
  }, [input]);

  return (
    <section className="panel ai-chat-panel">
      <div className="panel-header ai-chat-header">
        <div className="ai-chat-title-wrap">
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
        </div>
      </div>

      <div className="ai-chat-body">
        <div className="ai-chat-scroll" ref={scrollRef}>
          {messages?.length ? (
            <div className="ai-chat-list">
              {messages.map((m) => (
                <div key={m.id} className={`ai-msg-row ai-msg-row-${m.role}`}>
                  <div className={`ai-msg ai-msg-${m.role}`}>
                  <div className="ai-msg-meta">
                    <span className="ai-msg-role">{m.role === "user" ? "you" : "assistant"}</span>
                    {m.status === "streaming" ? (
                      <span className="ai-msg-status" aria-label={m.status} title={m.status} />
                    ) : null}
                    {m.createdAt ? <span className="ai-msg-time">{formatTime(m.createdAt)}</span> : null}
                  </div>
                  <div className="ai-msg-text">
                    <ChatMessageContent text={m.text || ""} contentReferences={m.contentReferences} isStreaming={m.status === "streaming"} />
                  </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">✦</div>
              <div className="ai-chat-empty-title">ready to chat</div>
            </div>
          )}
        </div>

        <div className="ai-chat-input-row">
          <div className="ai-chat-input-shell">
            <textarea
              ref={inputRef}
              className="ai-chat-input"
              value={input || ""}
              placeholder="Type a message..."
              onChange={(e) => onChangeInput?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming && canSend) onSend?.();
                }
              }}
              rows={1}
            />
          </div>
          <ActionIconButton
            type="button"
            className={`ai-chat-send${isStreaming ? " ai-chat-stop" : ""}`}
            label={isStreaming ? "stop" : "send"}
            onClick={isStreaming ? onCancel : onSend}
            disabled={!isStreaming && !canSend}
            variant="primary"
            icon={isStreaming ? <StopIcon /> : <SendIcon />}
          />
        </div>
      </div>
    </section>
  );
}
