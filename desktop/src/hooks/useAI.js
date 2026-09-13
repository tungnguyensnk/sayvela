import { useRef, useCallback, useReducer, useState } from "react";
import { sendMessage as aiSendMessage } from "../services/aiService.js";
import {
  chatReducer,
  initialChatState,
  createChatMessage,
  CHAT_SOURCES,
  CHAT_STATUSES,
} from "../ai/chatReducer.js";

// builds the openai-style history from completed messages in the panel
function toHistory(messages) {
  return messages
    .filter((m) => m.status === CHAT_STATUSES.DONE && m.text)
    .map((m) => ({ role: m.role, content: m.text }));
}

export function useAI() {
  const aiDidInitRef = useRef(false);
  const abortRef = useRef({ controller: null, requestId: "" });
  const [chat, dispatch] = useReducer(chatReducer, undefined, initialChatState);
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;
  const [input, setInput] = useState("");

  const cancelActive = useCallback(() => {
    if (!abortRef.current.controller) return;
    const rid = abortRef.current.requestId;
    abortRef.current.controller.abort();
    abortRef.current = { controller: null, requestId: "" };
    if (rid) dispatch({ type: "chat/cancel", payload: { requestId: rid } });
  }, []);

  const resetAI = useCallback(async () => {
    cancelActive();
    aiDidInitRef.current = false;
  }, [cancelActive]);

  const initAI = useCallback(async () => {
    aiDidInitRef.current = true;
  }, []);

  const sendPlainMessage = useCallback(
    async ({ text, source }) => {
      const messageText = String(text || "").trim();
      if (!messageText) return;
      if (abortRef.current.controller) cancelActive();

      const history = toHistory(messagesRef.current);
      const requestId = `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const userMessage = createChatMessage({
        id: `u-${requestId}`,
        role: "user",
        text: messageText,
        source,
        status: CHAT_STATUSES.DONE,
      });
      const assistantMessage = createChatMessage({
        id: `a-${requestId}`,
        role: "assistant",
        text: "",
        source,
        status: CHAT_STATUSES.STREAMING,
      });
      dispatch({
        type: "chat/start",
        payload: { requestId, userMessage, assistantMessage },
      });

      const controller = new AbortController();
      abortRef.current = { controller, requestId };

      try {
        await aiSendMessage(
          [...history, { role: "user", content: messageText }],
          (payload) => {
            if (controller.signal.aborted) return;
            const { event, data } = payload || {};
            if (event === "chunk") {
              const delta = data?.delta ?? "";
              if (delta) {
                dispatch({ type: "chat/append_chunk", payload: { requestId, delta } });
              }
            } else if (event === "result") {
              dispatch({ type: "chat/finish", payload: { requestId, text: data?.response ?? "" } });
            }
          },
          { signal: controller.signal, requestId }
        );
      } catch (e) {
        if (controller.signal.aborted || e?.name === "AbortError") {
          dispatch({ type: "chat/cancel", payload: { requestId } });
          return;
        }
        dispatch({ type: "chat/fail", payload: { requestId, error: e } });
        throw e;
      } finally {
        if (abortRef.current.requestId === requestId) {
          abortRef.current = { controller: null, requestId: "" };
        }
      }
    },
    [cancelActive]
  );

  const sendManual = useCallback(async () => {
    const text = String(input || "").trim();
    if (!text) return;
    setInput("");
    return sendPlainMessage({ text, source: CHAT_SOURCES.MANUAL });
  }, [input, sendPlainMessage]);

  const clearChat = useCallback(() => {
    cancelActive();
    dispatch({ type: "chat/clear" });
  }, [cancelActive]);

  return {
    initChatGPTWindow: initAI,
    resetChatGPTWindow: resetAI,
    chatMessages: chat.messages,
    chatInput: input,
    setChatInput: setInput,
    sendManual,
    cancel: cancelActive,
    clearChat,
    isStreaming: Boolean(chat.active),
  };
}
