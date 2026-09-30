import { invoke } from "@tauri-apps/api/core";

export const SONIOX_BUILTIN_VOICES = [
  "Maya", "Daniel", "Noah", "Nina", "Emma", "Jack", "Adrian", "Claire", "Grace", "Owen",
  "Mina", "Kenji", "Rafael", "Mateo", "Lucia", "Sofia", "Oliver", "Arthur", "Isla", "Victoria",
  "Cooper", "Mason", "Ruby", "Elise", "Arjun", "Rohan", "Priya", "Meera",
].map((name) => ({ id: name, name, group: "builtin", ready: true }));

let cachedVoices = null;
let loadingVoices = null;

// stores the long-lived key in the operating system credential vault
export function setSonioxApiKey(apiKey) {
  cachedVoices = null;
  return invoke("soniox_set_api_key", { apiKey });
}

// removes the long-lived key from the operating system credential vault
export function deleteSonioxApiKey() {
  cachedVoices = null;
  return invoke("soniox_delete_api_key");
}

// checks key availability without exposing its value
export function hasSonioxApiKey() {
  return invoke("soniox_has_api_key");
}

// loads and normalizes cloned voices before built-in voices
export function getCachedSonioxVoices() {
  return cachedVoices || SONIOX_BUILTIN_VOICES;
}

// loads cloned voices once and reuses them when the settings panel remounts
export async function loadSonioxVoices(force = false) {
  if (!force && cachedVoices) return cachedVoices;
  if (!force && loadingVoices) return loadingVoices;
  loadingVoices = invoke("soniox_list_voices").then((voices) => {
    const clones = (Array.isArray(voices) ? voices : []).map((voice) => ({
      ...voice,
      group: "clone",
      ready: voice.model === "tts-rt-v2" && voice.status === "ready",
    }));
    cachedVoices = [...clones, ...SONIOX_BUILTIN_VOICES];
    return cachedVoices;
  }).finally(() => {
    loadingVoices = null;
  });
  return loadingVoices;
}
