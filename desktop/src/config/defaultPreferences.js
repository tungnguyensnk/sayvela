export const DEFAULT_PREFERENCES = {
  loopbackDeviceId: "default-loopback",
  loopbackInputLangs: ["ja", "en"],
  loopbackOutputLang: "vi",
  loopbackContextId: null,
  micDeviceId: "default-mic",
  micInputLangs: ["vi"],
  micOutputLang: "ja",
  micTtsEnabled: false,
  micTtsProvider: "builtin",
  micTtsVoiceIds: { builtin: "", soniox: "" },
  micTtsSonioxSpeed: 1.1,
  micTtsRate: 1.1,
  micTtsPitch: 1,
  micTtsVolume: 1,
  micTtsSonioxVolume: 2,
  micTtsOutputDeviceId: "default-loopback",
  contentProtectionEnabled: true,
};

export function mergePreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const voiceIds = source.micTtsVoiceIds && typeof source.micTtsVoiceIds === "object"
    ? source.micTtsVoiceIds
    : {};
  return {
    ...DEFAULT_PREFERENCES,
    ...source,
    micTtsVoiceIds: {
      builtin: voiceIds.builtin || source.micTtsVoiceId || "",
      soniox: voiceIds.soniox || "",
    },
  };
}
