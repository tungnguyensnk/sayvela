import { useEffect, useRef } from "react";
import { ttsEndStream, ttsPrewarm, ttsSpeak, ttsStart, ttsStop } from "./ttsApi";
import { createTranslationSpeechQueue } from "./translationSpeechQueue";

// hook that manages real-time text-to-speech for translated microphone input
export function useMicTranslationTts({
  enabled,
  running,
  groups,
  endpointTick = 0,
  language,
  provider = "builtin",
  voiceId,
  outputDeviceId,
  rate,
  pitch,
  volume,
  speed,
  // your own voice is going out instead; translations are skipped, not saved up
  muted = false,
}) {
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const queueRef = useRef(null);
  if (queueRef.current === null) queueRef.current = createTranslationSpeechQueue();
  const speakingRef = useRef(false);
  const speechGenerationRef = useRef(0);
  const speakChainRef = useRef(Promise.resolve());
  const pendingTextRef = useRef("");
  const pendingQueueRef = useRef([]);
  const pendingTimersRef = useRef([]);
  const lastRatePitchRef = useRef({ rate: 1, pitch: 1 });
  const configRef = useRef({
    language: "",
    provider: "builtin",
    voiceId: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    speed: 1,
    queueMode: "add",
  });

  useEffect(() => {
    configRef.current = {
      language: String(language || ""),
      provider: provider === "soniox" ? "soniox" : "builtin",
      voiceId: String(voiceId || ""),
      outputDeviceId: String(outputDeviceId || "default-loopback"),
      rate: Number.isFinite(rate) ? rate : 1,
      pitch: Number.isFinite(pitch) ? pitch : 1,
      volume: Number.isFinite(volume) ? volume : 1,
      speed: Number.isFinite(speed) ? speed : 1,
      queueMode: "add",
    };
  }, [language, provider, voiceId, outputDeviceId, rate, pitch, volume, speed]);

  // serializes speak commands so deltas and stream ends reach the backend in
  // order, and drops any still queued from a session that already ended
  function enqueueSpeakCommand(command) {
    const generation = speechGenerationRef.current;
    const guarded = () => (generation === speechGenerationRef.current ? command() : undefined);
    const next = speakChainRef.current.then(guarded, guarded);
    speakChainRef.current = next.catch(() => {});
    return next;
  }

  // discards spoken history and any queued commands from the previous session
  function resetSpeech() {
    speechGenerationRef.current += 1;
    queueRef.current.reset();
    speakingRef.current = false;
    clearPending();
  }

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

  useEffect(() => {
    const nextRate = Number.isFinite(rate) ? rate : 1;
    const nextPitch = Number.isFinite(pitch) ? pitch : 1;
    const prev = lastRatePitchRef.current;
    lastRatePitchRef.current = { rate: nextRate, pitch: nextPitch };

    if (!enabled || !running) {
      clearPending();
      return;
    }

    if (provider === "builtin" && (prev.rate !== nextRate || prev.pitch !== nextPitch) && pendingTextRef.current.trim()) {
      const cfg = configRef.current;
      const text = pendingTextRef.current;
      clearPending();
      ttsSpeak({
        text,
        provider: "builtin",
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
  }, [enabled, running, provider, rate, pitch]);

  useEffect(() => {
    if (!enabled || !running) return;
    let active = true;
    const start = async () => {
      await ttsStart();
      if (active && configRef.current.provider === "soniox" && configRef.current.voiceId) {
        await ttsPrewarm();
      }
    };
    start().catch((e) => console.error("TTS Start Error:", e));
    return () => {
      active = false;
    };
  }, [enabled, running]);

  useEffect(() => {
    resetSpeech();
    ttsStop().catch((e) => console.error("TTS Stop Error:", e));
  }, [provider, language, voiceId, outputDeviceId]);

  // muting drops whatever is queued or playing, but keeps what was spoken so
  // unmuting does not read the backlog out
  useEffect(() => {
    if (!muted) return;
    speechGenerationRef.current += 1;
    clearPending();
    ttsStop().catch((e) => console.error("TTS Stop Error:", e));
  }, [muted]);

  useEffect(() => {
    if (!enabled || !running || !language) {
      resetSpeech();
      ttsStop().catch((e) => console.error("TTS Stop Error:", e));
      return;
    }

    const cfg = configRef.current;
    // soniox synthesizes incrementally, so its partial translation is spoken as
    // it settles instead of waiting for endpoint finalization
    const speakPartial = cfg.provider === "soniox";
    // a new session starts while the previous transcript is still on screen, so
    // that text is adopted as already spoken instead of being read out again
    if (!speakingRef.current) {
      speakingRef.current = true;
      queueRef.current.seed(groups);
      return;
    }
    // still collected while muted, so these count as said and are never replayed
    const deltas = queueRef.current.collect(groups, { speakPartial });
    if (!deltas.length || mutedRef.current) return;
    if (cfg.queueMode !== "add") clearPending();
    for (const delta of deltas) {
      enqueueSpeakCommand(() => ttsSpeak({
        text: delta.text,
        markerId: delta.markerId,
        markerOffset: delta.markerOffset,
        provider: cfg.provider,
        language: cfg.language,
        voiceId: cfg.voiceId || undefined,
        outputDeviceId: cfg.outputDeviceId || undefined,
        rate: cfg.rate,
        pitch: cfg.pitch,
        speed: cfg.speed,
        volume: cfg.volume,
        queueMode: cfg.queueMode,
      })).catch((e) => console.error("TTS Speak Error:", e));
      if (cfg.provider === "builtin") enqueuePending(delta.text, cfg.rate);
    }
  }, [enabled, running, language, groups]);

  // closes the open soniox stream at each utterance boundary; declared after the
  // delta effect so the final delta of the utterance is sent first
  const lastEndpointRef = useRef(0);
  useEffect(() => {
    if (!enabled || !running) return;
    if (!endpointTick || endpointTick === lastEndpointRef.current) return;
    lastEndpointRef.current = endpointTick;
    if (configRef.current.provider !== "soniox" || mutedRef.current) return;
    enqueueSpeakCommand(() => ttsEndStream()).catch((e) => console.error("TTS End Error:", e));
  }, [enabled, running, endpointTick]);
}
