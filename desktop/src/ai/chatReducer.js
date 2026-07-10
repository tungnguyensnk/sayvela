export const CHAT_SOURCES = {
  MANUAL: "manual",
  AUTO: "auto",
};

export const CHAT_STATUSES = {
  STREAMING: "streaming",
  DONE: "done",
  ERROR: "error",
  CANCELLED: "cancelled",
};

export function createChatMessage({ id, role, text, source, status, createdAt, contentReferences }) {
  return {
    id,
    role,
    text: text || "",
    source: source || "",
    status: status || CHAT_STATUSES.DONE,
    createdAt: createdAt || Date.now(),
    contentReferences: Array.isArray(contentReferences) ? contentReferences : [],
  };
}

export function initialChatState() {
  return {
    messages: [],
    active: null,
  };
}

export function chatReducer(state, action) {
  switch (action.type) {
    case "chat/clear": {
      return initialChatState();
    }

    case "chat/start": {
      const { requestId, userMessage, assistantMessage } = action.payload;
      return {
        messages: [...state.messages, userMessage, assistantMessage],
        active: { requestId, assistantMessageId: assistantMessage.id },
      };
    }

    case "chat/append_chunk": {
      const { requestId, delta } = action.payload;
      if (!state.active || state.active.requestId !== requestId) return state;
      const mid = state.active.assistantMessageId;
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (m.id !== mid) return m;
          if (m.status !== CHAT_STATUSES.STREAMING) return m;
          return { ...m, text: (m.text || "") + (delta || "") };
        }),
      };
    }

    case "chat/finish": {
      const { requestId, text, contentReferences } = action.payload;
      if (!state.active || state.active.requestId !== requestId) return state;
      const mid = state.active.assistantMessageId;
      return {
        ...state,
        active: null,
        messages: state.messages.map((m) => {
          if (m.id !== mid) return m;
          return {
            ...m,
            text: text || m.text || "",
            status: CHAT_STATUSES.DONE,
            contentReferences: Array.isArray(contentReferences) ? contentReferences : m.contentReferences || [],
          };
        }),
      };
    }

    case "chat/fail": {
      const { requestId, error } = action.payload;
      if (!state.active || state.active.requestId !== requestId) return state;
      const mid = state.active.assistantMessageId;
      return {
        ...state,
        active: null,
        messages: state.messages.map((m) => {
          if (m.id !== mid) return m;
          return {
            ...m,
            status: CHAT_STATUSES.ERROR,
            text: m.text || "",
            error: String(error || "error"),
          };
        }),
      };
    }

    case "chat/cancel": {
      const { requestId } = action.payload;
      if (!state.active || state.active.requestId !== requestId) return state;
      const mid = state.active.assistantMessageId;
      return {
        ...state,
        active: null,
        messages: state.messages.map((m) => {
          if (m.id !== mid) return m;
          return { ...m, status: CHAT_STATUSES.CANCELLED };
        }),
      };
    }

    default:
      return state;
  }
}

function normalizeSignature(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function shouldSkipAutoSend({ lastSig, lastAtMs, nowMs, cooldownMs }, nextSig) {
  const sig = normalizeSignature(nextSig);
  if (!sig) return true;
  if (!lastSig) return false;
  if (normalizeSignature(lastSig) !== sig) return false;
  if (!lastAtMs) return false;
  const cd = Number(cooldownMs) || 0;
  return nowMs - lastAtMs < cd;
}
