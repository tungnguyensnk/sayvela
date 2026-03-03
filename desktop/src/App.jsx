import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";
import { LoopbackPanel } from "./components/LoopbackPanel";
import { TranscriptPanel } from "./components/TranscriptPanel";

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);
  const [bytes, setBytes] = useState(0);
  const [captureState, setCaptureState] = useState(null);
  const [inputLanguages, setInputLanguages] = useState(["vi", "ja"]);
  const [outputLanguage, setOutputLanguage] = useState("ja");
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
    await transcript.start({
      languageHints: inputLanguages.length ? inputLanguages : ["vi", "ja"],
      targetLanguage: outputLanguage,
      enableTranslation: Boolean(outputLanguage),
    });
    await invoke("start_loopback_capture", { deviceId: selectedDeviceId });
    setRunning(true);
  }

  async function stop() {
    await invoke("stop_loopback_capture");
    setRunning(false);
    await transcript.stop();
  }

  function toggleInputLanguage(code) {
    setInputLanguages((prev) => {
      const has = prev.includes(code);
      if (has) return prev.filter((c) => c !== code);
      return [...prev, code];
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">Virex</div>
        </div>
      </header>
      <main className="main">
        <LoopbackPanel
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onChangeDeviceId={setSelectedDeviceId}
          running={running}
          onRefreshDevices={refreshDevices}
          devicesError={devicesError}
          bytes={bytes}
          captureState={captureState}
          onStart={start}
          onStop={stop}
        />

        <TranscriptPanel
          transcript={transcript}
          running={running}
          inputLanguages={inputLanguages}
          onToggleInputLanguage={toggleInputLanguage}
          outputLanguage={outputLanguage}
          onOutputLanguageChange={setOutputLanguage}
        />
      </main>
    </div>
  );
}

export default App;
