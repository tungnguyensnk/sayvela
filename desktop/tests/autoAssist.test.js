import { describe, expect, it } from "vitest";
import {
  buildTranscriptWindow,
  nextBackoff,
  pickSlot,
  summarizeTurn,
} from "../src/ai/autoAssist.js";

const now = 100_000;
const group = (over) => ({
  id: "g1",
  isFinal: true,
  translationStatus: "original",
  text: "hello",
  createdAt: now,
  sessionId: "sys",
  speaker: "1",
  ...over,
});

describe("buildTranscriptWindow", () => {
  it("labels speakers and keeps the last final original lines", () => {
    const out = buildTranscriptWindow(
      [
        group({ id: "a", text: "how do you handle lifetimes?" }),
        group({ id: "b", sessionId: "mic", speaker: "me", text: "let me think" }),
      ],
      { now }
    );

    expect(out.text).toBe("[Người khác 1] how do you handle lifetimes?\n[Tôi] let me think");
    expect(out.lastId).toBe("b");
    expect(out.count).toBe(2);
  });

  it("drops partials, translations, empties and stale lines", () => {
    const out = buildTranscriptWindow(
      [
        group({ id: "a", isFinal: false }),
        group({ id: "b", translationStatus: "translation" }),
        group({ id: "c", text: "   " }),
        group({ id: "d", createdAt: now - 200_000 }),
        group({ id: "e", finalText: "kept" }),
      ],
      { now, maxAgeMs: 90_000 }
    );

    expect(out.text).toBe("[Người khác 1] kept");
    expect(out.count).toBe(1);
  });

  it("caps the number of lines", () => {
    const groups = Array.from({ length: 20 }, (_, i) => group({ id: `g${i}`, text: `line ${i}` }));
    const out = buildTranscriptWindow(groups, { now, maxItems: 12 });

    expect(out.count).toBe(12);
    expect(out.lastId).toBe("g19");
    expect(out.text.startsWith("[Người khác 1] line 8")).toBe(true);
  });
});

describe("summarizeTurn", () => {
  it("condenses tool calls and trailing text", () => {
    const out = summarizeTurn(
      [
        { name: "suggest_answer", args: { question: "why rust?" } },
        { name: "show_code", args: { title: "retry helper" } },
      ],
      " waiting for details "
    );

    expect(out).toBe("[suggest_answer] why rust? | [show_code] retry helper | waiting for details");
  });
});

describe("pickSlot", () => {
  const frames = { qa: { updatedAt: 10 }, code: { updatedAt: 30 } };

  it("reuses the slot already holding the kind", () => {
    expect(pickSlot(["qa", "code"], frames, "code")).toBe(1);
  });

  it("takes a free slot first", () => {
    expect(pickSlot(["qa", null], frames, "code")).toBe(1);
  });

  it("evicts the least recently updated frame", () => {
    expect(pickSlot(["qa", "code"], frames, "guide")).toBe(0);
  });
});

describe("nextBackoff", () => {
  it("doubles up to the cap", () => {
    expect(nextBackoff(0)).toBe(5_000);
    expect(nextBackoff(5_000)).toBe(10_000);
    expect(nextBackoff(20_000)).toBe(30_000);
  });
});
