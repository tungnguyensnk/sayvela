import { useState } from "react";
import { useDispatch } from "react-redux";
import { Toggle } from "./Toggle";
import { invoke } from "@tauri-apps/api/core";
import { ttsGetTestSentence, ttsSpeak } from "../../tts/ttsApi";
import { setHotkeyPaused } from "../../store/assistSlice";
import { ActionButton } from "../astryx/AstryxControls";
import { HotkeyDialog, formatCombo } from "./HotkeyDialog";
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
  micPassthroughHotkey,
  onChangeMicPassthroughHotkey,
}) {
  const dispatch = useDispatch();
  const [editingHotkey, setEditingHotkey] = useState(false);
  // the shortcut is grabbed globally, so release it while the dialog listens
  const editHotkey = (open) => {
    dispatch(setHotkeyPaused(open));
    setEditingHotkey(open);
  };
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
    // turning tts on routes it to the virtual cable, which is the whole point of
    // the feature; picking another output afterwards still sticks
    if (enabled && micTtsOutputDeviceId !== recommendedOutput.id) {
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
            className="acp-help"
            tabIndex="0"
            aria-label="TTS routing help"
            data-tooltip="In the app where you want to use the translated voice, open Microphone settings and select CABLE Output (VB-Audio Virtual Cable) as the input device."
          >?</span>
        </div>
        <Toggle checked={micTtsEnabled} onChange={changeEnabled} />
        <div className="acp-ttsPassthrough">
          <div className="acp-subLabel">Your voice hotkey</div>
          <span
            className="acp-help"
            tabIndex="0"
            aria-label="Your voice hotkey help"
            data-tooltip="While recording, this key clears the queued translation and sends your own microphone straight to the TTS output instead. Tap to switch it on or off; hold to switch only until you let go."
          >?</span>
          <button
            type="button"
            className="input acp-hotkeyButton acp-ttsHotkey"
            disabled={!micTtsEnabled}
            onClick={() => editHotkey(true)}
          >
            {formatCombo(micPassthroughHotkey) || "not set"}
          </button>
        </div>
      </div>

      <div className="acp-ttsSelectRow">
        <div className="acp-field">
          <div className="acp-subLabel">Device</div>
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
        </div>

        <div className="acp-field">
          <div className="acp-subLabel">Provider</div>
          <div className="acp-ttsProviderRow">
            <select className="select acp-select" value={provider} disabled={!micTtsEnabled} onChange={(e) => onChangeMicTtsProvider?.(e.target.value)}>
              <option value="builtin">Built in</option>
              <option value="soniox">Soniox</option>
            </select>
            {provider === "soniox" ? (
              <ActionButton type="button" size="sm" onClick={() => setSettingsOpen(true)}>
                Setting
              </ActionButton>
            ) : null}
          </div>
        </div>

        <div className="acp-field">
          <div className="acp-subLabel">Voice</div>
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
      </div>

      <div className="acp-ttsControls">
        <div className="acp-ttsBottomRow">
          <div className="acp-ttsSliders">
            {provider === "builtin" ? <><div className="acp-sliderRow">
              <div className="acp-sliderLabel">rate ({Number(micTtsRate ?? 1).toFixed(2)})</div>
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
            </div>
            <div className="acp-sliderRow">
              <div className="acp-sliderLabel">pitch ({Number(micTtsPitch ?? 1).toFixed(2)})</div>
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
            </div></> : <div className="acp-sliderRow">
              <div className="acp-sliderLabel">speed ({Number(micTtsSonioxSpeed ?? 1).toFixed(2)})</div>
              <input className="acp-range" type="range" min="0.7" max="1.3" step="0.05" value={Number(micTtsSonioxSpeed ?? 1)} disabled={!micTtsEnabled} onChange={(e) => onChangeMicTtsSonioxSpeed?.(Number(e.target.value))} />
            </div>}
            <div className="acp-sliderRow">
              <div className="acp-sliderLabel">
                volume ({Number(volume ?? (provider === "soniox" ? 2 : 1)).toFixed(2)})
              </div>
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
      <HotkeyDialog
        open={editingHotkey}
        value={micPassthroughHotkey}
        onCancel={() => editHotkey(false)}
        onSave={(combo) => {
          onChangeMicPassthroughHotkey?.(combo);
          editHotkey(false);
        }}
      />
      <VbCableInstallModal open={installOpen} installing={installing} error={installError} onCancel={() => setInstallOpen(false)} onInstall={installVbCable} />
    </div>
  );
}
