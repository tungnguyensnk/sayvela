// normalizes text by collapsing whitespace and removing spaces before punctuation
function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

// length of the longest common prefix of two strings
function commonPrefixLength(a, b) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

// tracks how much of each translation group has already been sent to tts so that
// hidden, reordered or revised groups never cause repeated or skipped speech
export function createTranslationSpeechQueue() {
  const spoken = new Map();
  const seenPartial = new Map();

  // keeps the part of a partial that stayed identical across two updates, so
  // revised tokens are never spoken before the model settles on them
  const stablePartial = (id, partial) => {
    const previous = seenPartial.get(id) || "";
    seenPartial.set(id, partial);
    if (!partial) return "";
    return partial.slice(0, commonPrefixLength(partial, previous));
  };

  // returns the text chunks to speak for one transcript snapshot, each tagged
  // with where it sits inside its transcript segment so playback can be tracked
  const collect = (groups, { speakPartial }) => {
    if (!Array.isArray(groups)) return [];
    const deltas = [];
    for (const group of groups) {
      const status = group?.translationStatus;
      if (!status || status === "original") continue;
      const id = String(group?.id || "");
      if (!id) continue;
      const finalText = String(group?.finalText || "");
      const partial = speakPartial ? String(group?.partialText || "") : "";
      const text = normalizeText(finalText + stablePartial(id, partial));
      if (!text) continue;
      const said = spoken.get(id) || "";
      if (text === said) continue;
      let offset;
      if (text.startsWith(said)) offset = said.length;
      else if (said.startsWith(text)) continue;
      else offset = commonPrefixLength(text, said);
      const delta = text.slice(offset);
      if (!delta.trim()) continue;
      spoken.set(id, text);
      deltas.push({ text: delta, markerId: id, markerOffset: offset });
    }
    return deltas;
  };

  // marks everything currently on screen as already spoken, so transcript left
  // over from an earlier session is never replayed when speech resumes
  const seed = (groups) => {
    if (!Array.isArray(groups)) return;
    for (const group of groups) {
      const status = group?.translationStatus;
      if (!status || status === "original") continue;
      const id = String(group?.id || "");
      if (!id) continue;
      const partial = String(group?.partialText || "");
      const text = normalizeText(String(group?.finalText || "") + partial);
      seenPartial.set(id, partial);
      if (text) spoken.set(id, text);
    }
  };

  const reset = () => {
    spoken.clear();
    seenPartial.clear();
  };

  return { collect, seed, reset };
}
