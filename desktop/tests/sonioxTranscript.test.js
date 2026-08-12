import { describe, expect, it, vi } from "vitest";
import { version } from "uuid";
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
    expect(version(onTurnEnd.mock.calls[0][0].id)).toBe(7);
  });

  it("never lets a later original adopt a translation from an earlier utterance", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({
      languageHints: ["ja"],
      targetLanguage: "vi",
      onTurnEnd,
    });

    mapper.add({
      tokens: [{ text: "Câu cũ", is_final: true, start_ms: 0, end_ms: 100, speaker: "1", language: "vi", translation_status: "translation" }],
      final_audio_proc_ms: 100,
      total_audio_proc_ms: 100,
    });
    mapper.endpoint();
    mapper.add({
      tokens: [{ text: "新しい文", is_final: true, start_ms: 500, end_ms: 600, speaker: "1", language: "ja", translation_status: "original" }],
      final_audio_proc_ms: 600,
      total_audio_proc_ms: 600,
    });
    mapper.endpoint();

    const groups = onTurnEnd.mock.calls.map(([group]) => group);
    const stale = groups.find((group) => group.finalText === "Câu cũ");
    const fresh = groups.find((group) => group.finalText === "新しい文");
    expect(stale.originId).toBeNull();
    expect(stale.seq).not.toBe(fresh.seq);
  });

  it("still emits a translation that never found its original", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({
      languageHints: ["ja"],
      targetLanguage: "vi",
      onTurnEnd,
    });

    mapper.add({
      tokens: [{ text: "Không có gốc", is_final: true, start_ms: 0, end_ms: 100, speaker: "1", language: "vi", translation_status: "translation" }],
      final_audio_proc_ms: 100,
      total_audio_proc_ms: 100,
    });
    mapper.endpoint();

    expect(onTurnEnd).toHaveBeenCalledWith(
      expect.objectContaining({ translationStatus: "translation", finalText: "Không có gốc", originId: null }),
    );
  });
});
