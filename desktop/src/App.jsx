import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ContextsPanel } from "./components/ContextsPanel";
import { LeftBar } from "./components/LeftBar";
import { IconSettings, IconContexts, IconStats, IconPlay, IconStop } from "./components/Icons";
import { useAI } from "./hooks/useAI";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { useContexts } from "./hooks/useContexts";
import { useSpeakerCheck } from "./hooks/useSpeakerCheck";
import { byteSize } from "./transcript/transcriptUtils";
import { fetchEntitlement, recordUsage } from "./services/entitlementService";
import { createSession, finalizeSession, uploadSegments } from "./services/sessionSyncService";
import { toPlainText, toSrt, toJson, groupsToSegments } from "./transcript/exportUtils";

// main application component that manages audio capture, transcription, and translation state
function App() {
  const { auth, user, isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth();
  const { settings, update: updateSetting, loaded: settingsLoaded } = useSettings(isAuthenticated);
  const { contexts, loading: contextsLoading, add: addCtx, edit: editCtx, remove: removeCtx } = useContexts(isAuthenticated);

  const [activeTab, setActiveTab] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");
  const [running, setRunning] = useState(false);

  const [loopbackDeviceId, setLoopbackDeviceId] = useState("default-loopback");
  const [loopbackBytes, setLoopbackBytes] = useState(0);
  const [loopbackCaptureState, setLoopbackCaptureState] = useState(null);
  const [loopbackInputLangs, setLoopbackInputLangs] = useState(["ja", "en"]);
  const [loopbackOutputLang, setLoopbackOutputLang] = useState("vi");
  const [loopbackContextId, setLoopbackContextId] = useState(null);

  const [micDeviceId, setMicDeviceId] = useState("default-mic");
  const [micBytes, setMicBytes] = useState(0);
  const [micCaptureState, setMicCaptureState] = useState(null);
  const [micInputLangs, setMicInputLangs] = useState(["vi"]);
  const [micOutputLang, setMicOutputLang] = useState("ja");

  const [micTtsEnabled, setMicTtsEnabled] = useState(false);
  const [micTtsVoiceId, setMicTtsVoiceId] = useState("");
  const [micTtsRate, setMicTtsRate] = useState(1.1);
  const [micTtsPitch, setMicTtsPitch] = useState(1);
  const [micTtsVolume, setMicTtsVolume] = useState(1);
  const [micTtsOutputDeviceId, setMicTtsOutputDeviceId] = useState("default-loopback");
  const [contentProtectionEnabled, setContentProtectionEnabled] = useState(true);

  // syncs local state from loaded settings after authentication
  useEffect(() => {
    if (!settingsLoaded) return;
    setLoopbackDeviceId(settings.loopbackDeviceId ?? "default-loopback");
    setLoopbackInputLangs(settings.loopbackInputLangs ?? ["ja", "en"]);
    setLoopbackOutputLang(settings.loopbackOutputLang ?? "vi");
    setLoopbackContextId(settings.loopbackContextId ?? null);
    setMicDeviceId(settings.micDeviceId ?? "default-mic");
    setMicInputLangs(settings.micInputLangs ?? ["vi"]);
    setMicOutputLang(settings.micOutputLang ?? "ja");
    setMicTtsEnabled(settings.micTtsEnabled ?? false);
    setMicTtsVoiceId(settings.micTtsVoiceId ?? "");
    setMicTtsRate(settings.micTtsRate ?? 1.1);
    setMicTtsPitch(settings.micTtsPitch ?? 1);
    setMicTtsVolume(settings.micTtsVolume ?? 1);
    setMicTtsOutputDeviceId(settings.micTtsOutputDeviceId ?? "default-loopback");
    setContentProtectionEnabled(settings.contentProtectionEnabled ?? true);
  }, [settingsLoaded]);

  // helpers that update local state and persist to backend
  const setAndSave = (key, setter) => (val) => { setter(val); updateSetting({ [key]: val }); };

  // resolves active context json from selected context id
  const activeContextJson = useMemo(() => {
    if (!loopbackContextId) return undefined;
    return contexts.find((c) => c.id === loopbackContextId)?.contextJson ?? undefined;
  }, [loopbackContextId, contexts]);

  const loopbackTranscript = useTranscript();
  const micTranscript = useTranscript();
  const loopbackStartedRef = useRef(false);
  const micStartedRef = useRef(false);

  const chatgpt = useAI({ micInputLangs, loopbackContext: activeContextJson });

  useSpeakerCheck({
    running,
    loopbackGroups: loopbackTranscript.groups,
    micGroups: micTranscript.groups,
    chatgpt,
  });

  useEffect(() => {
    if (!isAuthenticated) { setEntitlement(null); return; }
    fetchEntitlement().then(setEntitlement);
  }, [isAuthenticated, auth]);

  useEffect(() => {
    updateSetting({ contentProtectionEnabled });
    invoke("set_main_window_content_protected", { enabled: contentProtectionEnabled }).catch(() => {});
  }, [contentProtectionEnabled]);

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
      unlistenList.push(await listen("capture_state_loopback", (e) => setLoopbackCaptureState(e.payload)));
      unlistenList.push(await listen("capture_state_mic", (e) => setMicCaptureState(e.payload)));
    })();
    return () => unlistenList.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (!running) { loopbackStartedRef.current = false; return; }
    if (loopbackCaptureState?.state === "running" && loopbackCaptureState?.sampleRate && !loopbackStartedRef.current && loopbackDeviceId) {
      loopbackStartedRef.current = true;
      loopbackTranscript.start({
        sampleRate: loopbackCaptureState.sampleRate,
        languageHints: loopbackInputLangs.length ? loopbackInputLangs : ["en", "ja"],
        targetLanguage: loopbackOutputLang,
        enableTranslation: Boolean(loopbackOutputLang),
        audioEventName: "audio_chunk_loopback",
        context: activeContextJson,
      }).catch(() => {});
    }
  }, [running, loopbackCaptureState, loopbackInputLangs, loopbackOutputLang, loopbackDeviceId, activeContextJson]);

  useEffect(() => {
    if (!running) { micStartedRef.current = false; return; }
    if (micCaptureState?.state === "running" && micCaptureState?.sampleRate && !micStartedRef.current && micDeviceId) {
      micStartedRef.current = true;
      micTranscript.start({
        sampleRate: micCaptureState.sampleRate,
        languageHints: micInputLangs.length ? micInputLangs : ["vi"],
        targetLanguage: micOutputLang,
        enableTranslation: Boolean(micOutputLang),
        audioEventName: "audio_chunk_mic",
        context: activeContextJson,
        speakerOverride: "me",
        splitTurnsOnLanguage: false,
        enableSpeakerDiarization: false,
      }).catch(() => {});
    }
  }, [running, micCaptureState, micInputLangs, micOutputLang, micDeviceId, activeContextJson]);

  async function checkQuota() {
    if (!isAuthenticated) return true;
    const ent = await fetchEntitlement();
    setEntitlement(ent);
    if (!ent) return true;
    if (ent.minutesUsed >= ent.minutesPerMonth) { setQuotaExceeded(true); return false; }
    return true;
  }

  async function start() {
    const allowed = await checkQuota();
    if (!allowed) return;
    setLoopbackBytes(0);
    setMicBytes(0);
    setRunning(true);
    sessionStartRef.current = Date.now();
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
      if (loopbackDeviceId) await invoke("start_audio_capture", { deviceId: loopbackDeviceId, kind: "loopback" });
      if (micDeviceId) await invoke("start_audio_capture", { deviceId: micDeviceId, kind: "microphone" });
    } catch (e) {
      stop();
      alert("Start failed: " + e);
    }
  }

  async function stop() {
    try { if (loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" }); } catch {}
    try { if (micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" }); } catch {}
    setRunning(false);
    try { await loopbackTranscript.stop(); } catch {}
    try { await micTranscript.stop(); } catch {}
    if (isAuthenticated && sessionIdRef.current) {
      const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
      const minutes = Math.ceil(durationMs / 60000);
      setSyncStatus("syncing");
      try {
        const allGroups = [...loopbackTranscript.groups, ...micTranscript.groups].sort(
          (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
        );
        await Promise.all([
          finalizeSession(sessionIdRef.current, { durationSeconds: Math.round(durationMs / 1000), status: "completed" }),
          uploadSegments(sessionIdRef.current, groupsToSegments(allGroups)),
          recordUsage(minutes),
        ]);
        setSyncStatus("synced");
      } catch {
        setSyncStatus("failed");
      }
      sessionIdRef.current = null;
    }
  }

  const handleExport = useCallback(async (format) => {
    const allGroups = [...loopbackTranscript.groups, ...micTranscript.groups].sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    if (allGroups.length === 0) return;
    let content, ext;
    if (format === "srt") { content = toSrt(allGroups); ext = "srt"; }
    else if (format === "json") { content = toJson(allGroups); ext = "json"; }
    else { content = toPlainText(allGroups); ext = "txt"; }
    try { await invoke("save_file_dialog", { defaultName: `transcript.${ext}`, content }); } catch {}
  }, [loopbackTranscript.groups, micTranscript.groups]);

  const mergedGroups = useMemo(() => {
    const sys = loopbackTranscript.groups.map((g) => ({ ...g, sessionId: "sys" }));
    const mic = micTranscript.groups.map((g) => ({ ...g, sessionId: "mic" }));
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

  // resolves content to show inside the left panel based on active tab
  function renderLeftContent() {
    switch (activeTab) {
      case "settings":
        return (
          <AudioControlPanel
            devices={devices}
            loopbackDeviceId={loopbackDeviceId}
            onChangeLoopbackDeviceId={setAndSave("loopbackDeviceId", setLoopbackDeviceId)}
            loopbackContext={activeContextJson}
            onChangeLoopbackContext={() => setActiveTab("contexts")}
            loopbackContextId={loopbackContextId}
            onChangeLoopbackContextId={(id) => {
              setLoopbackContextId(id);
              updateSetting({ loopbackContextId: id });
            }}
            contexts={contexts}
            contentProtectionEnabled={contentProtectionEnabled}
            onChangeContentProtectionEnabled={setAndSave("contentProtectionEnabled", setContentProtectionEnabled)}
            loopbackBytes={loopbackBytes}
            loopbackCaptureState={loopbackCaptureState}
            loopbackInputLangs={loopbackInputLangs}
            onChangeLoopbackInputLangs={setAndSave("loopbackInputLangs", setLoopbackInputLangs)}
            loopbackOutputLang={loopbackOutputLang}
            onChangeLoopbackOutputLang={setAndSave("loopbackOutputLang", setLoopbackOutputLang)}
            micDeviceId={micDeviceId}
            onChangeMicDeviceId={setAndSave("micDeviceId", setMicDeviceId)}
            micBytes={micBytes}
            micCaptureState={micCaptureState}
            micInputLangs={micInputLangs}
            onChangeMicInputLangs={setAndSave("micInputLangs", setMicInputLangs)}
            micOutputLang={micOutputLang}
            onChangeMicOutputLang={setAndSave("micOutputLang", setMicOutputLang)}
            micTtsEnabled={micTtsEnabled}
            onChangeMicTtsEnabled={setAndSave("micTtsEnabled", setMicTtsEnabled)}
            micTtsVoiceId={micTtsVoiceId}
            onChangeMicTtsVoiceId={setAndSave("micTtsVoiceId", setMicTtsVoiceId)}
            micTtsRate={micTtsRate}
            onChangeMicTtsRate={setAndSave("micTtsRate", setMicTtsRate)}
            micTtsPitch={micTtsPitch}
            onChangeMicTtsPitch={setAndSave("micTtsPitch", setMicTtsPitch)}
            micTtsVolume={micTtsVolume}
            onChangeMicTtsVolume={setAndSave("micTtsVolume", setMicTtsVolume)}
            micTtsOutputDeviceId={micTtsOutputDeviceId}
            onChangeMicTtsOutputDeviceId={setAndSave("micTtsOutputDeviceId", setMicTtsOutputDeviceId)}
            loopbackStatus={loopbackTranscript.status}
            loopbackError={loopbackTranscript.error}
            micStatus={micTranscript.status}
            micError={micTranscript.error}
            running={running}
            onRefreshDevices={refreshDevices}
            devicesError={devicesError}
            onStart={start}
            onStop={stop}
            inRightBar
          />
        );
      case "contexts":
        return (
          <ContextsPanel
            contexts={contexts}
            loading={contextsLoading}
            onAdd={addCtx}
            onEdit={editCtx}
            onRemove={removeCtx}
            selectedId={loopbackContextId}
            onSelect={(id) => {
              setLoopbackContextId(id);
              updateSetting({ loopbackContextId: id });
            }}
          />
        );
      case "stats":
        return <StatsPanel entitlement={entitlement} />;
      default:
        return null;
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="window">
        <div className="app">
          <TitleBar title="Sayvela" user={null} onLoginClick={() => {}} onLogoutClick={() => {}} />
          <main className="main">
            <LoginPanel onLogin={login} loading={authLoading} error={authError} />
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
          onLoginClick={() => {}}
          onLogoutClick={logout}
        />
        {quotaExceeded && (
          <QuotaExceededModal entitlement={entitlement} onDismiss={() => setQuotaExceeded(false)} />
        )}

        <div className="app-body">
          <LeftBar activeTab={activeTab} onTabChange={setActiveTab}>
            {renderLeftContent()}
          </LeftBar>

          <main className="main main--center">
            <StartStopCard
              running={running}
              onStart={start}
              onStop={stop}
              loopbackStatus={loopbackTranscript.status}
              micStatus={micTranscript.status}
              activeContextName={contexts.find((c) => c.id === loopbackContextId)?.name}
              onOpenTab={setActiveTab}
            />

            <div className="home-panels">
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
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// minimal center card showing connection status + quick start/stop action
function StartStopCard({ running, onStart, onStop, loopbackStatus, micStatus, activeContextName, onOpenTab }) {
  return (
    <div className="ssc">
      <div className="ssc-status-row">
        <span className={`ssc-dot${running ? " ssc-dot--running" : ""}`} />
        <span className="ssc-state">{running ? "Recording…" : "Idle"}</span>
        {activeContextName && (
          <span className="ssc-ctx-badge" onClick={() => onOpenTab("contexts")} title="Active context">
            🗂️ {activeContextName}
          </span>
        )}
      </div>

      <div className="ssc-actions">
        {!running ? (
          <button className="btn btn-primary ssc-btn" onClick={onStart}>
            <IconPlay size={16} /> Start
          </button>
        ) : (
          <button className="btn btn-danger ssc-btn" onClick={onStop}>
            <IconStop size={16} /> Stop
          </button>
        )}
      </div>

      <div className="ssc-quick-row">
        <button className="ssc-quick-btn" onClick={() => onOpenTab("settings")}>
          <IconSettings size={15} /> Settings
        </button>
        <button className="ssc-quick-btn" onClick={() => onOpenTab("contexts")}>
          <IconContexts size={15} /> Contexts
        </button>
        <button className="ssc-quick-btn" onClick={() => onOpenTab("stats")}>
          <IconStats size={15} /> Stats
        </button>
      </div>

      <div className="ssc-sub-row">
        {loopbackStatus && <span className="ssc-badge">Sys: {loopbackStatus}</span>}
        {micStatus && <span className="ssc-badge">Mic: {micStatus}</span>}
      </div>
    </div>
  );
}

// simple stats panel showing usage entitlement
function StatsPanel({ entitlement }) {
  if (!entitlement) return <div className="lb-empty">No usage data</div>;
  const pct = Math.min(100, Math.round((entitlement.minutesUsed / entitlement.minutesPerMonth) * 100));
  return (
    <div className="stats-panel">
      <div className="stats-row">
        <span className="stats-label">Minutes used</span>
        <span className="stats-value">{entitlement.minutesUsed} / {entitlement.minutesPerMonth}</span>
      </div>
      <div className="stats-bar-track">
        <div className="stats-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stats-pct">{pct}%</div>
    </div>
  );
}

export default App;
