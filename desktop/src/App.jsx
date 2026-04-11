import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";
import { AudioControlPanel } from "./components/AudioControlPanel";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { AIChatPanel } from "./components/AIChatPanel";
import { useMicTranslationTts } from "./tts/useMicTranslationTts";
import { TitleBar } from "./components/TitleBar";
import { LoginPanel } from "./components/LoginPanel";
import { QuotaExceededModal } from "./components/QuotaExceededModal";
import { useAI } from "./hooks/useAI";
import { useAuth } from "./hooks/useAuth";
import { useSpeakerCheck } from "./hooks/useSpeakerCheck";
import { byteSize } from "./transcript/transcriptUtils";
import { fetchEntitlement, recordUsage } from "./services/entitlementService";
import { createSession, finalizeSession, uploadSegments } from "./services/sessionSyncService";
import { toPlainText, toSrt, toJson, groupsToSegments } from "./transcript/exportUtils";

// main application component that manages audio capture, transcription, and translation state
function App() {
  const { auth, user, isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [entitlement, setEntitlement] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'synced' | 'failed'
  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);
  const [contentProtectionEnabled, setContentProtectionEnabled] = useState(() => {
    try {
      const v = localStorage.getItem("contentProtectionEnabled");
      if (v === "0") return false;
      if (v === "1") return true;
    } catch {}
    return true;
  });
  
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

  // AI hook
  const chatgpt = useAI({ micInputLangs, loopbackContext });

  // Speaker check hook
  useSpeakerCheck({ 
    running, 
    loopbackGroups: loopbackTranscript.groups, 
    micGroups: micTranscript.groups, 
    chatgpt 
  });

  // fetches entitlement when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setEntitlement(null); return; }
    fetchEntitlement().then(setEntitlement);
  }, [isAuthenticated, auth]);

  useEffect(() => {
    try {
      localStorage.setItem("contentProtectionEnabled", contentProtectionEnabled ? "1" : "0");
    } catch {}
    invoke("set_main_window_content_protected", { enabled: contentProtectionEnabled }).catch((e) => {
      console.error("set_main_window_content_protected failed:", e);
    });
  }, [contentProtectionEnabled]);

  // fetches the list of available audio devices from the backend
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
    chatgpt.initChatGPTWindow().catch(() => {});
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

  // checks quota and returns false if exceeded (shows modal)
  async function checkQuota() {
    if (!isAuthenticated) return true; // guest mode — allow
    const ent = await fetchEntitlement();
    setEntitlement(ent);
    if (!ent) return true; // can't check — allow
    if (ent.minutesUsed >= ent.minutesPerMonth) {
      setQuotaExceeded(true);
      return false;
    }
    return true;
  }

  // starts the audio capture and transcription process
  async function start() {
    const allowed = await checkQuota();
    if (!allowed) return;

    setLoopbackBytes(0);
    setMicBytes(0);
    setRunning(true);
    sessionStartRef.current = Date.now();

    // create session on backend if authenticated
    if (isAuthenticated) {
      const lang = loopbackInputLangs[0] || micInputLangs[0] || "en";
      const sid = await createSession({ title: null, language: lang });
      sessionIdRef.current = sid;
      setSyncStatus(null);
    }

    try {
      await chatgpt.resetChatGPTWindow();
      await chatgpt.initChatGPTWindow();
      chatgpt.clearSentContext();
    } catch {}
    
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

  // stops all active audio captures and syncs session to backend
  async function stop() {
    try {
      if (loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" });
    } catch {}
    try {
      if (micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" });
    } catch {}
    
    setRunning(false);
    try { await loopbackTranscript.stop(); } catch {}
    try { await micTranscript.stop(); } catch {}

    // sync session and record usage
    if (isAuthenticated && sessionIdRef.current) {
      const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
      const durationSeconds = Math.round(durationMs / 1000);
      const minutes = Math.ceil(durationSeconds / 60);
      setSyncStatus("syncing");
      try {
        const allGroups = [...loopbackTranscript.groups, ...micTranscript.groups].sort(
          (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
        );
        const segs = groupsToSegments(allGroups);
        await Promise.all([
          finalizeSession(sessionIdRef.current, { durationSeconds, status: "completed" }),
          uploadSegments(sessionIdRef.current, segs),
          recordUsage(minutes),
        ]);
        setSyncStatus("synced");
      } catch {
        setSyncStatus("failed");
      }
      sessionIdRef.current = null;
    }
  }

  // exports transcript in the specified format (txt, srt, json)
  const handleExport = useCallback(async (format) => {
    const allGroups = [...loopbackTranscript.groups, ...micTranscript.groups].sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    if (allGroups.length === 0) return;

    let content, ext, filters;
    if (format === "srt") {
      content = toSrt(allGroups);
      ext = "srt";
      filters = [{ name: "SubRip", extensions: ["srt"] }];
    } else if (format === "json") {
      content = toJson(allGroups);
      ext = "json";
      filters = [{ name: "JSON", extensions: ["json"] }];
    } else {
      content = toPlainText(allGroups);
      ext = "txt";
      filters = [{ name: "Text", extensions: ["txt"] }];
    }

    try {
      const path = await invoke("save_file_dialog", {
        defaultName: `transcript.${ext}`,
        content,
      });
      if (!path) return; // user cancelled
    } catch {}
  }, [loopbackTranscript.groups, micTranscript.groups]);

  // Merge Transcripts
  const mergedGroups = useMemo(() => {
    const sys = loopbackTranscript.groups.map(g => ({ ...g, sessionId: 'sys' }));
    const mic = micTranscript.groups.map(g => ({ ...g, sessionId: 'mic' }));
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

  // shows login panel overlay when user clicks sign in
  if (showLogin && !isAuthenticated) {
    return (
      <div className="window">
        <div className="app">
          <TitleBar
            title="Sayvela"
            user={user}
            onLoginClick={() => setShowLogin(true)}
            onLogoutClick={logout}
          />
          <main className="main">
            <LoginPanel
              onLogin={login}
              loading={authLoading}
              error={authError}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="window">
      <div className="app">
        <TitleBar
          title="Sayvela"
          user={user}
          entitlement={entitlement}
          syncStatus={syncStatus}
          onLoginClick={() => setShowLogin(true)}
          onLogoutClick={logout}
        />
        {quotaExceeded && (
          <QuotaExceededModal
            entitlement={entitlement}
            onDismiss={() => setQuotaExceeded(false)}
          />
        )}
        <main className="main">
          <AudioControlPanel
            devices={devices}
            
            loopbackDeviceId={loopbackDeviceId}
            onChangeLoopbackDeviceId={setLoopbackDeviceId}
            loopbackContext={loopbackContext}
            onChangeLoopbackContext={setLoopbackContext}
            contentProtectionEnabled={contentProtectionEnabled}
            onChangeContentProtectionEnabled={setContentProtectionEnabled}
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
            onExport={handleExport}
          />

          <AIChatPanel
            messages={chatgpt.chatMessages}
            input={chatgpt.chatInput}
            onChangeInput={chatgpt.setChatInput}
            onSend={chatgpt.sendManual}
            onCancel={chatgpt.cancel}
            onClear={chatgpt.clearChat}
            isStreaming={chatgpt.isStreaming}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
