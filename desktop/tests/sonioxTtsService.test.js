import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { loadSonioxVoices, SONIOX_BUILTIN_VOICES } = await import("../src/services/sonioxTtsService");

describe("soniox tts service", () => {
  beforeEach(() => invoke.mockReset());

  it("keeps every built-in voice independent of language", () => {
    expect(SONIOX_BUILTIN_VOICES).toHaveLength(28);
    expect(SONIOX_BUILTIN_VOICES.every((voice) => voice.group === "builtin" && voice.ready)).toBe(true);
  });

  it("orders clones first and maps readiness", async () => {
    invoke.mockResolvedValue([
      { id: "ready", name: "Ready", model: "tts-rt-v1", status: "ready" },
      { id: "pending", name: "Pending", model: "tts-rt-v1", status: "training" },
    ]);
    const voices = await loadSonioxVoices();
    expect(voices.slice(0, 2)).toMatchObject([
      { id: "ready", group: "clone", ready: true },
      { id: "pending", group: "clone", ready: false },
    ]);
    expect(voices[2]).toMatchObject({ id: "Maya", group: "builtin" });
  });
});
