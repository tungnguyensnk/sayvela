import { invoke } from "@tauri-apps/api/core";
import { SonioxClient } from "@soniox/client";
import { TauriAudioSource } from "./tauriAudioSource";
import { createTranscriptMapper } from "./sonioxTranscript";

// attempts to parse a json string safely, returning null on failure
function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// normalizes various context input formats (string, array, object) into a standard object
function normalizeContextInput(input) {
  if (!input) return null;

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    const parsed = safeJsonParse(s);
    if (parsed !== null) {
      if (typeof parsed === "string") return { text: parsed };
      if (Array.isArray(parsed)) {
        return parsed.every((v) => typeof v === "string") ? { terms: parsed } : null;
      }
      if (typeof parsed === "object") return parsed;
    }

    return { text: s };
  }

  if (Array.isArray(input)) {
    return input.every((v) => typeof v === "string") ? { terms: input } : null;
  }

  if (typeof input === "object") return input;
  return null;
}

// initializes soniox sdk recording and maps results to application transcript groups
export async function startSonioxSession({
  sampleRate = 44100,
  languageHints = ["vi", "ja"],
  enableSpeakerDiarization = true,
  targetLanguage = "ja",
  endpointDelayMs = 600,
  context = null,
  audioEventName = "audio_chunk",
  speakerOverride = "",
  onText,
  onState,
  onError,
  onTurnEnd,
  rotationIntervalMs = 4 * 60 * 1000,
  rotationMaxDelayMs = 30000,
} = {}) {
  const configBase = {
    audio_format: "pcm_s16le",
    sample_rate: sampleRate,
    num_channels: 1,
    model: "stt-rt-v5",
    language_hints: languageHints,
    language_hints_strict: true,
    enable_speaker_diarization: enableSpeakerDiarization,
    enable_language_identification: true,
    enable_endpoint_detection: true,
    max_endpoint_delay_ms: endpointDelayMs,
  };

  const buildConfig = () => {
    const config = { ...configBase };
    const normalizedContext = normalizeContextInput(context);
    if (normalizedContext) config.context = normalizedContext;
    if (targetLanguage) {
      config.translation = {
        type: "one_way",
        target_language: targetLanguage,
        source_languages: ["*"],
      };
    }
    return config;
  };

  const transcript = createTranscriptMapper({ languageHints, targetLanguage, speakerOverride, onText, onTurnEnd });

  let activeSession = null;
  let pendingSession = null;
  let rotationTimer = null;
  let rotationDeadline = null;
  let rotationPending = false;
  let rotating = false;
  let stopped = false;

  // schedules rotation for the next endpoint with a bounded fallback delay
  const scheduleRotation = () => {
    clearTimeout(rotationTimer);
    clearTimeout(rotationDeadline);
    rotationPending = false;
    if (rotationIntervalMs <= 0 || stopped) return;
    rotationTimer = setTimeout(() => {
      rotationPending = true;
      rotationDeadline = setTimeout(rotate, rotationMaxDelayMs);
    }, rotationIntervalMs);
  };

  // creates an independently keyed websocket with gated audio delivery
  const createSession = (active, emit) => {
    let session;
    const source = new TauriAudioSource(audioEventName, active);
    const client = new SonioxClient({
      config: async () => {
        if (active) onState?.("fetch_key");
        const key = await invoke("soniox_get_temp_key");
        if (!key?.apiKey) throw new Error("missing apiKey");
        return { api_key: key.apiKey };
      },
    });
    const recording = client.realtime.record({
      ...buildConfig(),
      source,
      auto_reconnect: true,
      max_reconnect_attempts: 3,
      reconnect_base_delay_ms: 1000,
    });
    recording.on("result", (result) => {
      session.processedMs = Math.max(session.processedMs, result.total_audio_proc_ms ?? result.final_audio_proc_ms ?? 0);
      emit(() => transcript.add(result, session.offsetMs));
    });
    recording.on("endpoint", () => emit(() => {
      transcript.endpoint();
      if (rotationPending && activeSession?.recording === recording) rotate();
    }));
    recording.on("finished", () => emit(transcript.finish));
    recording.on("state_change", ({ new_state: state }) => {
      if (activeSession?.recording === recording) onState?.(state === "recording" ? "streaming" : state);
    });
    recording.on("error", (error) => {
      if (activeSession?.recording === recording) onError?.(error);
    });
    const connected = new Promise((resolve, reject) => {
      recording.once("connected", resolve);
      recording.once("error", reject);
    });
    session = { recording, source, connected, offsetMs: 0, processedMs: 0 };
    return session;
  };

  const STOP_TIMEOUT_MS = 3000;

  // gracefully drains final server results before releasing a websocket
  const stopRecording = async ({ recording }) => {
    if (["stopped", "canceled", "error"].includes(recording.state)) return;
    let timeout;
    try {
      await Promise.race([
        recording.stop(),
        new Promise((resolve) => { timeout = setTimeout(resolve, STOP_TIMEOUT_MS); }),
      ]);
    } finally {
      clearTimeout(timeout);
      if (!["stopped", "canceled", "error"].includes(recording.state)) recording.cancel();
    }
  };

  // connects the next websocket before switching audio and draining the previous one
  const rotate = async () => {
    if (rotating || stopped || !activeSession) return;
    rotating = true;
    rotationPending = false;
    clearTimeout(rotationDeadline);
    const queued = [];
    let buffering = true;
    const next = createSession(false, (event) => buffering ? queued.push(event) : event());
    pendingSession = next;
    try {
      await next.connected;
      if (stopped) { await stopRecording(next); return; }
      const previous = activeSession;
      previous.source.setActive(false);
      next.source.setActive(true);
      activeSession = next;
      await stopRecording(previous);
      next.offsetMs = previous.offsetMs + previous.processedMs;
      buffering = false;
      queued.splice(0).forEach((event) => event());
    } catch {
      await stopRecording(next).catch(() => {});
    } finally {
      pendingSession = null;
      rotating = false;
      scheduleRotation();
    }
  };

  activeSession = createSession(true, (event) => event());
  await activeSession.connected;
  scheduleRotation();

  return {
    // gracefully stops audio and waits for final soniox results
    stop: async () => {
      stopped = true;
      clearTimeout(rotationTimer);
      clearTimeout(rotationDeadline);
      const sessions = [...new Set([activeSession, pendingSession].filter(Boolean))];
      await Promise.allSettled(sessions.map(stopRecording));
    },
  };
}
