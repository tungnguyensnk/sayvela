import { useEffect, useState } from "react";
import { listDisguises } from "../../services/disguiseService";

const SAYVELA = { id: "", title: "Sayvela", src: "/sayvela-app-icon.svg" };

// grid of app icons the window can pass for; only apps installed here show up
export function DisguisePicker({ value = "", onChange }) {
  const [options, setOptions] = useState(null);

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
  const current = tiles.some((t) => t.id === value) ? value : "";

  return (
    <div className="acp-disguise" role="radiogroup" aria-label="App icon">
      {tiles.map((t) => (
        <button
          key={t.id || "sayvela"}
          type="button"
          role="radio"
          aria-checked={t.id === current}
          className={`acp-disguiseTile${t.id === current ? " acp-disguiseTile--active" : ""}`}
          title={t.title}
          onClick={() => onChange?.(t.id)}
        >
          <img className="acp-disguiseIcon" src={t.src} alt="" draggable="false" />
          <span className="acp-disguiseName">{t.title}</span>
        </button>
      ))}
      {options === null ? <span className="acp-disguiseHint">looking for installed apps…</span> : null}
    </div>
  );
}
