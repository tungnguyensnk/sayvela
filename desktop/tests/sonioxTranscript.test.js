import { describe, expect, it, vi } from "vitest";
import { createTranscriptMapper } from "../src/transcript/sonioxTranscript";

describe("createTranscriptMapper", () => {
  it("adds the session offset to segment timestamps", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({
      languageHints: ["vi"],
      targetLanguage: "ja",
      onTurnEnd,
    });

    mapper.add({
      tokens: [{ text: "xin chào", is_final: true, start_ms: 20, end_ms: 120, language: "vi", translation_status: "original" }],
      final_audio_proc_ms: 120,
      total_audio_proc_ms: 120,
    }, 2500);
    mapper.endpoint();

    expect(onTurnEnd).toHaveBeenCalledWith(expect.objectContaining({ startMs: 2520, endMs: 2620 }));
  });
});
