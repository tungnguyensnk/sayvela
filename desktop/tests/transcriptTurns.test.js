import { describe, expect, it } from "vitest";
import { toTurns } from "../src/components/TranscriptPanel/TranscriptGrid.jsx";

const seg = (over) => ({
  sessionId: "sys",
  seq: 1,
  createdAt: 100,
  translationStatus: "original",
  isFinal: true,
  text: "hi",
  ...over,
});

describe("toTurns", () => {
  it("keeps the original and its translation in one turn", () => {
    const turns = toTurns([
      seg({ id: "a" }),
      seg({ id: "b", translationStatus: "translation", createdAt: 120 }),
    ]);

    expect(turns).toHaveLength(1);
    expect(turns[0].segments.map((s) => s.id)).toEqual(["a", "b"]);
    expect(turns[0].createdAt).toBe(100);
  });

  it("splits sources and orders turns oldest first", () => {
    const turns = toTurns([
      seg({ id: "late", seq: 2, createdAt: 300 }),
      seg({ id: "mic", sessionId: "mic", seq: 1, createdAt: 200 }),
      seg({ id: "early", createdAt: 100 }),
    ]);

    expect(turns.map((t) => t.segments[0].id)).toEqual(["early", "mic", "late"]);
    expect(turns[1].sessionId).toBe("mic");
  });
});
