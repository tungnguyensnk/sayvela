import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);
  const [bytes, setBytes] = useState(0);
  const [captureState, setCaptureState] = useState(null);
  const transcript = useTranscript();

  async function refreshDevices() {
    setDevicesError("");
    try {
      const list = await invoke("list_loopback_devices");
      setDevices(list);
      if (!selectedDeviceId && list[0]?.id) setSelectedDeviceId(list[0].id);
    } catch (e) {
      setDevices([]);
      setDevicesError(String(e));
    }
  }

  useEffect(() => {
    refreshDevices();
  }, []);

  useEffect(() => {
    let unlistenAudio = null;
    let unlistenState = null;
    (async () => {
      unlistenAudio = await listen("audio_chunk", (e) => {
        const chunk = e.payload;
        const n =
          typeof chunk?.length === "number"
            ? chunk.length
            : typeof chunk?.byteLength === "number"
              ? chunk.byteLength
              : 0;
        if (n > 0) setBytes((v) => v + n);
      });
      unlistenState = await listen("capture_state", (e) => {
        setCaptureState(e.payload);
      });
    })();
    return () => {
      if (unlistenAudio) unlistenAudio();
      if (unlistenState) unlistenState();
    };
  }, []);

  async function start() {
    setBytes(0);
    await transcript.start();
    await invoke("start_loopback_capture", { deviceId: selectedDeviceId });
    setRunning(true);
  }

  async function stop() {
    await invoke("stop_loopback_capture");
    setRunning(false);
    await transcript.stop();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">Virex</div>
        </div>
      </header>
      <main className="main">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Loopback audio</div>
              <div className="panel-sub">wasapi → emit audio_chunk</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <div className="field">
              <div className="label">Thiết bị loopback</div>
              <div className="row">
                <select
                  className="select"
                  value={selectedDeviceId}
                  disabled={running}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  {devices.length === 0 ? (
                    <option value="" disabled>
                      Không có thiết bị
                    </option>
                  ) : (
                    <option value="" disabled>
                      Chọn thiết bị...
                    </option>
                  )}
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-secondary" type="button" disabled={running} onClick={refreshDevices}>
                  Làm mới
                </button>
              </div>
              {devicesError ? <div className="empty">{devicesError}</div> : null}
            </div>

            <div className="actions">
              {!running ? (
                <button className="btn btn-primary" type="button" disabled={!selectedDeviceId} onClick={start}>
                  Bắt đầu
                </button>
              ) : (
                <button className="btn btn-danger" type="button" onClick={stop}>
                  Dừng
                </button>
              )}
              <div className="small">received: {bytes} bytes</div>
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              state: {captureState?.state || "-"} {captureState?.message ? `(${captureState.message})` : ""}
            </div>
          </div>
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">
            <div>
              <div className="panel-title">Transcript</div>
              <div className="panel-sub">soniox websocket</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <div className="small">
              status: {transcript.status || "-"} {transcript.error ? `(${transcript.error})` : ""}
            </div>
            <div className="card" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {transcript.text || "-"}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
