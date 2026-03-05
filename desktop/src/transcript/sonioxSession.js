import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

function tokenMeta(t) {
  const speaker = String(t?.speaker ?? "0");
  const language = typeof t?.language === "string" ? t.language : "";
  const translationStatus =
    typeof t?.translation_status === "string"
      ? t.translation_status
      : typeof t?.translationStatus === "string"
        ? t.translationStatus
        : "original";
  const text = typeof t?.text === "string" ? t.text : "";
  const isFinal = Boolean(t?.is_final ?? t?.isFinal);
  return { speaker, language, translationStatus, text, isFinal };
}

function toGroupView(seg) {
  const finalText = seg.finalText || "";
  const partialText = seg.partialText || "";
  return {
    id: seg.id,
    seq: Number(seg.seq) || 0,
    speaker: String(seg.speaker ?? "0"),
    language: String(seg.language ?? ""),
    translationStatus: String(seg.translationStatus ?? "original"),
    finalText,
    partialText,
    text: `${finalText}${partialText}`,
    isFinal: partialText.length === 0,
  };
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

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

function toUint8Array(payload) {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  if (Array.isArray(payload)) return new Uint8Array(payload);
  return new Uint8Array(payload);
}

function sortGroups(a, b) {
  const ds = (a.seq || 0) - (b.seq || 0);
  if (ds) return ds;
  const ao = a.translationStatus === "original" ? 0 : 1;
  const bo = b.translationStatus === "original" ? 0 : 1;
  if (ao !== bo) return ao - bo;
  return String(a.language || "").localeCompare(String(b.language || ""));
}

function deltaFrom(prev, next) {
  const p = String(prev || "");
  const n = String(next || "");
  if (!n) return "";
  if (!p) return n;
  if (n === p) return "";
  if (n.startsWith(p)) return n.slice(p.length);
  // Ignore overlapping suffix updates where the new text is just a suffix of the previous text.
  // This can happen when Soniox sends partial updates that are redundant or when
  // a final update is a substring of a previous partial update (though less common).
  if (p.endsWith(n)) return "";
  return n;
}

export async function startSonioxSession({
  sampleRate = 44100,
  model = "stt-rt-v4",
  languageHints = ["vi", "ja"],
  enableSpeakerDiarization = true,
  enableLanguageIdentification = true,
  targetLanguage = "ja",
  enableTranslation = true,
  context = null,
  audioEventName = "audio_chunk",
  speakerOverride = "",
  splitTurnsOnLanguage = true,
  onText,
  onResult,
  onState,
} = {}) {
  let nextSeq = 1;
  const lastTurnSeqBySpeaker = new Map();
  let lastOriginalRunKey = "";
  const allSegments = [];
  const streamByStatus = new Map();
  const getStream = (translationStatus) => {
    const k = String(translationStatus ?? "original");
    let s = streamByStatus.get(k);
    if (!s) {
      s = { nextId: 1, current: null };
      streamByStatus.set(k, s);
    }
    return s;
  };

  let stopped = false;
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let connectingPromise = null;

  const fetchApiKey = async () => {
    onState?.("fetch_key");
    const key = await invoke("soniox_get_temp_key");
    const apiKey = key?.apiKey;
    if (!apiKey) throw new Error("missing apiKey");
    return apiKey;
  };

  const configBase = {
    audio_format: "s16le",
    sample_rate: sampleRate,
    num_channels: 1,
    model,
    language_hints: languageHints,
    enable_speaker_diarization: enableSpeakerDiarization,
    enable_language_identification: enableLanguageIdentification,
  };

  const buildConfig = (apiKey) => {
    const config = { ...configBase, api_key: apiKey };
    const normalizedContext = normalizeContextInput(context);
    if (normalizedContext) config.context = normalizedContext;
    if (enableTranslation && targetLanguage) {
      config.translation = {
        type: "one_way",
        target_language: targetLanguage,
        source_languages: ["*"],
      };
    }
    return config;
  };

  const handleMessage = (ev) => {
    if (typeof ev.data !== "string") return;
    const msg = safeJsonParse(ev.data);
    if (!msg) return;

    onResult?.(msg);
    const tokens = Array.isArray(msg?.tokens) ? msg.tokens : [];
    const touchedStreams = new Set();

    for (const t of tokens) {
      const m = tokenMeta(t);
      if (speakerOverride) m.speaker = String(speakerOverride);
      let turnSeq = lastTurnSeqBySpeaker.get(m.speaker) || 0;
      if (m.translationStatus === "original") {
        const originalRunKey = splitTurnsOnLanguage ? `${m.speaker}|${m.language}` : `${m.speaker}`;
        if (originalRunKey !== lastOriginalRunKey) {
          lastOriginalRunKey = originalRunKey;
          turnSeq = nextSeq++;
          lastTurnSeqBySpeaker.set(m.speaker, turnSeq);
        }
      } else if (!turnSeq) {
        turnSeq = nextSeq;
      }

      const streamKey = String(m.translationStatus ?? "original");
      const stream = getStream(streamKey);
      if (!touchedStreams.has(streamKey)) {
        if (stream.current) stream.current.partialText = "";
        touchedStreams.add(streamKey);
      }
      const runKey = `${turnSeq}|${m.speaker}|${m.language}|${m.translationStatus}`;
      if (!stream.current || stream.current.runKey !== runKey) {
        if (stream.current && (stream.current.finalText || stream.current.partialText)) {
          allSegments.push(toGroupView(stream.current));
        }
        stream.current = {
          id: `${streamKey}-${stream.nextId++}`,
          seq: turnSeq,
          runKey,
          speaker: m.speaker,
          language: m.language,
          translationStatus: m.translationStatus,
          finalText: "",
          partialText: "",
          finalRaw: "",
          partialRaw: "",
          createdAt: Date.now(),
        };
      }
      if (m.isFinal) {
        const delta = deltaFrom(stream.current.finalRaw, m.text);
        if (delta) stream.current.finalText += delta;
        stream.current.finalRaw = String(m.text || "");
        stream.current.partialText = "";
        stream.current.partialRaw = "";
      } else {
        const delta = deltaFrom(stream.current.partialRaw, m.text);
        if (delta) stream.current.partialText += delta;
        stream.current.partialRaw = String(m.text || "");
      }
    }

    if (Boolean(msg?.finished)) {
      for (const s of streamByStatus.values()) {
        if (s.current && (s.current.finalText || s.current.partialText)) {
          allSegments.push(toGroupView(s.current));
        }
        s.current = null;
      }
    }

    const currentGroups = [];
    for (const s of streamByStatus.values()) {
      if (s.current && (s.current.finalText || s.current.partialText)) {
        currentGroups.push(toGroupView(s.current));
      }
    }
    currentGroups.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const mergedGroups = [...allSegments, ...currentGroups];
    mergedGroups.sort(sortGroups);

    const finalText = mergedGroups.map((g) => g.finalText || "").join("");
    const partialText = mergedGroups.map((g) => g.partialText || "").join("");
    onText?.({
      text: `${finalText}${partialText}`,
      finalText,
      partialText,
      groups: mergedGroups,
      finished: Boolean(msg?.finished),
    });
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    if (reconnectTimer) return;
    const cappedAttempt = Math.min(reconnectAttempt, 6);
    const delayMs = Math.min(10000, 500 * 2 ** cappedAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      ensureConnected(true).catch(() => scheduleReconnect());
    }, delayMs);
  };

  const handleDisconnect = () => {
    if (stopped) return;
    onState?.("reconnecting");
    scheduleReconnect();
  };

  const openWs = async () => {
    const sock = new WebSocket(WS_URL);
    sock.binaryType = "arraybuffer";
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        sock.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        sock.removeEventListener("open", onOpen);
        reject(new Error("websocket connect failed"));
      };
      sock.addEventListener("open", onOpen, { once: true });
      sock.addEventListener("error", onError, { once: true });
    });
    return sock;
  };

  const attachHandlers = (sock) => {
    sock.addEventListener("message", handleMessage);
    sock.addEventListener("close", handleDisconnect);
    sock.addEventListener("error", handleDisconnect);
  };

  const ensureConnected = async (isReconnect) => {
    if (stopped) return;
    if (connectingPromise) return connectingPromise;
    connectingPromise = (async () => {
      onState?.(isReconnect ? "reconnecting" : "connecting");

      const apiKey = await fetchApiKey();
      if (stopped) return;

      const sock = await openWs();
      if (stopped) {
        try {
          sock.close();
        } catch {}
        return;
      }

      ws = sock;
      attachHandlers(sock);

      onState?.("configuring");
      sock.send(JSON.stringify(buildConfig(apiKey)));
      reconnectAttempt = 0;
      onState?.("streaming");
    })().finally(() => {
      connectingPromise = null;
    });
    return connectingPromise;
  };

  await ensureConnected(false);

  const unlistenAudio = await listen(audioEventName, (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = e.payload;
    ws.send(toUint8Array(payload));
  });

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try {
        unlistenAudio?.();
      } catch {}
      try {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(new Uint8Array());
      } catch {}
      try {
        ws?.close?.();
      } catch {}
    },
  };
}
