import { useRef, useCallback, useReducer, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sendMessage as aiSendMessage } from "../services/aiService.js";
import {
  chatReducer,
  initialChatState,
  createChatMessage,
  CHAT_SOURCES,
  CHAT_STATUSES,
  shouldSkipAutoSend,
} from "../ai/chatReducer.js";

export function useAI({ micInputLangs, loopbackContext }) {
  const aiDidInitRef = useRef(false);
  const abortRef = useRef({ controller: null, requestId: "" });
  const autoDedupRef = useRef({ lastSig: "", lastAtMs: 0 });
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
    autoDedupRef.current = { lastSig: "", lastAtMs: 0 };
  }, []);

  const initAI = useCallback(async () => {
    aiDidInitRef.current = true;
  }, []);

  const cancelActive = useCallback(() => {
    if (!abortRef.current.controller) return;
    const rid = abortRef.current.requestId;
    abortRef.current.controller.abort();
    abortRef.current = { controller: null, requestId: "" };
    if (rid) dispatch({ type: "chat/cancel", payload: { requestId: rid } });
  }, []);

  const sendWithPrompt = useCallback(
    async ({ conversation, userText, source }) => {
      if (!conversation) return;
      if (abortRef.current.controller) cancelActive();

      const requestId = `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const userMessage = createChatMessage({
        id: `u-${requestId}`,
        role: "user",
        text: userText || conversation,
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
        const prompt = await invoke("build_prompt", {
          meInputLanguage: micInputLangs?.[0] || "vi",
          context: loopbackContext || "",
          conversation,
        });

        await aiSendMessage(
          prompt,
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
              dispatch({ type: "chat/finish", payload: { requestId, text } });
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
    [micInputLangs, loopbackContext, cancelActive]
  );

  const sendManual = useCallback(async () => {
    const text = String(input || "").trim();
    if (!text) return;
    setInput("");
    const conversation = `ME: ${text}`;
    return sendWithPrompt({ conversation, userText: text, source: CHAT_SOURCES.MANUAL });
  }, [input, sendWithPrompt]);

  const sendAutoFromTranscript = useCallback(
    async ({ recentConversation, questionDelta }) => {
      const nowMs = Date.now();
      const sig = questionDelta || recentConversation || "";
      const { lastSig, lastAtMs } = autoDedupRef.current;
      if (
        shouldSkipAutoSend(
          { lastSig, lastAtMs, nowMs, cooldownMs: 45_000 },
          sig
        )
      ) {
        return;
      }
      autoDedupRef.current = { lastSig: sig, lastAtMs: nowMs };
      const userText = String(questionDelta || "").trim() || "auto question detected";
      return sendWithPrompt({
        conversation: recentConversation,
        userText,
        source: CHAT_SOURCES.AUTO,
      });
    },
    [sendWithPrompt]
  );

  const clearSentContext = useCallback(() => {
    autoDedupRef.current = { lastSig: "", lastAtMs: 0 };
  }, []);

  return {
    initStreamBridge: initAI,
    resetStreamBridge: resetAI,
    initChatGPTWindow: initAI,
    resetChatGPTWindow: resetAI,
    sendMessage: (conversation) =>
      sendAutoFromTranscript({ recentConversation: conversation, questionDelta: conversation }),
    clearSentContext,
    chatMessages: chat.messages,
    chatInput: input,
    setChatInput: setInput,
    sendManual,
    sendAutoFromTranscript,
    cancel: cancelActive,
    clearChat: () => dispatch({ type: "chat/clear" }),
    isStreaming: Boolean(chat.active),
  };
}
