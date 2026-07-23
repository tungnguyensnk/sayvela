import { beforeEach, describe, expect, it, vi } from "vitest";

let handler;
const unlisten = vi.fn();
const listen = vi.fn(async (_, callback) => {
  handler = callback;
  return unlisten;
});

vi.mock("@tauri-apps/api/event", () => ({ listen }));

describe("TauriAudioSource", () => {
  beforeEach(() => {
    handler = null;
    vi.clearAllMocks();
  });

  it("forwards pcm chunks and releases the listener", async () => {
    const { TauriAudioSource } = await import("../src/transcript/tauriAudioSource.js");
    const source = new TauriAudioSource("audio_chunk_mic");
    const onData = vi.fn();
    await source.start({ onData, onError: vi.fn() });
    handler({ payload: [1, 2, 255] });
    expect(listen).toHaveBeenCalledWith("audio_chunk_mic", expect.any(Function));
    expect([...new Uint8Array(onData.mock.calls[0][0])]).toEqual([1, 2, 255]);
    source.stop();
    source.stop();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it("reports unsupported payloads", async () => {
    const { TauriAudioSource } = await import("../src/transcript/tauriAudioSource.js");
    const onError = vi.fn();
    await new TauriAudioSource("audio").start({ onData: vi.fn(), onError });
    handler({ payload: "invalid" });
    expect(onError).toHaveBeenCalledWith(expect.any(TypeError));
  });
});
