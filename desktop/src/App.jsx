import { useEffect, useState, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";
import { AudioControlPanel } from "./components/AudioControlPanel";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { useMicTranslationTts } from "./tts/useMicTranslationTts";
import { TitleBar } from "./components/TitleBar";

const CHATGPT_URL = "https://chatgpt.com";
const CHATGPT_WINDOW_LABEL = "chatgpt-anon";

function byteSize(chunk) {
  if (!chunk) return 0;
  if (typeof chunk.length === "number") return chunk.length;
  if (typeof chunk.byteLength === "number") return chunk.byteLength;
  return 0;
}

function lastFinalOriginalMic(groups) {
  const list = Array.isArray(groups) ? groups : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const g = list[i];
    if (!g) continue;
    if (g.translationStatus && g.translationStatus !== "original") continue;
    if (!g.isFinal) continue;
    const text = String(g.finalText || "").trim();
    if (!text) continue;
    const key = String(g.id || `${g.createdAt || 0}-${g.seq || 0}-${text}`);
    return { key, text };
  }
  return null;
}

function App() {
  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);
  
  // Loopback State
  const [loopbackDeviceId, setLoopbackDeviceId] = useState("default-loopback");
  const [loopbackBytes, setLoopbackBytes] = useState(0);
  const [loopbackCaptureState, setLoopbackCaptureState] = useState(null);
  const [loopbackInputLangs, setLoopbackInputLangs] = useState(["ja", "en"]);
  const [loopbackOutputLang, setLoopbackOutputLang] = useState("vi");
  const [loopbackContext, setLoopbackContext] = useState("");
  
  // Mic State
  const [micDeviceId, setMicDeviceId] = useState("default-mic");
  const [micBytes, setMicBytes] = useState(0);
  const [micCaptureState, setMicCaptureState] = useState(null);
  const [micInputLangs, setMicInputLangs] = useState(["vi"]);
  const [micOutputLang, setMicOutputLang] = useState("ja");

  // TTS (Mic translation)
  const [micTtsEnabled, setMicTtsEnabled] = useState(false);
  const [micTtsVoiceId, setMicTtsVoiceId] = useState("");
  const [micTtsRate, setMicTtsRate] = useState(1.1);
  const [micTtsPitch, setMicTtsPitch] = useState(1);
  const [micTtsVolume, setMicTtsVolume] = useState(1);
  const [micTtsOutputDeviceId, setMicTtsOutputDeviceId] = useState("default-loopback");

  // Transcripts
  const loopbackTranscript = useTranscript();
  const micTranscript = useTranscript();
  
  // Refs to track transcript start state to avoid double-start
  const loopbackStartedRef = useRef(false);
  const micStartedRef = useRef(false);
  const chatgptInitRef = useRef(null);
  const chatgptDidInitRef = useRef(false);
  const lastChatgptSentKeyRef = useRef("");

  const ensureChatGPTWindow = async () => {
    if (chatgptInitRef.current) return chatgptInitRef.current;

    chatgptInitRef.current = (async () => {
      try {
        const existing = await WebviewWindow.getByLabel(CHATGPT_WINDOW_LABEL);
        if (existing) return;
        new WebviewWindow(CHATGPT_WINDOW_LABEL, {
          url: CHATGPT_URL,
          title: "ChatGPT (anon)",
          width: 600,
          height: 800,
          resizable: true,
          decorations: true,
          incognito: true,
        });
      } catch {
        chatgptInitRef.current = null;
      }
    })();

    return chatgptInitRef.current;
  };

  async function refreshDevices() {
    setDevicesError("");
    try {
      const list = await invoke("list_audio_devices");
      setDevices(list);
    } catch (e) {
      setDevices([]);
      setDevicesError(String(e));
    }
  }

  useEffect(() => {
    refreshDevices();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ensureChatGPTWindow();
        if (chatgptDidInitRef.current) return;
        chatgptDidInitRef.current = true;
        await new Promise((r) => setTimeout(r, 300));
        await invoke("chatgpt_init");
      } catch {}
    })();
  }, []);

  // Listeners
  useEffect(() => {
    let unlistenList = [];
    
    (async () => {
      unlistenList.push(await listen("audio_chunk_loopback", (e) => {
        const n = byteSize(e.payload);
        if (n > 0) setLoopbackBytes((v) => v + n);
      }));
      
      unlistenList.push(await listen("audio_chunk_mic", (e) => {
        const n = byteSize(e.payload);
        if (n > 0) setMicBytes((v) => v + n);
      }));

      unlistenList.push(await listen("capture_state_loopback", (e) => {
        setLoopbackCaptureState(e.payload);
      }));
      
      unlistenList.push(await listen("capture_state_mic", (e) => {
        setMicCaptureState(e.payload);
      }));
    })();

    return () => {
      unlistenList.forEach(u => u());
    };
  }, []);

  const lastMic = useMemo(() => lastFinalOriginalMic(micTranscript.groups), [micTranscript.groups]);

  useEffect(() => {
    if (!lastMic) return;
    if (lastChatgptSentKeyRef.current === lastMic.key) return;
    lastChatgptSentKeyRef.current = lastMic.key;

    (async () => {
      try {
        await ensureChatGPTWindow();
        await invoke("chatgpt_send_message", { text: lastMic.text });
      } catch {
        lastChatgptSentKeyRef.current = "";
      }
    })();
  }, [lastMic]);

  // Manage Loopback Transcript Session
  useEffect(() => {
    if (!running) {
      loopbackStartedRef.current = false;
      return;
    }
    
    if (loopbackCaptureState?.state === "running" && loopbackCaptureState?.sampleRate && !loopbackStartedRef.current && loopbackDeviceId) {
      loopbackStartedRef.current = true;
      const languageHints = loopbackInputLangs.length ? loopbackInputLangs : ["en", "ja"];
      
      loopbackTranscript.start({
        sampleRate: loopbackCaptureState.sampleRate,
        languageHints,
        targetLanguage: loopbackOutputLang,
        enableTranslation: Boolean(loopbackOutputLang),
        audioEventName: "audio_chunk_loopback",
        context: loopbackContext,
      }).catch(err => {
        console.error("Loopback Transcript start failed:", err);
      });
    }
  }, [running, loopbackCaptureState, loopbackInputLangs, loopbackOutputLang, loopbackDeviceId, loopbackContext]);

  // Manage Mic Transcript Session
  useEffect(() => {
    if (!running) {
      micStartedRef.current = false;
      return;
    }
    
    if (micCaptureState?.state === "running" && micCaptureState?.sampleRate && !micStartedRef.current && micDeviceId) {
      micStartedRef.current = true;
      const languageHints = micInputLangs.length ? micInputLangs : ["vi"];
      
      micTranscript.start({
        sampleRate: micCaptureState.sampleRate,
        languageHints,
        targetLanguage: micOutputLang,
        enableTranslation: Boolean(micOutputLang),
        context: loopbackContext,
        audioEventName: "audio_chunk_mic",
        speakerOverride: "me",
        splitTurnsOnLanguage: false,
        enableSpeakerDiarization: false
      }).catch(err => {
        console.error("Mic Transcript start failed:", err);
      });
    }
  }, [running, micCaptureState, micInputLangs, micOutputLang, micDeviceId, loopbackContext]);

  async function start() {
    setLoopbackBytes(0);
    setMicBytes(0);
    setRunning(true);
    
    try {
      if (loopbackDeviceId) {
        await invoke("start_audio_capture", { deviceId: loopbackDeviceId, kind: "loopback" });
      }
      if (micDeviceId) {
        await invoke("start_audio_capture", { deviceId: micDeviceId, kind: "microphone" });
      }
    } catch (e) {
      console.error("Start failed", e);
      stop();
      alert("Start failed: " + e);
    }
  }

  async function stop() {
    try {
      if (loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" });
    } catch {}
    try {
      if (micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" });
    } catch {}
    
    setRunning(false);
    try {
      await loopbackTranscript.stop();
    } catch {}
    try {
      await micTranscript.stop();
    } catch {}
  }

  // Merge Transcripts
  const mergedGroups = useMemo(() => {
    const sys = loopbackTranscript.groups.map(g => ({ ...g, sessionId: 'sys' }));
    const mic = micTranscript.groups.map(g => ({ ...g, sessionId: 'mic' }));
    // Sort by createdAt
    return [...sys, ...mic].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [loopbackTranscript.groups, micTranscript.groups]);

  useMicTranslationTts({
    enabled: micTtsEnabled,
    running,
    groups: micTranscript.groups,
    language: micOutputLang,
    voiceId: micTtsVoiceId,
    outputDeviceId: micTtsOutputDeviceId,
    rate: micTtsRate,
    pitch: micTtsPitch,
    volume: micTtsVolume,
    queueMode: "add",
  });

  return (
    <div className="window">
      <div className="app">
        <TitleBar title="virex" />
        <main className="main">
          <AudioControlPanel
            devices={devices}
            
            loopbackDeviceId={loopbackDeviceId}
            onChangeLoopbackDeviceId={setLoopbackDeviceId}
            loopbackContext={loopbackContext}
            onChangeLoopbackContext={setLoopbackContext}
            loopbackBytes={loopbackBytes}
            loopbackCaptureState={loopbackCaptureState}
            loopbackInputLangs={loopbackInputLangs}
            onChangeLoopbackInputLangs={setLoopbackInputLangs}
            loopbackOutputLang={loopbackOutputLang}
            onChangeLoopbackOutputLang={setLoopbackOutputLang}

            micDeviceId={micDeviceId}
            onChangeMicDeviceId={setMicDeviceId}
            micBytes={micBytes}
            micCaptureState={micCaptureState}
            micInputLangs={micInputLangs}
            onChangeMicInputLangs={setMicInputLangs}
            micOutputLang={micOutputLang}
            onChangeMicOutputLang={setMicOutputLang}
            micTtsEnabled={micTtsEnabled}
            onChangeMicTtsEnabled={setMicTtsEnabled}
            micTtsVoiceId={micTtsVoiceId}
            onChangeMicTtsVoiceId={setMicTtsVoiceId}
            micTtsRate={micTtsRate}
            onChangeMicTtsRate={setMicTtsRate}
            micTtsPitch={micTtsPitch}
            onChangeMicTtsPitch={setMicTtsPitch}
            micTtsVolume={micTtsVolume}
            onChangeMicTtsVolume={setMicTtsVolume}
            micTtsOutputDeviceId={micTtsOutputDeviceId}
            onChangeMicTtsOutputDeviceId={setMicTtsOutputDeviceId}

            loopbackStatus={loopbackTranscript.status}
            loopbackError={loopbackTranscript.error}
            micStatus={micTranscript.status}
            micError={micTranscript.error}

            running={running}
            onRefreshDevices={refreshDevices}
            devicesError={devicesError}
            onStart={start}
            onStop={stop}
          />

          <TranscriptPanel
            transcriptGroups={mergedGroups}
            running={running}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
