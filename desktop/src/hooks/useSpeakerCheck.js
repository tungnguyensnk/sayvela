import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { buildSpeakerDelta, cursorAtEnd, parseBinaryAnswer, buildRecentConversationText } from "../transcript/transcriptUtils";

// periodically checks if the current speaker is asking a question and triggers a response via chatgpt if needed
export function useSpeakerCheck({ running, loopbackGroups, micGroups, chatgpt }) {
  const speakerCursorRef = useRef({ groupKey: "", textLen: 0 });
  const speakerCheckingRef = useRef(false);
  const speakerPauseTimerRef = useRef(null);
  const speakerIntervalRef = useRef(null);

  // evaluates recent transcript delta to detect questions and sends conversation history to chatgpt
  const triggerSpeakerQuestionCheck = async () => {
    if (!running) return;
    if (speakerCheckingRef.current) return;

    const delta = buildSpeakerDelta(loopbackGroups, speakerCursorRef.current);
    if (!delta) return;

    speakerCheckingRef.current = true;
    try {
      const out = await invoke("groq_check_question", { content: delta });
      const bin = parseBinaryAnswer(out);
      console.log("Speaker check bin result:", bin);

      if (bin === 1) {
        const recent = buildRecentConversationText(loopbackGroups, micGroups, 2000);
        if (recent) {
          try {
            await chatgpt.sendMessage(recent);
          } catch (e) {
            console.error("useSpeakerCheck sendMessage failed:", e);
          }
        }
      }

      speakerCursorRef.current = cursorAtEnd(loopbackGroups);
    } catch (e) {
      console.error("groq_check_question failed:", e);
    } finally {
      speakerCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (!running) {
      if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
      speakerPauseTimerRef.current = null;
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
      speakerIntervalRef.current = null;
      speakerCursorRef.current = { groupKey: "", textLen: 0 };
      speakerCheckingRef.current = false;
      return;
    }

    speakerCursorRef.current = { groupKey: "", textLen: 0 };
    speakerIntervalRef.current = setInterval(() => {
      triggerSpeakerQuestionCheck();
    }, 10000);

    return () => {
      if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
    speakerPauseTimerRef.current = setTimeout(() => {
      triggerSpeakerQuestionCheck();
    }, 2000);
  }, [running, loopbackGroups]);

  return {
    resetCursor: () => {
      speakerCursorRef.current = { groupKey: "", textLen: 0 };
    }
  };
}
