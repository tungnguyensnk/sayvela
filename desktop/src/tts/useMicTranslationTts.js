import { useEffect, useMemo, useRef } from "react";
import { ttsSpeak, ttsStop } from "./ttsApi";

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function removeLeadingJunk(s) {
  return String(s || "").replace(/^[\s,.;:!?-]+/, "").trim();
}

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
    if (!enabled || !running || !language) {
      lastFullRef.current = "";
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      ttsStop().catch(() => {});
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
      if (delta.length < 2) return;

      lastFullRef.current = currentFull;
      const cfg = configRef.current;
      ttsSpeak({
        text: delta,
        language: cfg.language,
        voiceId: cfg.voiceId || undefined,
        outputDeviceId: cfg.outputDeviceId || undefined,
        rate: cfg.rate,
        pitch: cfg.pitch,
        volume: cfg.volume,
        queueMode: cfg.queueMode,
      }).catch(() => {});
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, running, language, fullText]);
}
