import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Toggle } from "./Toggle";
import { CommonModal } from "../CommonModal";
import { ActionButton } from "../astryx/AstryxControls";

// holds your webcam back so your mouth moves with the translated voice; meeting
// apps see the result as "DirectShow Softcam"
export function CameraSection({
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
}) {
  const [devices, setDevices] = useState([]);
  const [installed, setInstalled] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    invoke("vcam_list_devices")
      .then((list) => alive && setDevices(Array.isArray(list) ? list : []))
      .catch((e) => alive && setError(String(e)));
    invoke("vcam_installed")
      .then((ok) => alive && setInstalled(Boolean(ok)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // an unplugged camera keeps its place in the list instead of a blank select
  const options = camDeviceName && !devices.some((d) => d.name === camDeviceName)
    ? [{ name: camDeviceName }, ...devices]
    : devices;
  // enables right away, or asks to register the driver first
  const enable = (enabled) => {
    if (enabled && !installed) {
      setError("");
      setInstallOpen(true);
      return;
    }
    if (enabled && !camDeviceName && devices[0]) onChangeCamDeviceName?.(devices[0].name);
    onChangeCamDelayEnabled?.(enabled);
  };
  const install = async () => {
    setInstalling(true);
    setError("");
    try {
      await invoke("vcam_install");
      setInstalled(true);
      setInstallOpen(false);
      if (!camDeviceName && devices[0]) onChangeCamDeviceName?.(devices[0].name);
      onChangeCamDelayEnabled?.(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="acp-ttsSection">
      <div className="acp-ttsHeader">
        <div className="acp-ttsTitle">
          <div className="acp-subLabel">Camera delay</div>
          <span
            className="acp-help"
            tabIndex="0"
            aria-label="Camera delay help"
            data-tooltip="In the meeting app, choose DirectShow Softcam as your camera. Your picture is held back by this delay so your mouth moves with the translated voice; it runs live while your own voice is passed through. Lower resolution and fps make the picture softer, which hides the mismatch further."
          >?</span>
        </div>
        <Toggle checked={camDelayEnabled} onChange={enable} />
      </div>

      <div className="acp-camRow">
        <div className="acp-field">
          <div className="acp-subLabel">Camera</div>
          <select
            className="select acp-select"
            value={camDeviceName || ""}
            disabled={!camDelayEnabled}
            onChange={(e) => onChangeCamDeviceName?.(e.target.value)}
          >
            {options.length === 0 ? <option value="" disabled>No cameras found</option> : null}
            {options.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="acp-ttsSliders">
          <div className="acp-sliderRow">
            <div className="acp-sliderLabel">delay ({(Number(camDelayMs ?? 0) / 1000).toFixed(1)}s)</div>
            <input
              className="acp-range"
              type="range"
              min="0.5"
              max="6"
              step="0.1"
              value={Number(camDelayMs ?? 0) / 1000}
              disabled={!camDelayEnabled}
              onChange={(e) => onChangeCamDelayMs?.(Math.round(Number(e.target.value) * 1000))}
            />
          </div>
          <div className="acp-sliderRow">
            <div className="acp-sliderLabel">resolution ({Number(camScalePercent ?? 100)}%)</div>
            <input
              className="acp-range"
              type="range"
              min="10"
              max="100"
              step="5"
              value={Number(camScalePercent ?? 100)}
              disabled={!camDelayEnabled}
              onChange={(e) => onChangeCamScalePercent?.(Number(e.target.value))}
            />
          </div>
          <div className="acp-sliderRow">
            <div className="acp-sliderLabel">fps ({Number(camFps ?? 30)})</div>
            <input
              className="acp-range"
              type="range"
              min="1"
              max="30"
              step="1"
              value={Number(camFps ?? 30)}
              disabled={!camDelayEnabled}
              onChange={(e) => onChangeCamFps?.(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error || camError ? <div className="empty acp-error">{error || camError}</div> : null}
      <CommonModal
        open={installOpen}
        title="Camera driver required"
        onClose={installing ? undefined : () => setInstallOpen(false)}
        footer={<>
          <ActionButton type="button" disabled={installing} onClick={() => setInstallOpen(false)}>Cancel</ActionButton>
          <ActionButton type="button" variant="primary" disabled={installing} onClick={install}>
            {installing ? "Installing…" : "Install"}
          </ActionButton>
        </>}
      >
        <div>Sayvela registers a small virtual camera driver (softcam, MIT licensed) so meeting apps can pick DirectShow Softcam. No restart of Windows is needed, but restart the meeting app to see the new camera.</div>
        {error ? <div className="empty acp-error">{error}</div> : null}
      </CommonModal>
    </div>
  );
}
