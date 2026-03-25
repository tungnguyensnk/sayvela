import { LanguagePills, LanguageDropdown } from "./LanguageControls";

// renders a section for configuring a specific audio source (e.g., microphone or system audio)
export function SourceSection({
  title,
  captureState,
  bytes,
  status,
  error,
  deviceId,
  devices,
  running,
  onChangeDeviceId,
  inputLangs,
  onChangeInputLangs,
  outputLang,
  onChangeOutputLang,
  children,
}) {
  return (
    <div className="card acp-source">
      <div className="acp-sourceHeader">
        <div className="acp-sourceTitle">{title}</div>
        <div className="acp-sourceMeta">
          {captureState?.state || "stopped"} ({bytes} B)
          {status && ` | ${status}`}
          {error && ` (${error})`}
        </div>
      </div>
      <select
        className="select acp-select"
        value={deviceId}
        disabled={running}
        onChange={(e) => onChangeDeviceId?.(e.target.value)}
      >
        {devices.length === 0 ? (
          <option value="" disabled>No devices found</option>
        ) : (
          <option value="" disabled>Select device...</option>
        )}
        {devices.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <div className="acp-subsection">
        <div className="acp-subLabel">Input Languages (Hints)</div>
        <LanguagePills 
          selected={inputLangs} 
          onChange={onChangeInputLangs} 
          disabled={running} 
        />
        <div className="acp-subLabel">Target Translation</div>
        <LanguageDropdown 
          value={outputLang} 
          onChange={onChangeOutputLang} 
          disabled={running} 
        />
        {children}
      </div>
    </div>
  );
}
