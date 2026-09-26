import { useEffect, useRef, useState } from "react";
import { ttsGetVoices } from "../../tts/ttsApi";
import { getCachedSonioxVoices, hasSonioxApiKey, loadSonioxVoices, SONIOX_BUILTIN_VOICES } from "../../services/sonioxTtsService";
import { ActionButton } from "../astryx/AstryxControls";
import { SourceSection } from "./SourceSection";
import { TtsSection } from "./TtsSection";
import { CameraSection } from "./CameraSection";
import { AssistSection } from "./AssistSection";
import { SettingsOutline } from "./SettingsOutline";
import { Toggle } from "./Toggle";
import { DisguisePicker } from "./DisguisePicker";
import "./AudioControlPanel.css";

// main control panel for configuring audio inputs, outputs, languages, and tts settings
export function AudioControlPanel({
  devices,
  loopbackDeviceId,
  onChangeLoopbackDeviceId,
  loopbackContext,
  onChangeLoopbackContext,
  loopbackContextId,
  onChangeLoopbackContextId,
  contexts = [],
  micDeviceId,
  onChangeMicDeviceId,
  contentProtectionEnabled,
  onChangeContentProtectionEnabled,
  appDisguise,
  onChangeAppDisguise,
  running,
  onRefreshDevices,
  devicesError,
  
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
  micTtsOutputDeviceId,
  onChangeMicTtsOutputDeviceId,
  micPassthroughHotkey,
  onChangeMicPassthroughHotkey,
  camDelayEnabled,
  onChangeCamDelayEnabled,
  camDeviceName,
  onChangeCamDeviceName,
  camDelayMs,
  onChangeCamDelayMs,
  camScalePercent,
  onChangeCamScalePercent,
  camFps,
  onChangeCamFps,
  camError,

  loopbackError,
  micError,
  assistValues,
  assistHandlers,
}) {
  const scrollRef = useRef(null);
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
  const [sonioxVoices, setSonioxVoices] = useState(getCachedSonioxVoices);
  const [sonioxKeyExists, setSonioxKeyExists] = useState(false);
  const [sonioxLoading, setSonioxLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");

  const reloadSoniox = async () => {
    setSonioxLoading(true);
    setTtsError("");
    try {
      const exists = await hasSonioxApiKey();
      setSonioxKeyExists(Boolean(exists));
      setSonioxVoices(exists ? await loadSonioxVoices(true) : SONIOX_BUILTIN_VOICES);
    } catch (e) {
      setTtsError(String(e));
      throw e;
    } finally {
      setSonioxLoading(false);
    }
  };

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

  useEffect(() => {
    let alive = true;
    hasSonioxApiKey().then(async (exists) => {
      if (!alive) return;
      setSonioxKeyExists(Boolean(exists));
      if (exists) setSonioxVoices(await loadSonioxVoices());
    }).catch((e) => alive && setTtsError(String(e)));
    return () => { alive = false; };
  }, []);

  return (
    <section className="panel acp-panel">
      <div className="panel-header acp-header">
        <div className="panel-title">Settings</div>
        <ActionButton
          className="acp-footer-btn"
          type="button"
          disabled={running}
          onClick={onRefreshDevices}
          size="sm"
        >
          Refresh Devices
        </ActionButton>
      </div>
      <div className="acp-layout">
      <div className="acp-body" ref={scrollRef}>
        <section id="system-audio" className="acp-section">
          {/* Loopback Section */}
          <SourceSection
            title="System Audio (Speakers)"
            error={loopbackError}
            deviceId={loopbackDeviceId}
            devices={loopbackDevices}
            running={running}
            onChangeDeviceId={onChangeLoopbackDeviceId}
            inputLangs={loopbackInputLangs}
            onChangeInputLangs={onChangeLoopbackInputLangs}
            outputLang={loopbackOutputLang}
            onChangeOutputLang={onChangeLoopbackOutputLang}
            subtitle="their voice"
            aside={(
              <div className="acp-field">
                <div className="acp-subLabel">Context</div>
                <div className="row">
                  <select
                    className="select"
                    value={loopbackContextId || ""}
                    disabled={running}
                    onChange={(e) => onChangeLoopbackContextId?.(e.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ActionButton
                    className="acp-manage-btn"
                    type="button"
                    disabled={running}
                    onClick={() => onChangeLoopbackContext?.()}
                    title="Manage Contexts"
                    size="sm"
                  >
                    Manage
                  </ActionButton>
                </div>
                {loopbackContext && (
                  <div className="hint">
                    {[
                      loopbackContext.general && "general",
                      loopbackContext.text && "text",
                      loopbackContext.terms?.length && `${loopbackContext.terms.length} terms`,
                      loopbackContext.translation_terms?.length && `${loopbackContext.translation_terms.length} translation_terms`,
                    ].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            )}
          />
        </section>

        <section id="microphone" className="acp-section">
          {/* Mic Section */}
          <SourceSection
            title="Microphone (Me)"
            error={micError}
            deviceId={micDeviceId}
            devices={micDevices}
            running={running}
            onChangeDeviceId={onChangeMicDeviceId}
            inputLangs={micInputLangs}
            onChangeInputLangs={onChangeMicInputLangs}
            outputLang={micOutputLang}
            onChangeOutputLang={onChangeMicOutputLang}
            subtitle="your voice"
          >
            <TtsSection
              micOutputLang={micOutputLang}
              micTtsEnabled={micTtsEnabled}
              onChangeMicTtsEnabled={onChangeMicTtsEnabled}
              micTtsOutputDeviceId={micTtsOutputDeviceId}
              onChangeMicTtsOutputDeviceId={onChangeMicTtsOutputDeviceId}
              micTtsProvider={micTtsProvider}
              onChangeMicTtsProvider={onChangeMicTtsProvider}
              micTtsVoiceIds={micTtsVoiceIds}
              onChangeMicTtsVoiceIds={onChangeMicTtsVoiceIds}
              micTtsSonioxSpeed={micTtsSonioxSpeed}
              onChangeMicTtsSonioxSpeed={onChangeMicTtsSonioxSpeed}
              micTtsRate={micTtsRate}
              onChangeMicTtsRate={onChangeMicTtsRate}
              micTtsPitch={micTtsPitch}
              onChangeMicTtsPitch={onChangeMicTtsPitch}
              micTtsVolume={micTtsVolume}
              onChangeMicTtsVolume={onChangeMicTtsVolume}
              micTtsSonioxVolume={micTtsSonioxVolume}
              onChangeMicTtsSonioxVolume={onChangeMicTtsSonioxVolume}
              ttsOutputDevices={ttsOutputDevices}
              ttsVoices={ttsVoices}
              sonioxVoices={sonioxVoices}
              sonioxKeyExists={sonioxKeyExists}
              sonioxLoading={sonioxLoading}
              onReloadSoniox={reloadSoniox}
              onRefreshDevices={onRefreshDevices}
              ttsError={ttsError}
              micPassthroughHotkey={micPassthroughHotkey}
              onChangeMicPassthroughHotkey={onChangeMicPassthroughHotkey}
            />
            <CameraSection
              camDelayEnabled={camDelayEnabled}
              onChangeCamDelayEnabled={onChangeCamDelayEnabled}
              camDeviceName={camDeviceName}
              onChangeCamDeviceName={onChangeCamDeviceName}
              camDelayMs={camDelayMs}
              onChangeCamDelayMs={onChangeCamDelayMs}
              camScalePercent={camScalePercent}
              onChangeCamScalePercent={onChangeCamScalePercent}
              camFps={camFps}
              onChangeCamFps={onChangeCamFps}
              camError={camError}
            />
          </SourceSection>
        </section>

        <section id="ai-assist" className="acp-section">
          {assistValues ? <AssistSection values={assistValues} onChange={assistHandlers} /> : null}
        </section>

        {devicesError ? <div className="empty acp-error">{devicesError}</div> : null}

        <section id="privacy" className="acp-section">
          <div className="acp-source">
            <div className="acp-sourceHeader">
              <div className="acp-sourceTitle">Privacy</div>
            </div>
            <div className="acp-toggleRow">
              <Toggle
                checked={contentProtectionEnabled}
                onChange={onChangeContentProtectionEnabled}
                label="Hide from capture"
                help="Keeps the Sayvela window out of screen sharing and recordings, so the people you share with see your screen without this app on it."
              />
            </div>
            <div className="acp-toggleWrap">
              <span className="acp-subLabel">App icon</span>
              <span
                className="acp-help"
                tabIndex="0"
                aria-label="App icon help"
                data-tooltip="Shows another app's icon and name on the taskbar, in Alt+Tab and on the tray. Task Manager still lists sayvela.exe."
              >
                ?
              </span>
            </div>
            <DisguisePicker value={appDisguise} onChange={onChangeAppDisguise} />
          </div>
        </section>
      </div>
      <SettingsOutline scrollRef={scrollRef} />
      </div>
    </section>
  );
}
