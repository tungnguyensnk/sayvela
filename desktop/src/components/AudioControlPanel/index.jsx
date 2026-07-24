import { useEffect, useState } from "react";
import { ttsGetVoices } from "../../tts/ttsApi";
import { getCachedSonioxVoices, hasSonioxApiKey, loadSonioxVoices, SONIOX_BUILTIN_VOICES } from "../../services/sonioxTtsService";
import { ActionButton } from "../astryx/AstryxControls";
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
  loopbackContextId,
  onChangeLoopbackContextId,
  contexts = [],
  micDeviceId,
  onChangeMicDeviceId,
  contentProtectionEnabled,
  onChangeContentProtectionEnabled,
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

  loopbackError,
  micError,
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
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Settings</div>
        </div>
      </div>
      <div className="acp-body">
        <div className="acp-grid">
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
          >
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
          </SourceSection>

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
            <ActionButton
              className="acp-footer-btn"
              type="button"
              disabled={running}
              onClick={onRefreshDevices}
            >
              Refresh Devices
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}
