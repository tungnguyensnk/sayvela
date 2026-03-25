import { useEffect, useMemo, useRef } from "react";
import { ttsSpeak, ttsStop } from "./ttsApi";

// normalizes text by collapsing whitespace and removing spaces before punctuation
function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

// removes leading whitespace and punctuation from a string
function removeLeadingJunk(s) {
  return String(s || "").replace(/^[\s,.;:!?-]+/, "").trim();
}

// hook that manages real-time text-to-speech for translated microphone input
export function useMicTranslationTts({
  enabled,
  running,
  groups,
  language,
  voiceId,
  outputDeviceId,
  rate,
  pitch,
  volume,
  queueMode,
}) {
  const lastFullRef = useRef("");
  const timerRef = useRef(null);
  const pendingTextRef = useRef("");
  const pendingQueueRef = useRef([]);
  const pendingTimersRef = useRef([]);
  const lastRatePitchRef = useRef({ rate: 1, pitch: 1 });
  const configRef = useRef({
    language: "",
    voiceId: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    queueMode: "add",
  });

  useEffect(() => {
    configRef.current = {
      language: String(language || ""),
      voiceId: String(voiceId || ""),
      outputDeviceId: String(outputDeviceId || "default-loopback"),
      rate: Number.isFinite(rate) ? rate : 1,
      pitch: Number.isFinite(pitch) ? pitch : 1,
      volume: Number.isFinite(volume) ? volume : 1,
      queueMode: String(queueMode || "add"),
    };
  }, [language, voiceId, outputDeviceId, rate, pitch, volume, queueMode]);

  // clears all pending tts queue items and timers
  function clearPending() {
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    pendingQueueRef.current = [];
    pendingTextRef.current = "";
  }

  // estimates the playback duration of a text segment based on the speaking rate
  function estimateDurationMs(text, rateValue) {
    const safeRate = Number.isFinite(rateValue) && rateValue > 0 ? rateValue : 1;
    const ms = (String(text || "").length * 45) / safeRate;
    return Math.max(250, ms);
  }

  // adds a text segment to the pending playback queue and schedules its removal
  function enqueuePending(text, rateValue) {
    const durationMs = estimateDurationMs(text, rateValue);
    const queue = pendingQueueRef.current;
    const waitMs = queue.reduce((sum, item) => sum + item.durationMs, 0);
    const item = { text, durationMs };
    queue.push(item);
    pendingTextRef.current += text;
    const timeout = setTimeout(() => {
      const q = pendingQueueRef.current;
      const index = q.indexOf(item);
      if (index >= 0) q.splice(index, 1);
      if (pendingTextRef.current.startsWith(item.text)) {
        pendingTextRef.current = pendingTextRef.current.slice(item.text.length);
      } else {
        pendingTextRef.current = q.map((i) => i.text).join("");
      }
    }, waitMs + durationMs);
    pendingTimersRef.current.push(timeout);
  }

  const fullText = useMemo(() => {
    if (!enabled || !running) return "";
    if (!language) return "";
    if (!Array.isArray(groups)) return "";
    const translated = groups
      .filter((g) => g?.translationStatus && g.translationStatus !== "original")
      .map((g) => String(g?.finalText || ""))
      .join("");
    return normalizeText(translated);
  }, [enabled, running, groups, language]);

  useEffect(() => {
    const nextRate = Number.isFinite(rate) ? rate : 1;
    const nextPitch = Number.isFinite(pitch) ? pitch : 1;
    const prev = lastRatePitchRef.current;
    lastRatePitchRef.current = { rate: nextRate, pitch: nextPitch };

    if (!enabled || !running) {
      clearPending();
      return;
    }

    if ((prev.rate !== nextRate || prev.pitch !== nextPitch) && pendingTextRef.current.trim()) {
      const cfg = configRef.current;
      const text = pendingTextRef.current;
      clearPending();
      ttsSpeak({
        text,
        language: cfg.language,
        voiceId: cfg.voiceId || undefined,
        outputDeviceId: cfg.outputDeviceId || undefined,
        rate: nextRate,
        pitch: nextPitch,
        volume: cfg.volume,
        queueMode: "flush",
      }).catch((e) => console.error("TTS Speak Error:", e));
      enqueuePending(text, nextRate);
    }
  }, [enabled, running, rate, pitch]);

  useEffect(() => {
    if (!enabled || !running || !language) {
      lastFullRef.current = "";
      clearPending();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      ttsStop().catch((e) => console.error("TTS Stop Error:", e));
      return;
    }

    const prev = lastFullRef.current;
    if (!fullText || fullText === prev) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const currentPrev = lastFullRef.current;
      const currentFull = fullText;

      let delta = currentFull.startsWith(currentPrev) ? currentFull.slice(currentPrev.length) : currentFull;
      delta = removeLeadingJunk(delta);
      if (delta.trim().length === 0) return;

      lastFullRef.current = currentFull;
      const cfg = configRef.current;
      if (cfg.queueMode !== "add") {
        clearPending();
      }
      ttsSpeak({
        text: delta,
        language: cfg.language,
        voiceId: cfg.voiceId || undefined,
        outputDeviceId: cfg.outputDeviceId || undefined,
        rate: cfg.rate,
        pitch: cfg.pitch,
        volume: cfg.volume,
        queueMode: cfg.queueMode,
      }).catch((e) => console.error("TTS Speak Error:", e));
      enqueuePending(delta, cfg.rate);
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, running, language, fullText]);
}
