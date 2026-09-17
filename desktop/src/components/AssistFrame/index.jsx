import { useState } from "react";
import { ActionIconButton } from "../astryx/AstryxControls";
import { CARD_COMPONENTS, FRAME_META } from "./cards";
import "./AssistFrame.css";

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

// one assist panel: newest card expanded, older ones collapsed to a title row
export function AssistFrame({ kind, frame, pending, onClose }) {
  const meta = FRAME_META[kind];
  const Card = CARD_COMPONENTS[kind];
  const items = frame?.items ?? [];
  const [openId, setOpenId] = useState(null);
  if (!meta || !Card) return null;
  const activeId = openId ?? items[0]?.id;

  return (
    <section className="panel assist-frame">
      <div className="panel-header af-header">
        <div className="panel-title af-title">
          <span className="af-icon">{meta.icon}</span>
          {meta.title}
          {pending ? <span className="af-pending" aria-label="working" /> : null}
        </div>
        <ActionIconButton
          className="af-close"
          label="close"
          icon={<CloseIcon />}
          onClick={() => onClose?.(kind)}
        />
      </div>
      <div className="af-body">
        {items.map((item) => {
          const expanded = item.id === activeId;
          return (
            <article key={item.id} className={`af-card${expanded ? " af-card--open" : ""}`}>
              {expanded ? (
                <Card item={item} />
              ) : (
                <button type="button" className="af-card-head" onClick={() => setOpenId(item.id)}>
                  <span className="af-card-label">{meta.label(item) || meta.title}</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
