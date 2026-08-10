// splits text by how far the voice has read it. while speaking, everything read
// so far is underlined; once it stops, only the last sound stays marked so the
// position it reached is still visible
function speechParts(text, spokenChars, { done, holdsEnd }) {
  const cut = Math.max(0, Math.min(spokenChars, text.length));
  if (!done) {
    return [
      { text: text.slice(0, cut), voiced: true },
      { text: text.slice(cut) },
    ];
  }
  if (!holdsEnd) return [{ text }];
  const lastSound = Math.max(0, cut - 1);
  return [
    { text: text.slice(0, lastSound) },
    { text: text.slice(lastSound, cut), end: true },
    { text: text.slice(cut) },
  ];
}

// renders one run of text with the styling its speech state calls for
function renderParts(parts, baseClass) {
  return parts
    .filter((part) => part.text)
    .map((part, index) => {
      const className = [baseClass, part.voiced && "text-voiced", part.end && "text-voiced-end"]
        .filter(Boolean)
        .join(" ");
      return className ? (
        <span key={index} className={className}>
          {part.text}
        </span>
      ) : (
        part.text
      );
    });
}

// renders a single speech bubble containing finalized and partial transcript text
export function TranscriptBubble({ segments, isFinal, isTranslation, speech }) {
  const content =
    Array.isArray(segments) && segments.length > 0 ? (
      segments.map((seg, i) => {
        const finalText = seg.finalText || "";
        const partialText = seg.partialText || "";

        let prefixSpace = "";
        let highlightText = partialText;
        if (partialText.startsWith(" ")) {
          prefixSpace = " ";
          highlightText = partialText.slice(1);
        }

        const active = speech && speech.markerId === seg.id;
        const spokenChars = active ? speech.charIndex : 0;
        const done = Boolean(active && speech.done);
        // the last sound sits wherever the reading stopped, final text or partial
        const endInPartial = spokenChars > finalText.length;

        return (
          <span key={seg.id || i}>
            {renderParts(speechParts(finalText, spokenChars, { done, holdsEnd: !endInPartial }), "")}
            {prefixSpace}
            {renderParts(
              speechParts(highlightText, spokenChars - finalText.length, {
                done,
                holdsEnd: endInPartial,
              }),
              "text-partial",
            )}
            {i < segments.length - 1 && <br />}
          </span>
        );
      })
    ) : (
      "-"
    );

  return (
    <div className={`bubble ${isFinal ? "" : "partial"}`}>
      <span className={`bubble-text ${isTranslation ? "translation" : ""}`}>{content}</span>
    </div>
  );
}
