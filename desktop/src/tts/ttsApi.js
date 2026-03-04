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

export async function ttsSpeak(options) {
  return invoke("tts_speak", { options });
}

export async function ttsStop() {
  return invoke("tts_stop");
}
