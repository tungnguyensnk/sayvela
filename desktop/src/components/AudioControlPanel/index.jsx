import { useEffect, useState } from "react";
import { ttsGetVoices } from "../../tts/ttsApi";
import { SourceSection } from "./SourceSection";
import { TtsSection } from "./TtsSection";
import "./AudioControlPanel.css";

// main control panel for configuring audio inputs, outputs, languages, and tts settings
export function AudioControlPanel({
  devices,
  loopbackDeviceId,
  onChangeLoopbackDeviceId,
  loopbackContext,
  onChangeLoopbackContext,
  micDeviceId,
  onChangeMicDeviceId,
  contentProtectionEnabled,
  onChangeContentProtectionEnabled,
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
          <SourceSection
            title="System Audio (Speakers)"
            captureState={loopbackCaptureState}
            bytes={loopbackBytes}
            status={loopbackStatus}
            error={loopbackError}
            deviceId={loopbackDeviceId}
            devices={loopbackDevices}
            running={running}
            onChangeDeviceId={onChangeLoopbackDeviceId}
            inputLangs={loopbackInputLangs}
            onChangeInputLangs={onChangeLoopbackInputLangs}
            outputLang={loopbackOutputLang}
            onChangeOutputLang={onChangeLoopbackOutputLang}
          >
            <div className="acp-subLabel">Context</div>
            <textarea
              className="input acp-contextTextarea"
              value={loopbackContext || ""}
              disabled={running}
              onChange={(e) => onChangeLoopbackContext?.(e.target.value)}
              placeholder='{"general":[{"domain":"...","topic":"..."}],"terms":["..."]}'
            />
            <div className="hint">json object or plain text</div>
          </SourceSection>

          {/* Mic Section */}
          <SourceSection
            title="Microphone (Me)"
            captureState={micCaptureState}
            bytes={micBytes}
            status={micStatus}
            error={micError}
            deviceId={micDeviceId}
            devices={micDevices}
            running={running}
            onChangeDeviceId={onChangeMicDeviceId}
            inputLangs={micInputLangs}
            onChangeInputLangs={onChangeMicInputLangs}
            outputLang={micOutputLang}
            onChangeOutputLang={onChangeMicOutputLang}
          >
            <TtsSection
              micOutputLang={micOutputLang}
              micTtsEnabled={micTtsEnabled}
              onChangeMicTtsEnabled={onChangeMicTtsEnabled}
              micTtsOutputDeviceId={micTtsOutputDeviceId}
              onChangeMicTtsOutputDeviceId={onChangeMicTtsOutputDeviceId}
              micTtsVoiceId={micTtsVoiceId}
              onChangeMicTtsVoiceId={onChangeMicTtsVoiceId}
              micTtsRate={micTtsRate}
              onChangeMicTtsRate={onChangeMicTtsRate}
              micTtsPitch={micTtsPitch}
              onChangeMicTtsPitch={onChangeMicTtsPitch}
              micTtsVolume={micTtsVolume}
              onChangeMicTtsVolume={onChangeMicTtsVolume}
              ttsOutputDevices={ttsOutputDevices}
              ttsVoices={ttsVoices}
              ttsError={ttsError}
            />
          </SourceSection>
        </div>

        {devicesError ? <div className="empty acp-error">{devicesError}</div> : null}

        <div className="acp-footer">
          <label className="acp-checkboxRow">
            <input
              type="checkbox"
              checked={Boolean(contentProtectionEnabled)}
              onChange={(e) => onChangeContentProtectionEnabled?.(e.target.checked)}
            />
            hide app in screen share/recording
          </label>
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
