import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ASSIST_RANGES } from "../../config/defaultPreferences";
import { setHotkeyPaused } from "../../store/assistSlice";
import { HotkeyDialog, formatCombo } from "./HotkeyDialog";
import { MonitorPicker } from "./MonitorPicker";
import { Toggle } from "./Toggle";

const NUMBER_FIELDS = [
  {
    key: "assistIntervalSec",
    label: "Gate every (s)",
    help: "How often the small model looks at the conversation to decide whether you need help. Lower reacts sooner, higher costs less.",
  },
  {
    key: "assistWindowSec",
    label: "Transcript window (s)",
    help: "How far back the conversation is sent along each time. Longer gives the AI more context but a bigger prompt.",
  },
  {
    key: "assistMinGapSec",
    label: "Min gap (s)",
    help: "Shortest wait between two assist answers, so a fast conversation does not flood you with panels.",
  },
  {
    key: "assistIdleExitSec",
    label: "Idle exit (s)",
    help: "Assist switches itself back to watching after this long without anything new being said.",
  },
];

// settings for the auto assist loop: screen source, hotkey and timings
export function AssistSection({ values, onChange }) {
  const dispatch = useDispatch();
  const [editingHotkey, setEditingHotkey] = useState(false);
  const hotkeyError = useSelector((s) => s.assist.hotkeyError);

  // the shortcut is grabbed globally, so release it while the dialog listens
  const openHotkeyDialog = () => {
    dispatch(setHotkeyPaused(true));
    setEditingHotkey(true);
  };

  const closeHotkeyDialog = () => {
    setEditingHotkey(false);
    dispatch(setHotkeyPaused(false));
  };

  return (
    <div className="acp-source">
      <div className="acp-sourceHeader">
        <div className="acp-sourceTitle">AI Assist</div>
        <span className="acp-help" tabIndex="0" aria-label="AI Assist help" data-tooltip="A small model reads the newest transcript lines every few seconds. When someone asks something you could use help with, the main model opens an answer, how-to or code panel beside the chat. The hotkey starts it right away.">?</span>
      </div>

      <div className="acp-fields">
        <div className="acp-field">
          <div className="acp-subLabel">Screen</div>
          <MonitorPicker value={values.assistMonitorId} onChange={onChange.assistMonitorId} />
        </div>

        <div className="acp-field">
          <div className="acp-subLabel">Hotkey</div>
          <button type="button" className="input acp-hotkeyButton" onClick={openHotkeyDialog}>
            {formatCombo(values.assistHotkey) || "not set"}
          </button>
          {hotkeyError ? <div className="acp-assistError">{hotkeyError}</div> : null}
        </div>

        <div className="acp-numberRow">
          {NUMBER_FIELDS.map(({ key, label, help }) => (
          <div className="acp-field" key={key}>
            <div className="acp-labelRow">
              <div className="acp-subLabel">{label}</div>
              <span className="acp-help" tabIndex="0" aria-label={`${label} help`} data-tooltip={help}>
                ?
              </span>
            </div>
            <input
              className="input"
              type="number"
              min={ASSIST_RANGES[key][0]}
              max={ASSIST_RANGES[key][1]}
              value={values[key]}
              onChange={(e) => onChange[key](Number(e.target.value))}
            />
          </div>
          ))}
        </div>
      </div>

      <div className="acp-toggleRow">
        <Toggle
          checked={values.assistAutoGate}
          onChange={onChange.assistAutoGate}
          label="Live AI"
          help="Lets a small model watch the conversation and turn the assistant on by itself. With this off, only the hotkey or the bolt button starts it."
        />
        <Toggle
          checked={values.assistSendScreenshot}
          onChange={onChange.assistSendScreenshot}
          label="Screenshot"
          help="Sends a picture of the selected screen with every assist turn, so the AI can answer about what is on your screen, not just what was said."
        />
      </div>

      <HotkeyDialog
        open={editingHotkey}
        value={values.assistHotkey}
        onCancel={closeHotkeyDialog}
        onSave={(combo) => {
          onChange.assistHotkey(combo);
          closeHotkeyDialog();
        }}
      />
    </div>
  );
}
