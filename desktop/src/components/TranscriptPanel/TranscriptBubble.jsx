// renders a single speech bubble containing finalized and partial transcript text
export function TranscriptBubble({ segments, isFinal, isTranslation }) {
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

        return (
          <span key={seg.id || i}>
            {finalText}
            {prefixSpace}
            {highlightText && <span className="text-partial">{highlightText}</span>}
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
