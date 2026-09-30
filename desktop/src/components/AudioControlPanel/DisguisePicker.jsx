import { useEffect, useState } from "react";
import { listDisguises } from "../../services/disguiseService";
import { CommonModal } from "../CommonModal";
import { ActionButton } from "../astryx/AstryxControls";

const SAYVELA = { id: "", title: "Default", src: "/sayvela-app-icon.svg" };

// shows the current app icon; the grid of icons the window can pass for opens in a modal
export function DisguisePicker({ value = "", onChange }) {
  const [options, setOptions] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    listDisguises().then((list) => alive && setOptions(list));
    return () => {
      alive = false;
    };
  }, []);

  const tiles = [
    SAYVELA,
    ...(options ?? []).map((o) => ({ id: o.id, title: o.title, src: `data:image/png;base64,${o.icon}` })),
  ];
  // a saved id missing on this machine is shown as sayvela, matching what the window does
  const selected = tiles.find((t) => t.id === value) ?? SAYVELA;

  return (
    <div className="acp-disguiseCurrent">
      <img className="acp-disguiseIcon" src={selected.src} alt="" draggable="false" />
      <span className="acp-disguiseCurrentName">{selected.title}</span>
      <ActionButton type="button" size="sm" onClick={() => setOpen(true)}>
        Edit
      </ActionButton>
      <CommonModal open={open} title="App icon" onClose={() => setOpen(false)}>
        <div className="acp-disguise" role="radiogroup" aria-label="App icon">
          {tiles.map((t) => (
            <button
              key={t.id || "sayvela"}
              type="button"
              role="radio"
              aria-checked={t.id === selected.id}
              className={`acp-disguiseTile${t.id === selected.id ? " acp-disguiseTile--active" : ""}`}
              title={t.title}
              onClick={() => {
                onChange?.(t.id);
                setOpen(false);
              }}
            >
              <img className="acp-disguiseIcon" src={t.src} alt="" draggable="false" />
              <span className="acp-disguiseName">{t.title}</span>
            </button>
          ))}
          {options === null ? <span className="acp-disguiseHint">looking for installed apps…</span> : null}
        </div>
      </CommonModal>
    </div>
  );
}
