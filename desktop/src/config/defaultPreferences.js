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
  assistAutoGate: false,
  assistHotkey: "CmdOrCtrl+Shift+Space",
  assistIntervalSec: 5,
  assistWindowSec: 90,
  assistMinGapSec: 8,
  assistIdleExitSec: 120,
  assistMonitorId: "",
  assistSendScreenshot: true,
};

// numeric assist preferences are clamped so a bad stored value cannot stall the loop
export const ASSIST_RANGES = {
  assistIntervalSec: [3, 15],
  assistWindowSec: [30, 300],
  assistMinGapSec: [0, 60],
  assistIdleExitSec: [30, 600],
};

function clampAssist(source) {
  const out = {};
  for (const [key, [min, max]] of Object.entries(ASSIST_RANGES)) {
    const value = Number(source[key] ?? DEFAULT_PREFERENCES[key]);
    out[key] = Number.isFinite(value) ? Math.min(Math.max(Math.round(value), min), max) : DEFAULT_PREFERENCES[key];
  }
  return out;
}

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
    ...clampAssist(source),
  };
}
