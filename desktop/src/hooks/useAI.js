import { useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sendMessage as aiSendMessage } from "../services/aiService.js";

export function useAI({ micInputLangs, loopbackContext }) {
  const aiDidInitRef = useRef(false);
  const lastSentContextRef = useRef("");
  const abortControllerRef = useRef(null);
  const sessionTextRef = useRef(new Map());

  const resetAI = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    aiDidInitRef.current = false;
    lastSentContextRef.current = "";
  }, []);

  const initAI = useCallback(async () => {
    aiDidInitRef.current = true;
  }, []);

  const sendMessage = useCallback(async (conversation) => {
    if (!conversation || lastSentContextRef.current === conversation) return;
    lastSentContextRef.current = conversation;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const prompt = await invoke("build_prompt", {
        meInputLanguage: micInputLangs?.[0] || "vi",
        context: loopbackContext || "",
        conversation,
      });

      const sessionId = `ai-${Date.now()}`;
      
      // We pass empty history and the full prompt as the message
      await aiSendMessage(prompt, [], (payload) => {
        if (abortController.signal.aborted) return;

        const { event, data } = payload;
        
        if (event === "result" && data.response) {
          sessionTextRef.current.set(sessionId, data.response);
          // Optional: emit an event if other parts of the app rely on it
          // console.log("AI Result:", data.response);
        } else if (event === "chunk") {
           // If provider supports streaming chunks in the future
           const prev = sessionTextRef.current.get(sessionId) || "";
           sessionTextRef.current.set(sessionId, prev + (data.delta || ""));
        }
      });
      
    } catch (e) {
      if (e?.name === "AbortError") return;
      lastSentContextRef.current = "";
      console.error("useAI sendMessage error:", e);
      throw e;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [micInputLangs, loopbackContext]);

  const clearSentContext = useCallback(() => {
    lastSentContextRef.current = "";
  }, []);

  return {
    initStreamBridge: initAI,
    resetStreamBridge: resetAI,
    initChatGPTWindow: initAI,
    resetChatGPTWindow: resetAI,
    sendMessage,
    clearSentContext,
  };
}
