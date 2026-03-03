import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

function tokenIsFinal(t) {
  return Boolean(t?.is_final ?? t?.isFinal);
}

function tokensToText(tokens, wantFinal) {
  if (!Array.isArray(tokens)) return "";
  return tokens
    .filter((t) => tokenIsFinal(t) === wantFinal)
    .map((t) => (typeof t?.text === "string" ? t.text : ""))
    .join("");
}

function sortGroups(groups) {
  const statusOrder = (s) => (s === "original" ? 0 : 1);
  groups.sort((a, b) => {
    const sa = Number(a.speaker);
    const sb = Number(b.speaker);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    if (a.speaker !== b.speaker) return a.speaker.localeCompare(b.speaker);
    const ao = statusOrder(a.translationStatus);
    const bo = statusOrder(b.translationStatus);
    if (ao !== bo) return ao - bo;
    return a.language.localeCompare(b.language);
  });
  return groups;
}

function groupTokens(tokens) {
  if (!Array.isArray(tokens)) return [];
  const map = new Map();
  for (const t of tokens) {
    const speaker = String(t?.speaker ?? "0");
    const language = typeof t?.language === "string" ? t.language : "";
    const translationStatus =
      typeof t?.translation_status === "string"
        ? t.translation_status
        : typeof t?.translationStatus === "string"
          ? t.translationStatus
          : "original";
    const key = `${speaker}|${language}|${translationStatus}`;
    let g = map.get(key);
    if (!g) {
      g = {
        speaker,
        language,
        translationStatus,
        finalTokens: [],
        partialTokens: [],
      };
      map.set(key, g);
    }
    if (tokenIsFinal(t)) g.finalTokens.push(t);
    else g.partialTokens.push(t);
  }

  const out = [];
  for (const g of map.values()) {
    const finalText = g.finalTokens.map((t) => (typeof t?.text === "string" ? t.text : "")).join("");
    const partialText = g.partialTokens.map((t) => (typeof t?.text === "string" ? t.text : "")).join("");
    out.push({
      speaker: g.speaker,
      language: g.language,
      translationStatus: g.translationStatus,
      finalText,
      partialText,
      text: `${finalText}${partialText}`,
      isFinal: partialText.length === 0,
    });
  }

  return sortGroups(out);
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

  const finalByKey = new Map();
  const partialByKey = new Map();
  const metaByKey = new Map();

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
    const tokens = msg?.tokens;
    const msgGroups = groupTokens(tokens);
    for (const g of msgGroups) {
      const key = `${g.speaker}|${g.language}|${g.translationStatus}`;
      metaByKey.set(key, {
        speaker: g.speaker,
        language: g.language,
        translationStatus: g.translationStatus,
      });
      if (g.finalText) {
        finalByKey.set(key, `${finalByKey.get(key) || ""}${g.finalText}`);
      }
      partialByKey.set(key, g.partialText || "");
    }

    const mergedGroups = [];
    for (const key of new Set([...metaByKey.keys(), ...finalByKey.keys(), ...partialByKey.keys()])) {
      const meta = metaByKey.get(key) || {};
      const finalText = finalByKey.get(key) || "";
      const partialText = partialByKey.get(key) || "";
      mergedGroups.push({
        speaker: String(meta.speaker ?? "0"),
        language: String(meta.language ?? ""),
        translationStatus: String(meta.translationStatus ?? "original"),
        finalText,
        partialText,
        text: `${finalText}${partialText}`,
        isFinal: partialText.length === 0,
      });
    }
    sortGroups(mergedGroups);

    const finalText = mergedGroups.map((g) => g.finalText).join("");
    const partialText = mergedGroups.map((g) => g.partialText).join("");
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
