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

export async function startSonioxSession({
  sampleRate = 48000,
  model = "stt-rt-v4",
  languageHints = ["vi", "en"],
  enableSpeakerDiarization = true,
  enableLanguageIdentification = true,
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
  ws.send(
    JSON.stringify({
      api_key: apiKey,
      audio_format: "pcm_s16le",
      sample_rate: sampleRate,
      num_channels: 1,
      model,
      language_hints: languageHints,
      enable_speaker_diarization: enableSpeakerDiarization,
      enable_language_identification: enableLanguageIdentification,
    }),
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
    const finalText = tokensToText(tokens, true);
    const partialText = tokensToText(tokens, false);
    onText?.({
      text: `${finalText}${partialText}`,
      finalText,
      partialText,
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
