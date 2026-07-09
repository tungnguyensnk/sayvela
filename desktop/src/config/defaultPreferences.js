export const DEFAULT_PREFERENCES = {
  loopbackDeviceId: "default-loopback",
  loopbackInputLangs: ["ja", "en"],
  loopbackOutputLang: "vi",
  loopbackContextId: null,
  micDeviceId: "default-mic",
  micInputLangs: ["vi"],
  micOutputLang: "ja",
  micTtsEnabled: false,
  micTtsVoiceId: "",
  micTtsRate: 1.1,
  micTtsPitch: 1,
  micTtsVolume: 1,
  micTtsOutputDeviceId: "default-loopback",
  contentProtectionEnabled: true,
};

export function mergePreferences(value) {
  return { ...DEFAULT_PREFERENCES, ...(value && typeof value === "object" ? value : {}) };
}
