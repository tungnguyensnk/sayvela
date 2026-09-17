import { LanguageMultiSelect, LanguageDropdown } from "./LanguageControls";

// renders a section for configuring a specific audio source (e.g., microphone or system audio)
export function SourceSection({
  title,
  subtitle,
  error,
  deviceId,
  devices,
  running,
  onChangeDeviceId,
  inputLangs,
  onChangeInputLangs,
  outputLang,
  onChangeOutputLang,
  aside,
  children,
}) {
  const flow = [inputLangs?.join(", "), outputLang].filter(Boolean).join(" → ");
  return (
    <div className="acp-source">
      <div className="acp-sourceHeader">
        <div className="acp-sourceTitle">{title}</div>
        {subtitle && <div className="acp-sourceMeta">{subtitle}</div>}
        {error && <div className="acp-sourceMeta acp-sourceMeta--error">{error}</div>}
        <div className="acp-sourceFlow">{flow}</div>
      </div>

      <div className="acp-fields">
        <div className={`acp-field${aside ? "" : " acp-field--wide"}`}>
          <div className="acp-subLabel">Device</div>
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
        </div>

        {aside}

        <div className="acp-field">
          <div className="acp-subLabel">Input Languages (Hints)</div>
          <LanguageMultiSelect
            selected={inputLangs}
            onChange={onChangeInputLangs}
            disabled={running}
          />
        </div>

        <div className="acp-field">
          <div className="acp-subLabel">Target Translation</div>
          <LanguageDropdown
            value={outputLang}
            onChange={onChangeOutputLang}
            disabled={running}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
