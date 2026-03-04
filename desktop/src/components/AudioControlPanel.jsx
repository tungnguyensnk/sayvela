import { LANGUAGES } from "../languages";
import { useEffect, useState } from "react";
import { ttsGetVoices, ttsSpeak } from "../tts/ttsApi";
import "./AudioControlPanel.css";

function LanguagePills({ selected, onChange, disabled }) {
  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="chips acp-pills">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`chip ${selected.includes(l.code) ? "chip-active" : ""}`}
          disabled={disabled}
          onClick={() => toggle(l.code)}
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
      className="select acp-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
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
  micTtsEnabled,
  onChangeMicTtsEnabled,
  micTtsVoiceId,
  onChangeMicTtsVoiceId,
  micTtsRate,
  onChangeMicTtsRate,
  micTtsPitch,
  onChangeMicTtsPitch,
  micTtsVolume,
  onChangeMicTtsVolume,
  micTtsOutputDeviceId,
  onChangeMicTtsOutputDeviceId,

  loopbackStatus,
  loopbackError,
  micStatus,
  micError,

  onStart,
  onStop,
}) {
  const loopbackDevices = devices.filter((d) => d.kind === "loopback");
  const ttsOutputDevices = loopbackDevices
    .filter((d) => d.id !== "default-loopback")
    .slice()
    .sort((a, b) => {
      const aName = String(a?.name || "");
      const bName = String(b?.name || "");
      const aCable = aName.toLowerCase().includes("cable") ? 1 : 0;
      const bCable = bName.toLowerCase().includes("cable") ? 1 : 0;
      if (aCable !== bCable) return bCable - aCable;
      return aName.localeCompare(bName);
    });
  const micDevices = devices.filter((d) => d.kind === "microphone");
  const [ttsVoices, setTtsVoices] = useState([]);
  const [ttsError, setTtsError] = useState("");

  useEffect(() => {
    let alive = true;
    setTtsError("");
    ttsGetVoices()
      .then((v) => {
        if (!alive) return;
        setTtsVoices(Array.isArray(v) ? v : []);
      })
      .catch((e) => {
        if (!alive) return;
        setTtsVoices([]);
        setTtsError(String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Audio Configuration</div>
          <div className="panel-sub">Select sources and languages</div>
        </div>
      </div>
      <div className="acp-body">
        <div className="acp-grid">
          {/* Loopback Section */}
          <div className="card acp-source">
            <div className="acp-sourceHeader">
              <div className="acp-sourceTitle">System Audio (Speakers)</div>
              <div className="acp-sourceMeta">
                {loopbackCaptureState?.state || "stopped"} ({loopbackBytes} B)
                {loopbackStatus && ` | ${loopbackStatus}`}
                {loopbackError && ` (${loopbackError})`}
              </div>
            </div>
            <select
              className="select acp-select"
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

            <div className="acp-subsection">
              <div className="acp-subLabel">Input Languages (Hints)</div>
              <LanguagePills 
                selected={loopbackInputLangs} 
                onChange={onChangeLoopbackInputLangs} 
                disabled={running} 
              />
              <div className="acp-subLabel">Target Translation</div>
              <LanguageDropdown 
                value={loopbackOutputLang} 
                onChange={onChangeLoopbackOutputLang} 
                disabled={running} 
              />
            </div>
          </div>

          {/* Mic Section */}
          <div className="card acp-source">
            <div className="acp-sourceHeader">
              <div className="acp-sourceTitle">Microphone (Me)</div>
              <div className="acp-sourceMeta">
                {micCaptureState?.state || "stopped"} ({micBytes} B)
                {micStatus && ` | ${micStatus}`}
                {micError && ` (${micError})`}
              </div>
            </div>
            <select
              className="select acp-select"
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

            <div className="acp-subsection">
              <div className="acp-subLabel">Input Languages (Hints)</div>
              <LanguagePills 
                selected={micInputLangs} 
                onChange={onChangeMicInputLangs} 
                disabled={running} 
              />
              <div className="acp-subLabel">Target Translation</div>
              <LanguageDropdown 
                value={micOutputLang} 
                onChange={onChangeMicOutputLang} 
                disabled={running} 
              />

              <div className="acp-ttsSection">
                <div className="acp-ttsHeader">
                  <div className="acp-subLabel">TTS (ME translation)</div>
                  <label className="acp-checkboxRow">
                    <input
                      type="checkbox"
                      checked={Boolean(micTtsEnabled)}
                      onChange={(e) => onChangeMicTtsEnabled?.(e.target.checked)}
                    />
                    enable
                  </label>
                </div>

                <div className="acp-ttsSelectRow">
                  <select
                    className="select acp-select"
                    value={micTtsOutputDeviceId || "default-loopback"}
                    disabled={!micTtsEnabled}
                    onChange={(e) => onChangeMicTtsOutputDeviceId?.(e.target.value)}
                  >
                    <option value="default-loopback">Default Output Device</option>
                    {ttsOutputDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{String(d?.name || "").toLowerCase().includes("cable") ? " (Recommended)" : ""}
                      </option>
                    ))}
                  </select>

                  <select
                    className="select acp-select"
                    value={micTtsVoiceId || ""}
                    disabled={!micTtsEnabled}
                    onChange={(e) => onChangeMicTtsVoiceId?.(e.target.value)}
                  >
                    <option value="">Auto by language</option>
                    {ttsVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name || v.id}{v.language ? ` (${v.language})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="acp-ttsControls">
                  <div className="acp-ttsBottomRow">
                    <div className="acp-ttsSliders">
                      <div className="acp-sliderRow">
                        <div className="acp-sliderLabel">rate</div>
                        <input
                          className="acp-range"
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.05"
                          value={Number(micTtsRate ?? 1)}
                          disabled={!micTtsEnabled}
                          onChange={(e) => onChangeMicTtsRate?.(Number(e.target.value))}
                        />
                        <div className="acp-sliderValue">{Number(micTtsRate ?? 1).toFixed(2)}</div>
                      </div>
                      <div className="acp-sliderRow">
                        <div className="acp-sliderLabel">pitch</div>
                        <input
                          className="acp-range"
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.05"
                          value={Number(micTtsPitch ?? 1)}
                          disabled={!micTtsEnabled}
                          onChange={(e) => onChangeMicTtsPitch?.(Number(e.target.value))}
                        />
                        <div className="acp-sliderValue">{Number(micTtsPitch ?? 1).toFixed(2)}</div>
                      </div>
                      <div className="acp-sliderRow">
                        <div className="acp-sliderLabel">volume</div>
                        <input
                          className="acp-range"
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={Number(micTtsVolume ?? 1)}
                          disabled={!micTtsEnabled}
                          onChange={(e) => onChangeMicTtsVolume?.(Number(e.target.value))}
                        />
                        <div className="acp-sliderValue">{Number(micTtsVolume ?? 1).toFixed(2)}</div>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary acp-ttsTestBtn"
                      type="button"
                      disabled={!micTtsEnabled}
                      onClick={() => {
                        ttsSpeak({
                          text: "test",
                          language: micOutputLang || undefined,
                          voiceId: micTtsVoiceId || undefined,
                          outputDeviceId: micTtsOutputDeviceId || undefined,
                          rate: micTtsRate,
                          pitch: micTtsPitch,
                          volume: micTtsVolume,
                          queueMode: "add",
                        }).catch(() => {});
                      }}
                    >
                      test
                    </button>
                  </div>
                </div>

                {ttsError ? <div className="empty acp-error">{ttsError}</div> : null}
              </div>
            </div>
          </div>
        </div>

        {devicesError ? <div className="empty acp-error">{devicesError}</div> : null}

        <div className="acp-footer">
          <div className="actions">
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
      </div>
    </section>
  );
}
