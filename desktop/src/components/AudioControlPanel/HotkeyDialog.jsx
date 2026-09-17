import { useCallback, useEffect, useRef, useState } from "react";
import { CommonModal } from "../CommonModal";
import { ActionButton } from "../astryx/AstryxControls";
import { startHotkeyCapture } from "../../services/hotkeyService";

const CLICK_BUTTONS = ["MouseLeft", "MouseRight"];

const LABELS = {
  Ctrl: "Ctrl",
  ControlLeft: "L Ctrl",
  ControlRight: "R Ctrl",
  Alt: "Alt",
  AltLeft: "L Alt",
  AltRight: "R Alt",
  Shift: "Shift",
  ShiftLeft: "L Shift",
  ShiftRight: "R Shift",
  Win: "Win",
  MetaLeft: "L Win",
  MetaRight: "R Win",
  MouseLeft: "Left click",
  MouseRight: "Right click",
  MouseMiddle: "Middle click",
  MouseX1: "Mouse 4",
  MouseX2: "Mouse 5",
};

// a bare left or right click would swallow every normal click
export function comboProblem(combo) {
  if (!combo) return "nothing pressed yet";
  const parts = combo.split("+");
  if (CLICK_BUTTONS.includes(parts[parts.length - 1]) && parts.length === 1) {
    return "a plain click fires on every click — add a modifier";
  }
  return "";
}

export function formatCombo(combo) {
  if (!combo) return "";
  return combo
    .split("+")
    .map((part) => LABELS[part] || part.replace(/^Key/, "").replace(/^Digit/, ""))
    .join(" + ");
}

// shows the combo as it is pressed and only writes it back when saved
export function HotkeyDialog({ open, value, onCancel, onSave }) {
  const [combo, setCombo] = useState(value || "");
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const cancel = useCallback(() => cancelRef.current?.(), []);

  useEffect(() => {
    if (open) setCombo(value || "");
  }, [open, value]);

  // callers pass fresh closures on every render; keeping them out of the effect
  // deps stops capture from being torn down and restarted after each key

  // the global hooks report the keys, so side aware keys and mouse buttons work
  // even when the webview would not see them
  useEffect(() => {
    if (!open) return undefined;
    let stop = null;
    let cancelled = false;
    startHotkeyCapture((next) => {
      if (next) setCombo(next);
    }).then((fn) => {
      if (cancelled) fn?.();
      else stop = fn;
    });
    const onKeyDown = (event) => {
      if (event.code === "Escape") cancelRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      stop?.();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const problem = comboProblem(combo);

  return (
    <CommonModal
      open={open}
      title="Set hotkey"
      onClose={cancel}
      className="acp-hotkeyModal"
      footer={<>
        <ActionButton type="button" onClick={cancel}>Cancel</ActionButton>
        <ActionButton type="button" variant="primary" disabled={Boolean(problem)} onClick={() => onSave?.(combo)}>
          Save
        </ActionButton>
      </>}
    >
      <div className="acp-hotkeyCapture">{formatCombo(combo) || "nothing pressed yet"}</div>
      <div className={problem && combo ? "acp-assistError" : "hint"}>
        {problem && combo ? problem : "Press a key, combo or mouse button. Esc to cancel."}
      </div>
    </CommonModal>
  );
}
