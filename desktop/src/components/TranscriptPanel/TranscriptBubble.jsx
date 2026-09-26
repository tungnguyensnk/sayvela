// marks how far the voice has read; once it has finished nothing stays marked
function speechParts(text, spokenChars) {
  const cut = Math.max(0, Math.min(spokenChars, text.length));
  return [
    { text: text.slice(0, cut), voiced: true },
    { text: text.slice(cut) },
  ];
}

// renders one run of text with the styling its speech state calls for
function renderParts(parts, baseClass) {
  return parts
    .filter((part) => part.text)
    .map((part, index) => {
      const className = [baseClass, part.voiced && "text-voiced"].filter(Boolean).join(" ");
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

        return (
          <span key={seg.id || i}>
            {renderParts(speechParts(finalText, spokenChars), "")}
            {prefixSpace}
            {renderParts(speechParts(highlightText, spokenChars - finalText.length), "text-partial")}
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
