import { invoke } from "@tauri-apps/api/core";

export async function ttsGetVoices(language) {
  const voices = await invoke("tts_list_voices", { language: language || null });
  return Array.isArray(voices) ? voices : [];
}

export async function ttsSpeak(options) {
  return invoke("tts_speak", { options });
}

export async function ttsStop() {
  return invoke("tts_stop");
}
