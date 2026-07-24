import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ttsGetTestSentence, ttsSpeak } from "../../tts/ttsApi";
import { ActionButton } from "../astryx/AstryxControls";
import { SonioxSettingsModal } from "./SonioxSettingsModal";
import { VbCableInstallModal } from "./VbCableInstallModal";

// provides controls for configuring text-to-speech output settings and testing the voice
export function TtsSection({
  micOutputLang,
  micTtsEnabled,
  onChangeMicTtsEnabled,
  micTtsOutputDeviceId,
  onChangeMicTtsOutputDeviceId,
  micTtsProvider,
  onChangeMicTtsProvider,
  micTtsVoiceIds,
  onChangeMicTtsVoiceIds,
  micTtsSonioxSpeed,
  onChangeMicTtsSonioxSpeed,
  micTtsRate,
  onChangeMicTtsRate,
  micTtsPitch,
  onChangeMicTtsPitch,
  micTtsVolume,
  onChangeMicTtsVolume,
  micTtsSonioxVolume,
  onChangeMicTtsSonioxVolume,
  ttsOutputDevices,
  ttsVoices,
  sonioxVoices,
  sonioxKeyExists,
  sonioxLoading,
  onReloadSoniox,
  onRefreshDevices,
  ttsError,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testError, setTestError] = useState("");
  const [installOpen, setInstallOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const provider = micTtsProvider === "soniox" ? "soniox" : "builtin";
  const volume = provider === "soniox" ? micTtsSonioxVolume : micTtsVolume;
  const voiceId = micTtsVoiceIds?.[provider] || "";
  const cloneVoices = sonioxVoices.filter((voice) => voice.group === "clone");
  const builtinVoices = sonioxVoices.filter((voice) => voice.group === "builtin");
  const testDisabled = !micTtsEnabled || (provider === "soniox" && (!sonioxKeyExists || !voiceId || sonioxLoading));
  const changeVoice = (value) => onChangeMicTtsVoiceIds?.({ ...micTtsVoiceIds, [provider]: value });
  const recommendedOutput = ttsOutputDevices.find((device) => /^cable input \(vb-audio virtual cable\)$/i.test(String(device?.name || "")))
    || ttsOutputDevices.find((device) => String(device?.name || "").toLowerCase().includes("cable input"));
  const hasVbCable = Boolean(recommendedOutput);
  // enables tts immediately or requests vb-cable installation when unavailable
  const changeEnabled = (enabled) => {
    if (enabled && !hasVbCable) {
      setInstallError("");
      setInstallOpen(true);
      return;
    }
    if (enabled && (!micTtsOutputDeviceId || micTtsOutputDeviceId === "default-loopback")) {
      onChangeMicTtsOutputDeviceId?.(recommendedOutput.id);
    }
    onChangeMicTtsEnabled?.(enabled);
  };
  // installs vb-cable then refreshes devices before enabling tts
  const installVbCable = async () => {
    setInstalling(true);
    setInstallError("");
    try {
      await invoke("install_vb_cable");
      const devices = await onRefreshDevices?.();
      const outputs = (Array.isArray(devices) ? devices : []).filter((device) => device.kind === "loopback");
      const recommended = outputs.find((device) => /^cable input \(vb-audio virtual cable\)$/i.test(String(device?.name || "")))
        || outputs.find((device) => String(device?.name || "").toLowerCase().includes("cable input"));
      if (recommended) onChangeMicTtsOutputDeviceId?.(recommended.id);
      setInstallOpen(false);
    } catch (error) {
      setInstallError(String(error));
    } finally {
      setInstalling(false);
    }
  };
  const test = async () => {
    setTestError("");
    try {
      await ttsSpeak({
        text: ttsGetTestSentence(micOutputLang), language: micOutputLang || undefined,
        provider, voiceId: voiceId || undefined, outputDeviceId: micTtsOutputDeviceId || undefined,
        rate: micTtsRate, pitch: micTtsPitch, speed: micTtsSonioxSpeed,
        volume, queueMode: "add",
      });
    } catch (e) {
      setTestError(String(e));
    }
  };
  return (
    <div className="acp-ttsSection">
      <div className="acp-ttsHeader">
        <div className="acp-ttsTitle">
          <div className="acp-subLabel">TTS (ME translation)</div>
          <span
            className="acp-ttsHelp"
            tabIndex="0"
            aria-label="TTS routing help"
            data-tooltip="In the app where you want to use the translated voice, open Microphone settings and select CABLE Output (VB-Audio Virtual Cable) as the input device."
          >?</span>
        </div>
        <label className="acp-checkboxRow">
          <input
            type="checkbox"
            checked={Boolean(micTtsEnabled)}
            onChange={(e) => changeEnabled(e.target.checked)}
          />
          enable
        </label>
      </div>

      <div className="acp-ttsProviderRow">
        <select className="select acp-select" value={provider} disabled={!micTtsEnabled} onChange={(e) => onChangeMicTtsProvider?.(e.target.value)}>
          <option value="builtin">Built in</option>
          <option value="soniox">Soniox</option>
        </select>
        {provider === "soniox" ? <ActionButton type="button" onClick={() => setSettingsOpen(true)}>Soniox setting</ActionButton> : null}
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
          className="select acp-select acp-ttsVoiceSelect"
          value={voiceId}
          disabled={!micTtsEnabled}
          onChange={(e) => changeVoice(e.target.value)}
        >
          <option value="">{provider === "builtin" ? "Auto by language" : "Select voice"}</option>
          {provider === "builtin" ? ttsVoices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name || v.id}
              {v.language ? ` (${v.language})` : ""}
            </option>
          )) : <>
            <optgroup label="Clone Voice">{cloneVoices.map((v) => <option key={v.id} value={v.id} disabled={!v.ready}>{v.name || v.id}{v.ready ? "" : ` (${v.status || "unavailable"})`}</option>)}</optgroup>
            <optgroup label="Built in">{builtinVoices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
          </>}
        </select>
      </div>

      <div className="acp-ttsControls">
        <div className="acp-ttsBottomRow">
          <div className="acp-ttsSliders">
            {provider === "builtin" ? <><div className="acp-sliderRow">
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
            </div></> : <div className="acp-sliderRow">
              <div className="acp-sliderLabel">speed</div>
              <input className="acp-range" type="range" min="0.7" max="1.3" step="0.05" value={Number(micTtsSonioxSpeed ?? 1)} disabled={!micTtsEnabled} onChange={(e) => onChangeMicTtsSonioxSpeed?.(Number(e.target.value))} />
              <div className="acp-sliderValue">{Number(micTtsSonioxSpeed ?? 1).toFixed(2)}</div>
            </div>}
            <div className="acp-sliderRow">
              <div className="acp-sliderLabel">volume</div>
              <input
                className="acp-range"
                type="range"
                min="0"
                max={provider === "soniox" ? "2" : "1"}
                step="0.05"
                value={Number(volume ?? (provider === "soniox" ? 2 : 1))}
                disabled={!micTtsEnabled}
                onChange={(e) => (provider === "soniox" ? onChangeMicTtsSonioxVolume : onChangeMicTtsVolume)?.(Number(e.target.value))}
              />
              <div className="acp-sliderValue">
                {Number(volume ?? (provider === "soniox" ? 2 : 1)).toFixed(2)}
              </div>
            </div>
          </div>

          <ActionButton
            className="acp-ttsTestBtn"
            type="button"
            disabled={testDisabled}
            onClick={test}
          >
            test
          </ActionButton>
        </div>
      </div>

      {ttsError || testError ? <div className="empty acp-error">{ttsError || testError}</div> : null}
      <SonioxSettingsModal open={settingsOpen} exists={sonioxKeyExists} onClose={() => setSettingsOpen(false)} onChanged={onReloadSoniox} />
      <VbCableInstallModal open={installOpen} installing={installing} error={installError} onCancel={() => setInstallOpen(false)} onInstall={installVbCable} />
    </div>
  );
}
