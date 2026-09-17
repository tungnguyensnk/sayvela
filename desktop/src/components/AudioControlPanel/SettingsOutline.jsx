import { useEffect, useState } from "react";

export const SETTINGS_SECTIONS = [
  { id: "system-audio", label: "System Audio" },
  { id: "microphone", label: "Microphone (Me)" },
  { id: "ai-assist", label: "AI Assist" },
  { id: "privacy", label: "Privacy" },
];

// how far below the top of the scroller a section still counts as the current one
const ACTIVE_OFFSET_PX = 90;

// sticky outline that highlights whichever section the reader scrolled to
export function SettingsOutline({ scrollRef }) {
  const [activeId, setActiveId] = useState(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;
    const update = () => {
      // at the very bottom the last section is what the reader is looking at
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        setActiveId(SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id);
        return;
      }
      const rootTop = root.getBoundingClientRect().top;
      const current = SETTINGS_SECTIONS.filter(({ id }) => {
        const el = root.querySelector(`#${id}`);
        return el && el.getBoundingClientRect().top - rootTop <= ACTIVE_OFFSET_PX;
      }).pop();
      setActiveId(current?.id ?? SETTINGS_SECTIONS[0].id);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    return () => root.removeEventListener("scroll", update);
  }, [scrollRef]);

  const jumpTo = (id) => {
    scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="acp-outline">
      <div className="acp-outline-title">ON THIS PAGE</div>
      {SETTINGS_SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`acp-outline-item${activeId === id ? " acp-outline-item--active" : ""}`}
          onClick={() => jumpTo(id)}
        >
          <span className="acp-outline-dot" />
          {label}
        </button>
      ))}
      <div className="acp-outline-note">The section you scroll to lights up.</div>
    </aside>
  );
}
