import { useRef, useCallback, useReducer, useState } from "react";
import { sendMessage as aiSendMessage } from "../services/aiService.js";
import { hideConversation, prepareStopConversation } from "../providers/chatgpt.js";
import {
  clearConversationState,
  getConversationState,
  saveConversationState,
} from "../services/chatgptConversationService.js";
import {
  chatReducer,
  initialChatState,
  createChatMessage,
  CHAT_SOURCES,
  CHAT_STATUSES,
} from "../ai/chatReducer.js";

export function useAI() {
  const aiDidInitRef = useRef(false);
  const abortRef = useRef({ controller: null, requestId: "" });
  const [chat, dispatch] = useReducer(chatReducer, undefined, initialChatState);
  const [input, setInput] = useState("");

  const resetAI = useCallback(async () => {
    if (abortRef.current.controller) {
      const rid = abortRef.current.requestId;
      abortRef.current.controller.abort();
      if (rid) dispatch({ type: "chat/cancel", payload: { requestId: rid } });
    }
    abortRef.current = { controller: null, requestId: "" };
    aiDidInitRef.current = false;
    clearConversationState();
  }, []);

  const initAI = useCallback(async () => {
    aiDidInitRef.current = true;
  }, []);

  const cancelActive = useCallback(() => {
    if (!abortRef.current.controller) return;
    prepareStopConversation().catch(() => {});
    const rid = abortRef.current.requestId;
    abortRef.current.controller.abort();
    abortRef.current = { controller: null, requestId: "" };
    if (rid) dispatch({ type: "chat/cancel", payload: { requestId: rid } });
  }, []);

  const sendPlainMessage = useCallback(
    async ({ text, source, keepConversation = true }) => {
      const messageText = String(text || "").trim();
      if (!messageText) return;
      if (abortRef.current.controller) cancelActive();

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
          messageText,
          [],
          (payload) => {
            if (controller.signal.aborted) return;
            const { event, data } = payload || {};
            if (event === "chunk") {
              const delta = data?.delta ?? data?.content ?? data?.text ?? "";
              if (delta) {
                dispatch({ type: "chat/append_chunk", payload: { requestId, delta } });
              }
            } else if (event === "result") {
              const text = data?.response ?? data?.text ?? "";
              const contentReferences = data?.content_references || data?.contentReferences || [];
              if (keepConversation) {
                saveConversationState({
                  conversationId: data?.conversation_id,
                  parentMessageId: data?.message_id,
                });
              }
              dispatch({ type: "chat/finish", payload: { requestId, text, contentReferences } });
            }
          },
          {
            signal: controller.signal,
            requestId,
            keepConversation,
            conversationState: keepConversation ? getConversationState() : null,
          }
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
    const { conversationId } = getConversationState();
    cancelActive();
    if (conversationId) {
      hideConversation(conversationId).catch(() => {});
    }
    clearConversationState();
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
