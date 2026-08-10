import { describe, expect, it } from "vitest";
import { createTranscriptMapper } from "../src/transcript/sonioxTranscript.js";
import { createTranslationSpeechQueue } from "../src/tts/translationSpeechQueue.js";

const orig = (text, is_final, start_ms, end_ms) => ({
  text, is_final, start_ms, end_ms,
  speaker: "1", language: "vi", translation_status: "original",
});

const trans = (text, is_final, start_ms, end_ms) => ({
  text, is_final, start_ms, end_ms,
  speaker: "1", language: "ja", source_language: "vi", translation_status: "translation",
});

// runs a token script through the mapper and the tts queue, returning what is spoken
function runScenario(steps) {
  const queue = createTranslationSpeechQueue();
  const spoken = [];
  const mapper = createTranscriptMapper({
    languageHints: ["vi"],
    targetLanguage: "ja",
    speakerOverride: "me",
    onText: ({ groups }) => spoken.push(...queue.collect(groups, { speakPartial: true }).map((d) => d.text)),
    onEndpoint: () => spoken.push("[end]"),
  });
  for (const step of steps) {
    if (step === "endpoint") mapper.endpoint();
    else mapper.add({ tokens: step, final_audio_proc_ms: 0, total_audio_proc_ms: 0 }, 0);
  }
  return spoken;
}

describe("translation speech queue", () => {
  it("speaks each utterance exactly once", () => {
    const steps = [];
    const vi = ["xin chào", "bạn khỏe không", "hẹn gặp lại"];
    const ja = ["こんにちは", "元気ですか", "またね"];
    for (let i = 0; i < 3; i += 1) {
      const t = i * 3000;
      steps.push([orig(vi[i], false, t, t + 400)]);
      steps.push([orig(vi[i], true, t, t + 400), trans(ja[i].slice(0, 2), false, t, t + 400)]);
      steps.push([trans(ja[i].slice(0, 4), false, t, t + 400)]);
      steps.push([trans(ja[i], true, t, t + 400)]);
      steps.push("endpoint");
    }
    const spoken = runScenario(steps);
    expect(spoken.filter((s) => s !== "[end]").join("")).toBe(ja.join(""));
  });

  it("does not repeat a translation that stabilizes without a paired original", () => {
    const spoken = runScenario([
      [orig("xin chào", true, 0, 400)],
      "endpoint",
      [trans("こんにちは", true, 0, 400)],
      [trans("元気ですか", true, 3000, 3600)],
      [trans("またね", true, 6000, 6400)],
    ]);
    expect(spoken.join("")).toBe("[end]こんにちは元気ですかまたね");
  });

  it("withholds partial text until it stops being revised", () => {
    const spoken = runScenario([
      [orig("chào buổi tối", true, 0, 600)],
      [trans("こん", false, 0, 600)],
      [trans("こんばんは", false, 0, 600)],
      [trans("こんばんは、元気", false, 0, 600)],
      [trans("こんばんは。", true, 0, 600)],
      "endpoint",
    ]);
    expect(spoken.join("")).toBe("こんばんは。[end]");
  });

  it("does not replay the previous session when a new one starts", () => {
    const queue = createTranslationSpeechQueue();
    const groups = [
      { id: "a", translationStatus: "translation", finalText: "こんにちは", partialText: "" },
      { id: "b", translationStatus: "translation", finalText: "元気ですか", partialText: "" },
    ];
    expect(queue.collect(groups, { speakPartial: true }).map((d) => d.text)).toEqual(["こんにちは", "元気ですか"]);

    // stopping clears the queue while the transcript stays on screen
    queue.reset();
    // starting again adopts what is already displayed instead of re-speaking it
    queue.seed(groups);
    expect(queue.collect(groups, { speakPartial: true }).map((d) => d.text)).toEqual([]);

    const withNewUtterance = [...groups, { id: "c", translationStatus: "translation", finalText: "またね", partialText: "" }];
    expect(queue.collect(withNewUtterance, { speakPartial: true }).map((d) => d.text)).toEqual(["またね"]);
  });

  it("adopts a translation that lands after the session stopped", () => {
    const queue = createTranslationSpeechQueue();
    const spokenDuringSession = [
      { id: "a", translationStatus: "translation", finalText: "こんにちは", partialText: "" },
    ];
    expect(queue.collect(spokenDuringSession, { speakPartial: true }).map((d) => d.text)).toEqual(["こんにちは"]);

    // the last translation arrives after stop, so it never gets spoken
    const afterStop = [
      ...spokenDuringSession,
      { id: "b", translationStatus: "translation", finalText: "またね", partialText: "" },
    ];
    queue.reset();
    queue.seed(afterStop);
    expect(queue.collect(afterStop, { speakPartial: true }).map((d) => d.text)).toEqual([]);
  });

  it("tags each chunk with where it sits inside its segment", () => {
    const queue = createTranslationSpeechQueue();
    const first = queue.collect(
      [{ id: "a", translationStatus: "translation", finalText: "こんにちは", partialText: "" }],
      { speakPartial: true },
    );
    expect(first).toEqual([{ text: "こんにちは", markerId: "a", markerOffset: 0 }]);

    // the segment grows, so the next chunk starts where the previous one ended
    const second = queue.collect(
      [{ id: "a", translationStatus: "translation", finalText: "こんにちは、元気ですか", partialText: "" }],
      { speakPartial: true },
    );
    expect(second).toEqual([{ text: "、元気ですか", markerId: "a", markerOffset: 5 }]);
  });

  it("speaks nothing twice when a group is hidden and restored", () => {
    const spoken = runScenario([
      [orig("xin chào", false, 0, 400), trans("こんにちは", false, 0, 400)],
      [orig("xin chào", true, 0, 400), trans("こんにちは", true, 0, 400)],
      [orig("bạn khỏe", true, 3000, 3400), trans("元気", true, 3000, 3400)],
      [orig("hẹn gặp", true, 6000, 6400), trans("またね", true, 6000, 6400)],
      "endpoint",
    ]);
    const said = spoken.filter((s) => s !== "[end]").join("");
    expect(said).toBe("こんにちは元気またね");
  });
});
