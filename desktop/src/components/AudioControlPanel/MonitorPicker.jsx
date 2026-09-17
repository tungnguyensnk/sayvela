import { useEffect, useRef, useState } from "react";
import { highlightMonitor, listMonitors } from "../../services/screenService";

// windows hands back device paths like \\.\DISPLAY1, which say nothing to a reader
function friendlyName(name) {
  const bare = String(name || "").replace(/^\\\\[.?]\\/, "");
  const numbered = /^display\s*(\d+)$/i.exec(bare);
  return numbered ? `Display ${numbered[1]}` : bare || "Display";
}

// picks the monitor to capture; hovering an entry frames that screen in red so
// the user can tell the displays apart without reading device names
export function MonitorPicker({ value, onChange }) {
  const [monitors, setMonitors] = useState([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let alive = true;
    listMonitors().then((list) => alive && setMonitors(list));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  // the frame must never outlive the list it belongs to
  useEffect(() => {
    if (open) return undefined;
    highlightMonitor(null);
    return undefined;
  }, [open]);

  useEffect(() => () => highlightMonitor(null), []);

  const selected = monitors.find((m) => m.id === value) || monitors.find((m) => m.is_primary) || monitors[0];
  const label = (m) => (m ? `${friendlyName(m.name)} (${m.width}×${m.height})` : "detecting…");

  return (
    <div className="acp-monitorPicker" ref={rootRef}>
      <button type="button" className="input acp-monitorButton" onClick={() => setOpen((v) => !v)}>
        {label(selected)}
      </button>
      {open ? (
        <ul className="acp-monitorList" onMouseLeave={() => highlightMonitor(null)}>
          {monitors.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`acp-monitorItem${m.id === selected?.id ? " acp-monitorItem--active" : ""}`}
                onMouseEnter={() => highlightMonitor(m.id)}
                onClick={() => {
                  onChange?.(m.id);
                  setOpen(false);
                }}
              >
                {label(m)}
                {m.is_primary ? <span className="acp-monitorTag">primary</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
