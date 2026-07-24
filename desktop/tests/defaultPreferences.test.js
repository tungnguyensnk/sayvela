import { describe, expect, it } from "vitest";
import { mergePreferences } from "../src/config/defaultPreferences";

describe("tts preference migration", () => {
  it("uses boosted Soniox defaults", () => {
    const preferences = mergePreferences({});
    expect(preferences.micTtsSonioxSpeed).toBe(1.1);
    expect(preferences.micTtsSonioxVolume).toBe(2);
  });

  it("migrates the legacy built-in voice and preserves soniox voice", () => {
    expect(mergePreferences({ micTtsVoiceId: "legacy" }).micTtsVoiceIds).toEqual({ builtin: "legacy", soniox: "" });
    expect(mergePreferences({ micTtsVoiceId: "legacy", micTtsVoiceIds: { soniox: "Maya" } }).micTtsVoiceIds).toEqual({ builtin: "legacy", soniox: "Maya" });
  });
});
