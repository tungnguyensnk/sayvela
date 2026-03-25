import { ttsGetTestSentence, ttsSpeak } from "../../tts/ttsApi";

// provides controls for configuring text-to-speech output settings and testing the voice
export function TtsSection({
  micOutputLang,
  micTtsEnabled,
  onChangeMicTtsEnabled,
  micTtsOutputDeviceId,
  onChangeMicTtsOutputDeviceId,
  micTtsVoiceId,
  onChangeMicTtsVoiceId,
  micTtsRate,
  onChangeMicTtsRate,
  micTtsPitch,
  onChangeMicTtsPitch,
  micTtsVolume,
  onChangeMicTtsVolume,
  ttsOutputDevices,
  ttsVoices,
  ttsError,
}) {
  return (
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
              {d.name}
              {String(d?.name || "").toLowerCase().includes("cable")
                ? " (Recommended)"
                : ""}
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
              {v.name || v.id}
              {v.language ? ` (${v.language})` : ""}
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
              <div className="acp-sliderValue">
                {Number(micTtsRate ?? 1).toFixed(2)}
              </div>
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
              <div className="acp-sliderValue">
                {Number(micTtsPitch ?? 1).toFixed(2)}
              </div>
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
              <div className="acp-sliderValue">
                {Number(micTtsVolume ?? 1).toFixed(2)}
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary acp-ttsTestBtn"
            type="button"
            disabled={!micTtsEnabled}
            onClick={() => {
              ttsSpeak({
                text: ttsGetTestSentence(micOutputLang),
                language: micOutputLang || undefined,
                voiceId: micTtsVoiceId || undefined,
                outputDeviceId: micTtsOutputDeviceId || undefined,
                rate: micTtsRate,
                pitch: micTtsPitch,
                volume: micTtsVolume,
                queueMode: "add",
              }).catch((e) => console.error("TTS Test Error:", e));
            }}
          >
            test
          </button>
        </div>
      </div>

      {ttsError ? <div className="empty acp-error">{ttsError}</div> : null}
    </div>
  );
}
