import { invoke } from "@tauri-apps/api/core";

const TEST_SENTENCE_BY_LANG = {
  vi: "Không có gì quý hơn độc lập tự do cả.",
  en: "To be, or not to be, that is the question.",
  ja: "千里の道も一歩から。",
  ko: "천 리 길도 한 걸음부터.",
  zh: "千里之行，始于足下。",
  fr: "Liberté, égalité, fraternité.",
  de: "Wer nicht wagt, der nicht gewinnt.",
};

// fetches the list of available text-to-speech voices from the backend
export async function ttsGetVoices(language) {
  const voices = await invoke("tts_list_voices", { language: language || null });
  return Array.isArray(voices) ? voices : [];
}

export function ttsGetTestSentence(language) {
  const key = String(language || "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return TEST_SENTENCE_BY_LANG[key] || TEST_SENTENCE_BY_LANG.en;
}

// sends a request to the backend to synthesize and play text
export async function ttsSpeak(options) {
  return invoke("tts_speak", { options: { provider: "builtin", ...options } });
}

// sends a request to the backend to stop all currently playing tts audio
export async function ttsStop() {
  return invoke("tts_stop");
}

// starts an isolated tts session after discarding all previous session state
export async function ttsStart() {
  return invoke("tts_start");
}

// preconnects soniox without creating a synthesis stream or disturbing playback
export function ttsPrewarm() {
  return invoke("tts_speak", { options: { text: "", provider: "soniox", prewarm: true, queueMode: "add" } });
}

// closes the open soniox synthesis stream at an utterance boundary
export function ttsEndStream() {
  return invoke("tts_speak", { options: { text: "", provider: "soniox", streamEnd: true, queueMode: "add" } });
}
