import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";
import { LoopbackPanel } from "./components/LoopbackPanel";
import { TranscriptPanel } from "./components/TranscriptPanel";

function byteSize(chunk) {
  if (!chunk) return 0;
  if (typeof chunk.length === "number") return chunk.length;
  if (typeof chunk.byteLength === "number") return chunk.byteLength;
  return 0;
}

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);
  const [bytes, setBytes] = useState(0);
  const [captureState, setCaptureState] = useState(null);
  const [inputLanguages, setInputLanguages] = useState(["en", "ja"]);
  const [outputLanguage, setOutputLanguage] = useState("vi");
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
        const n = byteSize(e.payload);
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
    const languageHints = inputLanguages.length ? inputLanguages : ["vi", "ja"];
    try {
      await transcript.start({
        languageHints,
        targetLanguage: outputLanguage,
        enableTranslation: Boolean(outputLanguage),
      });
      await invoke("start_loopback_capture", { deviceId: selectedDeviceId });
      setRunning(true);
    } catch (e) {
      try {
        await invoke("stop_loopback_capture");
      } catch {}
      try {
        await transcript.stop();
      } catch {}
      throw e;
    }
  }

  async function stop() {
    try {
      await invoke("stop_loopback_capture");
    } finally {
      setRunning(false);
      try {
        await transcript.stop();
      } catch {}
    }
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
