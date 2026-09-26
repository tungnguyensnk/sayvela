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

  it("pins speech start to the wall clock once an offset is known", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({ languageHints: ["vi"], targetLanguage: "ja", onTurnEnd });
    const token = (start_ms) => ({ text: "a", is_final: true, start_ms, end_ms: start_ms + 50, language: "vi", translation_status: "original" });

    mapper.add({ tokens: [token(20)], total_audio_proc_ms: 70 });
    mapper.endpoint();
    mapper.add({ tokens: [token(500)], total_audio_proc_ms: 550 }, 2500, 1_700_000_000_000);
    mapper.endpoint();

    const [first, second] = onTurnEnd.mock.calls.map(([group]) => group);
    expect(first.startAt).toBeNull();
    expect(second.startAt).toBe(1_700_000_000_000 + 3000);
  });

  it("joins a translation that lands after the endpoint to its original", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({ languageHints: ["vi"], targetLanguage: "ja", speakerOverride: "me", onTurnEnd });

    mapper.add({
      tokens: [{ text: "Đang làm gì vậy?", is_final: true, start_ms: 0, end_ms: 800, language: "vi", translation_status: "original" }],
      total_audio_proc_ms: 800,
    });
    mapper.endpoint();
    mapper.add({
      tokens: [{ text: "今、何してるの？", is_final: true, start_ms: 0, end_ms: 800, language: "ja", translation_status: "translation" }],
      total_audio_proc_ms: 900,
    });
    mapper.endpoint();

    const groups = onTurnEnd.mock.calls.map(([group]) => group);
    const original = groups.find((group) => group.translationStatus === "original");
    const translation = groups.find((group) => group.translationStatus === "translation");
    expect(translation.originId).toBe(original.id);
    expect(translation.seq).toBe(original.seq);
  });

  it("keeps a late translation apart from the next sentence's translation", () => {
    const onTurnEnd = vi.fn();
    const mapper = createTranscriptMapper({ languageHints: ["vi"], targetLanguage: "ja", speakerOverride: "me", onTurnEnd });
    const orig = (text, start_ms, end_ms) => ({ text, is_final: true, start_ms, end_ms, language: "vi", translation_status: "original" });
    const trans = (text) => ({ text, is_final: true, language: "ja", translation_status: "translation" });

    mapper.add({ tokens: [orig("Ok.", 0, 300)], total_audio_proc_ms: 300, final_audio_proc_ms: 300 });
    mapper.endpoint();
    // the translation of the closed sentence lands after the endpoint
    mapper.add({ tokens: [trans("はい。")], total_audio_proc_ms: 400, final_audio_proc_ms: 400 });
    // the next sentence arrives together with its own translation
    mapper.add({ tokens: [orig("Nó đẩy dấu đuôi.", 1000, 2500), trans("それ、語尾の記号を押し出してる")], total_audio_proc_ms: 2500, final_audio_proc_ms: 2500 });
    mapper.endpoint();

    const groups = onTurnEnd.mock.calls.map(([group]) => group);
    const [first, second] = ["Ok.", "Nó đẩy dấu đuôi."].map((text) => groups.find((group) => group.finalText === text));
    expect(groups.find((group) => group.finalText === "はい。").originId).toBe(first.id);
    const late = groups.find((group) => group.finalText === "それ、語尾の記号を押し出してる");
    expect(late.originId).toBe(second.id);
    expect(late.seq).toBe(second.seq);
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
