import { useLayoutEffect, useRef, useState } from "react";
import { Markdown } from "@astryxdesign/core/Markdown";
import { parseCitations } from "../../chat/parseCitations.js";

function CitationPopover({ refData, popoverRef, style }) {
  const items = refData.items || [];
  return (
    <div ref={popoverRef} className="ai-cite-popover" style={style} role="tooltip">
      {items.slice(0, 3).map((item, i) => (
        <a key={`${item.url}-${i}`} className="ai-cite-card" href={item.url || undefined} target="_blank" rel="noreferrer">
          <div className="ai-cite-site">🎁 {item.attribution}</div>
          <div className="ai-cite-title">{item.title}</div>
          {item.snippet ? <div className="ai-cite-snippet">{item.snippet}</div> : null}
        </a>
      ))}
    </div>
  );
}

function CitationPill({ refData }) {
  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const [style, setStyle] = useState(null);
  const extra = Math.max((refData.count || 1) - 1, 0);

  useLayoutEffect(() => {
    const update = () => {
      const wrap = wrapRef.current;
      const popover = popoverRef.current;
      if (!wrap || !popover) return;
      const rect = wrap.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const gap = 8;
      const margin = 12;
      const width = Math.min(340, window.innerWidth - margin * 2);
      const height = popoverRect.height || 180;
      const showBelow = rect.top < height + gap + margin;
      const top = showBelow ? rect.bottom + gap : rect.top - height - gap;
      const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
      setStyle({ left, top, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);

  return (
    <span ref={wrapRef} className="ai-cite-wrap">
      <button type="button" className="ai-cite-pill">
        <span className="ai-cite-icon">🎁</span>
        <span className="ai-cite-label">{refData.label}</span>
        {extra ? <span className="ai-cite-extra">+{extra}</span> : null}
      </button>
      <CitationPopover refData={refData} popoverRef={popoverRef} style={style || undefined} />
    </span>
  );
}

export function ChatMessageContent({ text, contentReferences, isStreaming }) {
  const segments = parseCitations(text, contentReferences);
  return segments.map((segment, i) => {
    if (segment.type === "citation") return <CitationPill key={`cite-${i}`} refData={segment.ref} />;
    return (
      <Markdown key={`md-${i}`} density="compact" isStreaming={isStreaming} autolink="gfm">
        {segment.text}
      </Markdown>
    );
  });
}
