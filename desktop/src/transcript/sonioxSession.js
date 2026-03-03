import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

function tokenIsFinal(t) {
  return Boolean(t?.is_final ?? t?.isFinal);
}

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
  return { speaker, language, translationStatus, text, isFinal: tokenIsFinal(t) };
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

export async function startSonioxSession({
  sampleRate = 44100,
  model = "stt-rt-v4",
  languageHints = ["vi", "ja"],
  enableSpeakerDiarization = true,
  enableLanguageIdentification = true,
  targetLanguage = "ja",
  enableTranslation = true,
  onText,
  onResult,
  onState,
} = {}) {
  onState?.("fetch_key");
  const key = await invoke("soniox_get_temp_key");
  const apiKey = key?.apiKey;
  if (!apiKey) throw new Error("missing apiKey");

  onState?.("connecting");
  const ws = new WebSocket(WS_URL);
  ws.binaryType = "arraybuffer";

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

  await new Promise((resolve, reject) => {
    const onOpen = () => {
      ws.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      ws.removeEventListener("open", onOpen);
      reject(new Error("websocket connect failed"));
    };
    ws.addEventListener("open", onOpen, { once: true });
    ws.addEventListener("error", onError, { once: true });
  });

  onState?.("configuring");
  const config = {
    api_key: apiKey,
    audio_format: "s16le",
    sample_rate: sampleRate,
    num_channels: 1,
    model,
    language_hints: languageHints,
    enable_speaker_diarization: enableSpeakerDiarization,
    enable_language_identification: enableLanguageIdentification,
  };
  if (enableTranslation && targetLanguage) {
    config.translation = {
      type: "one_way",
      target_language: targetLanguage,
      source_languages: ["*"],
    };
  }
  ws.send(
    JSON.stringify(config),
  );

  ws.addEventListener("message", (ev) => {
    if (typeof ev.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }

    onResult?.(msg);
    const tokens = Array.isArray(msg?.tokens) ? msg.tokens : [];
    const touchedStreams = new Set();

    for (const t of tokens) {
      const m = tokenMeta(t);
      let turnSeq = lastTurnSeqBySpeaker.get(m.speaker) || 0;
      if (m.translationStatus === "original") {
        const originalRunKey = `${m.speaker}|${m.language}`;
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
        };
      }
      if (m.isFinal) stream.current.finalText += m.text;
      else stream.current.partialText += m.text;
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
    mergedGroups.sort((a, b) => {
      const ds = (a.seq || 0) - (b.seq || 0);
      if (ds) return ds;
      const ao = a.translationStatus === "original" ? 0 : 1;
      const bo = b.translationStatus === "original" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return String(a.language || "").localeCompare(String(b.language || ""));
    });

    const finalText = mergedGroups.map((g) => g.finalText || "").join("");
    const partialText = mergedGroups.map((g) => g.partialText || "").join("");
    onText?.({
      text: `${finalText}${partialText}`,
      finalText,
      partialText,
      groups: mergedGroups,
      finished: Boolean(msg?.finished),
    });
  });

  ws.addEventListener("close", () => onState?.("closed"));
  ws.addEventListener("error", () => onState?.("error"));

  onState?.("streaming");
  const unlistenAudio = await listen("audio_chunk", (e) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const payload = e.payload;
    const u8 = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    ws.send(u8);
  });

  let stopped = false;
  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try {
        unlistenAudio?.();
      } catch {}
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(new Uint8Array());
      } catch {}
      try {
        ws.close();
      } catch {}
    },
  };
}
