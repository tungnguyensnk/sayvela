import { LANGUAGES } from "../languages";

function LanguagePills({ selected, onChange, disabled }) {
  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="chips" style={{ marginTop: 4 }}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`chip ${selected.includes(l.code) ? "chip-active" : ""}`}
          disabled={disabled}
          onClick={() => toggle(l.code)}
          style={{ fontSize: 11, padding: "2px 6px" }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function LanguageDropdown({ value, onChange, disabled }) {
  return (
    <select
      className="select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 12 }}
    >
      <option value="">(None - Original)</option>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

export function AudioControlPanel({
  devices,
  loopbackDeviceId,
  onChangeLoopbackDeviceId,
  micDeviceId,
  onChangeMicDeviceId,
  running,
  onRefreshDevices,
  devicesError,
  loopbackBytes,
  micBytes,
  loopbackCaptureState,
  micCaptureState,
  
  // Loopback Language Props
  loopbackInputLangs,
  onChangeLoopbackInputLangs,
  loopbackOutputLang,
  onChangeLoopbackOutputLang,

  // Mic Language Props
  micInputLangs,
  onChangeMicInputLangs,
  micOutputLang,
  onChangeMicOutputLang,

  loopbackStatus,
  loopbackError,
  micStatus,
  micError,

  onStart,
  onStop,
}) {
  const loopbackDevices = devices.filter((d) => d.kind === "loopback");
  const micDevices = devices.filter((d) => d.kind === "microphone");

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Audio Configuration</div>
          <div className="panel-sub">Select sources and languages</div>
        </div>
      </div>
      <div style={{ padding: 12 }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Loopback Section */}
          <div className="field" style={{ marginBottom: 0 }}>
            <div className="label-row">
              <span className="label">System Audio (Speakers) </span>
              <span className="small">
                {loopbackCaptureState?.state || "stopped"} ({loopbackBytes} B) 
                {loopbackStatus && ` | ${loopbackStatus}`}
                {loopbackError && ` (${loopbackError})`}
              </span>
            </div>
            <select
              className="select"
              value={loopbackDeviceId}
              disabled={running}
              onChange={(e) => onChangeLoopbackDeviceId?.(e.target.value)}
            >
              {loopbackDevices.length === 0 ? (
                <option value="" disabled>No devices found</option>
              ) : (
                <option value="" disabled>Select device...</option>
              )}
              {loopbackDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            
            <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: "2px solid #333" }}>
              <div className="label" style={{ fontSize: 11 }}>Input Languages (Hints)</div>
              <LanguagePills 
                selected={loopbackInputLangs} 
                onChange={onChangeLoopbackInputLangs} 
                disabled={running} 
              />
              <div className="label" style={{ fontSize: 11, marginTop: 4 }}>Target Translation</div>
              <LanguageDropdown 
                value={loopbackOutputLang} 
                onChange={onChangeLoopbackOutputLang} 
                disabled={running} 
              />
            </div>
          </div>

          {/* Mic Section */}
          <div className="field" style={{ marginTop: 0 }}>
            <div className="label-row">
              <span className="label">Microphone (Me) </span>
              <span className="small">
                {micCaptureState?.state || "stopped"} ({micBytes} B)
                {micStatus && ` | ${micStatus}`}
                {micError && ` (${micError})`}
              </span>
            </div>
            <select
              className="select"
              value={micDeviceId}
              disabled={running}
              onChange={(e) => onChangeMicDeviceId?.(e.target.value)}
            >
              {micDevices.length === 0 ? (
                <option value="" disabled>No devices found</option>
              ) : (
                <option value="" disabled>Select device...</option>
              )}
              {micDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: "2px solid #333" }}>
              <div className="label" style={{ fontSize: 11 }}>Input Languages (Hints)</div>
              <LanguagePills 
                selected={micInputLangs} 
                onChange={onChangeMicInputLangs} 
                disabled={running} 
              />
              <div className="label" style={{ fontSize: 11, marginTop: 4 }}>Target Translation</div>
              <LanguageDropdown 
                value={micOutputLang} 
                onChange={onChangeMicOutputLang} 
                disabled={running} 
              />
            </div>
          </div>
        </div>

        {devicesError ? <div className="empty" style={{ marginTop: 8 }}>{devicesError}</div> : null}

        <div className="actions" style={{ marginTop: 16, borderTop: '1px solid #333', paddingTop: 12 }}>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={running}
            onClick={onRefreshDevices}
          >
            Refresh Devices
          </button>

          {!running ? (
            <button
              className="btn btn-primary"
              type="button"
              disabled={!loopbackDeviceId && !micDeviceId}
              onClick={onStart}
            >
              Start Transcription
            </button>
          ) : (
            <button className="btn btn-danger" type="button" onClick={onStop}>
              Stop All
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
