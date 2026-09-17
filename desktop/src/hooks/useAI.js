import { useRef, useCallback, useReducer, useState } from "react";
import { sendMessage } from "../services/aiService.js";
import { captureScreen } from "../services/screenService.js";
import {
  chatReducer,
  initialChatState,
  createChatMessage,
  CHAT_SOURCES,
  CHAT_STATUSES,
  isBlankReply,
} from "../ai/chatReducer.js";

// builds the openai-style history from completed messages in the panel
function toHistory(messages) {
  return messages
    .filter((m) => m.status === CHAT_STATUSES.DONE && m.text)
    .map((m) => ({ role: m.role, content: m.text }));
}

export function useAI({ screenMonitorId = "" } = {}) {
  const aiDidInitRef = useRef(false);
  const abortRef = useRef({ controller: null, requestId: "" });
  const [chat, dispatch] = useReducer(chatReducer, undefined, initialChatState);
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;
  const [input, setInput] = useState("");
  const [withScreenshot, setWithScreenshot] = useState(false);

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

  // runs one streaming turn; request decides which ai endpoint is used
  const runTurn = useCallback(
    async ({ text, source, request, onEvent, keepEmpty = false, showUser = true }) => {
      const messageText = String(text || "").trim();
      if (!messageText) return null;
      if (abortRef.current.controller) cancelActive();

      const requestId = `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      dispatch({
        type: "chat/start",
        payload: {
          requestId,
          userMessage: showUser
            ? createChatMessage({
                id: `u-${requestId}`,
                role: "user",
                text: messageText,
                source,
                status: CHAT_STATUSES.DONE,
              })
            : null,
          assistantMessage: createChatMessage({
            id: `a-${requestId}`,
            role: "assistant",
            text: "",
            source,
            status: CHAT_STATUSES.STREAMING,
          }),
        },
      });

      const controller = new AbortController();
      abortRef.current = { controller, requestId };

      try {
        const result = await request(
          (payload) => {
            if (controller.signal.aborted) return;
            const { event, data } = payload || {};
            if (event === "chunk" && data?.delta) {
              dispatch({ type: "chat/append_chunk", payload: { requestId, delta: data.delta } });
            }
            onEvent?.(payload);
          },
          { signal: controller.signal, requestId }
        );
        const finalText = (result?.response ?? "").trim();
        // the sentinel is never worth showing, even in a manual turn
        const blank = isBlankReply(finalText);
        if (blank && (!keepEmpty || finalText)) {
          dispatch({ type: "chat/discard", payload: { requestId } });
        } else {
          dispatch({ type: "chat/finish", payload: { requestId, text: finalText } });
        }
        return result;
      } catch (e) {
        if (controller.signal.aborted || e?.name === "AbortError") {
          dispatch({ type: "chat/cancel", payload: { requestId } });
          return null;
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
    const history = toHistory(messagesRef.current);
    // the toggle next to the composer decides whether the model sees the screen
    let image;
    if (withScreenshot) {
      image = await captureScreen(screenMonitorId).then((shot) => shot?.data_url).catch(() => undefined);
    }
    return runTurn({
      text,
      source: CHAT_SOURCES.MANUAL,
      keepEmpty: true,
      request: (onEvent, opts) =>
        sendMessage(
          { messages: [...history, { role: "user", content: text }], image },
          onEvent,
          opts
        ),
    });
  }, [input, runTurn, screenMonitorId, withScreenshot]);

  const clearChat = useCallback(() => {
    cancelActive();
    dispatch({ type: "chat/clear" });
  }, [cancelActive]);

  return {
    initChatGPTWindow: initAI,
    resetChatGPTWindow: resetAI,
    chatMessages: chat.messages,
    messagesRef,
    chatInput: input,
    setChatInput: setInput,
    withScreenshot,
    toggleScreenshot: () => setWithScreenshot((v) => !v),
    runTurn,
    sendManual,
    cancel: cancelActive,
    clearChat,
    isStreaming: Boolean(chat.active),
  };
}
