import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers = new Map();
const onceHandlers = new Map();
const stop = vi.fn(async () => {});
const recording = {
  state: "recording",
  on: vi.fn((event, handler) => { handlers.set(event, handler); return recording; }),
  once: vi.fn((event, handler) => { onceHandlers.set(event, handler); return recording; }),
  stop,
};
const record = vi.fn(() => queueMicrotask(() => onceHandlers.get("connected")?.()) || recording);
const invoke = vi.fn(async () => ({ apiKey: "temporary-key" }));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@soniox/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SonioxClient: class {
      realtime = { record };
    },
  };
});
vi.mock("../src/transcript/tauriAudioSource.js", () => ({
  TauriAudioSource: class { constructor(eventName) { this.eventName = eventName; } },
}));

describe("startSonioxSession", () => {
  beforeEach(() => {
    handlers.clear();
    onceHandlers.clear();
    vi.clearAllMocks();
    recording.state = "recording";
  });

  it("configures the sdk and stops gracefully", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const session = await startSonioxSession({
      sampleRate: 48000,
      languageHints: ["vi"],
      targetLanguage: "ja",
      audioEventName: "audio_chunk_mic",
    });
    const options = record.mock.calls[0][0];
    expect(options).toMatchObject({
      model: "stt-rt-v5",
      audio_format: "pcm_s16le",
      sample_rate: 48000,
      num_channels: 1,
      language_hints: ["vi"],
      enable_endpoint_detection: true,
      max_endpoint_delay_ms: 900,
      auto_reconnect: true,
    });
    expect(options.source.eventName).toBe("audio_chunk_mic");
    await session.stop();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("force cancels when graceful stop times out", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => { recording.state = "canceled"; });
    recording.cancel = cancel;
    stop.mockImplementationOnce(() => new Promise(() => {}));
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const session = await startSonioxSession({});
    const stopping = session.stop();
    await vi.advanceTimersByTimeAsync(3000);
    await stopping;
    expect(cancel).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("maps sdk state and transcript results", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const onState = vi.fn();
    const onText = vi.fn();
    await startSonioxSession({ languageHints: ["vi"], targetLanguage: "ja", onState, onText });
    handlers.get("state_change")({ new_state: "recording" });
    handlers.get("result")({
      tokens: [{ text: "xin chào", language: "vi", translation_status: "original", is_final: true, start_ms: 0, end_ms: 100 }],
      final_audio_proc_ms: 100,
      total_audio_proc_ms: 100,
    });
    expect(onState).toHaveBeenCalledWith("streaming");
    expect(onText.mock.calls[0][0].groups[0].text).toBe("xin chào");
  });

  it("forwards runtime errors", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const onError = vi.fn();
    await startSonioxSession({ onError });
    const error = new Error("Soniox network error");
    handlers.get("error")(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("starts a new sys message after an endpoint", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const onText = vi.fn();
    const onTurnEnd = vi.fn();
    await startSonioxSession({ languageHints: ["vi"], targetLanguage: "ja", onText, onTurnEnd });
    const result = (text, start_ms, end_ms) => ({
      tokens: [{ text, language: "vi", translation_status: "original", is_final: true, start_ms, end_ms }],
      final_audio_proc_ms: end_ms,
      total_audio_proc_ms: end_ms,
    });
    handlers.get("result")(result("sys một", 0, 500));
    handlers.get("endpoint")();
    handlers.get("result")(result("sys hai", 2000, 2500));
    handlers.get("endpoint")();
    expect(onTurnEnd).toHaveBeenCalledTimes(2);
    expect(onTurnEnd.mock.calls.map(([group]) => group.seq)).toEqual([1, 2]);
    expect(onText.mock.lastCall[0].groups.map((group) => group.text)).toEqual(["sys một", "sys hai"]);
  });

  it("keeps finalized text visible while partial text changes", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const onText = vi.fn();
    const onTurnEnd = vi.fn();
    await startSonioxSession({ languageHints: ["vi"], targetLanguage: "ja", onText, onTurnEnd });
    const emit = (tokens, final_audio_proc_ms) => handlers.get("result")({ tokens, final_audio_proc_ms, total_audio_proc_ms: 300 });
    const token = (text, is_final, start_ms, end_ms) => ({ text, is_final, start_ms, end_ms, language: "vi", translation_status: "original" });
    emit([token("xin", true, 0, 100), token(" ch", false, 100, 180)], 100);
    expect(onText.mock.lastCall[0].groups[0]).toMatchObject({ finalText: "xin", partialText: " ch", text: "xin ch" });
    const id = onText.mock.lastCall[0].groups[0].id;
    emit([token(" chào", false, 100, 220)], 100);
    expect(onText.mock.lastCall[0].groups[0]).toMatchObject({ id, finalText: "xin", partialText: " chào", text: "xin chào" });
    emit([token(" chào", true, 100, 220), token(" bạn", false, 220, 300)], 220);
    expect(onText.mock.lastCall[0].groups[0]).toMatchObject({ id, finalText: "xin chào", partialText: " bạn", text: "xin chào bạn" });
    handlers.get("endpoint")();
    expect(onTurnEnd).toHaveBeenCalledOnce();
    expect(onTurnEnd.mock.calls[0][0]).toMatchObject({ id, finalText: "xin chào", partialText: "", text: "xin chào" });
  });

  it("pairs original and translation in the same message", async () => {
    const { startSonioxSession } = await import("../src/transcript/sonioxSession.js");
    const onText = vi.fn();
    await startSonioxSession({ languageHints: ["vi"], targetLanguage: "ja", onText });
    handlers.get("result")({
      tokens: [
        { text: "こんにちは", is_final: false, start_ms: 500, end_ms: 700, speaker: "1", language: "ja", translation_status: "translation" },
        { text: "xin chào", is_final: false, start_ms: 0, end_ms: 300, speaker: "1", language: "vi", translation_status: "original" },
      ],
      final_audio_proc_ms: 0,
      total_audio_proc_ms: 700,
    });
    const [original, translation] = onText.mock.lastCall[0].groups;
    expect(original.translationStatus).toBe("original");
    expect(translation).toMatchObject({ translationStatus: "translation", seq: original.seq, originId: original.id });
  });
});
