import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useTranscript } from "./transcript/useTranscript";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { AIChatPanel } from "./components/AIChatPanel";
import { useMicTranslationTts } from "./tts/useMicTranslationTts";
import { TitleBar } from "./components/TitleBar";
import { LoginPanel } from "./components/LoginPanel";
import { QuotaExceededModal } from "./components/QuotaExceededModal";
import { LeftBar } from "./components/LeftBar";
import { StartStopCard } from "./components/StartStopCard";
import { AppLeftContent } from "./components/AppLeftContent";
import { useAI } from "./hooks/useAI";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { useContexts } from "./hooks/useContexts";
import { useSessions } from "./hooks/useSessions";
import { useSpeakerCheck } from "./hooks/useSpeakerCheck";
import { useMergedTranscriptGroups } from "./hooks/useMergedTranscriptGroups";
import { useTranscriptExport } from "./hooks/useTranscriptExport";
import { byteSize } from "./transcript/transcriptUtils";
import { fetchEntitlement, recordUsage } from "./services/entitlementService";
import { createSession, finalizeSession } from "./services/sessionSyncService";
import { getStoredAuth } from "./services/authService";
import * as segmentWs from "./services/segmentWsService";
import { groupsToSegments } from "./transcript/exportUtils";

// main application component that manages audio capture, transcription, and translation state
function App() {
  const { auth, user, isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth();
  const { settings, update: updateSetting, loaded: settingsLoaded } = useSettings(isAuthenticated);
  const { contexts, loading: contextsLoading, add: addCtx, edit: editCtx, remove: removeCtx } = useContexts(isAuthenticated);

  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const { sessions, loading: sessionsLoading, error: sessionsError, refresh: refreshSessions, remove: removeSession } = useSessions(isAuthenticated, sessionsRefreshKey);

  const [activeTab, setActiveTab] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const sentSegmentIdsRef = useRef(new Set());

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
        onTurnEnd: (seg) => {
          sentSegmentIdsRef.current.add(seg.id);
          segmentWs.sendSegment({ ...seg, source: "loopback" });
        },
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
        onTurnEnd: (seg) => {
          sentSegmentIdsRef.current.add(seg.id);
          const speaker = seg.translationStatus === "original" ? "me" : seg.speaker;
          segmentWs.sendSegment({ ...seg, source: "mic", speaker });
        },
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
    setSessionElapsed(0);
    sessionStartRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    if (isAuthenticated) {
      const lang = loopbackInputLangs[0] || micInputLangs[0] || "en";
      const autoTitle = `Session ${new Date().toLocaleString("vi-VN")}`;
      const sid = await createSession({ title: autoTitle, language: lang });
      sessionIdRef.current = sid;
      setSyncStatus(null);
      if (sid) {
          const { token } = getStoredAuth() ?? {};
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:80/api";
          sentSegmentIdsRef.current = new Set();
          segmentWs.connect(sid, token, apiUrl).catch(() => {});
        }
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
    clearInterval(elapsedTimerRef.current);
    try { if (loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" }); } catch {}
    try { if (micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" }); } catch {}
    setRunning(false);
    try { await loopbackTranscript.stop(); } catch {}
    try { await micTranscript.stop(); } catch {}
    // allow soniox to send finished event and onTurnEnd to fire before flushing ws
    await new Promise((r) => setTimeout(r, 300));
    if (isAuthenticated && sessionIdRef.current) {
      const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
      const minutes = Math.ceil(durationMs / 60000);
      setSyncStatus("syncing");
      try {
        // flush any segments not yet sent; tag with source for both original and translation
        const alreadySent = sentSegmentIdsRef.current;
        const loopbackSegs = groupsToSegments(loopbackTranscript.groups)
          .map((s) => ({ ...s, source: "loopback" }))
          .filter((s) => !alreadySent.has(s.id));
        const micSegs = groupsToSegments(micTranscript.groups)
          .map((s) => ({ ...s, source: "mic", speaker: s.translationStatus === "original" ? (s.speaker ?? "me") : s.speaker }))
          .filter((s) => !alreadySent.has(s.id));
        const remainingSegs = [...loopbackSegs, ...micSegs].sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
        await segmentWs.flushAndDisconnect(remainingSegs);
        await Promise.all([
          finalizeSession(sessionIdRef.current, { durationSeconds: Math.round(durationMs / 1000), status: "completed" }),
          recordUsage(minutes),
        ]);
        setSyncStatus("synced");
      } catch {
        segmentWs.disconnect();
        setSyncStatus("failed");
      }
      sessionIdRef.current = null;
      setSessionsRefreshKey((k) => k + 1);
    } else {
      segmentWs.disconnect();
    }
  }

  const handleExport = useTranscriptExport(loopbackTranscript.groups, micTranscript.groups);
  const mergedGroups = useMergedTranscriptGroups(loopbackTranscript.groups, micTranscript.groups);

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

  const audioProps = {
    devices,
    loopbackDeviceId,
    onChangeLoopbackDeviceId: setAndSave("loopbackDeviceId", setLoopbackDeviceId),
    loopbackContext: activeContextJson,
    onChangeLoopbackContext: () => setActiveTab("contexts"),
    loopbackContextId,
    onChangeLoopbackContextId: setAndSave("loopbackContextId", setLoopbackContextId),
    contexts,
    micDeviceId,
    onChangeMicDeviceId: setAndSave("micDeviceId", setMicDeviceId),
    contentProtectionEnabled,
    onChangeContentProtectionEnabled: setContentProtectionEnabled,
    running,
    onRefreshDevices: refreshDevices,
    devicesError,
    loopbackBytes,
    micBytes,
    loopbackCaptureState,
    micCaptureState,
    loopbackInputLangs,
    onChangeLoopbackInputLangs: setAndSave("loopbackInputLangs", setLoopbackInputLangs),
    loopbackOutputLang,
    onChangeLoopbackOutputLang: setAndSave("loopbackOutputLang", setLoopbackOutputLang),
    micInputLangs,
    onChangeMicInputLangs: setAndSave("micInputLangs", setMicInputLangs),
    micOutputLang,
    onChangeMicOutputLang: setAndSave("micOutputLang", setMicOutputLang),
    micTtsEnabled,
    onChangeMicTtsEnabled: setAndSave("micTtsEnabled", setMicTtsEnabled),
    micTtsVoiceId,
    onChangeMicTtsVoiceId: setAndSave("micTtsVoiceId", setMicTtsVoiceId),
    micTtsRate,
    onChangeMicTtsRate: setAndSave("micTtsRate", setMicTtsRate),
    micTtsPitch,
    onChangeMicTtsPitch: setAndSave("micTtsPitch", setMicTtsPitch),
    micTtsVolume,
    onChangeMicTtsVolume: setAndSave("micTtsVolume", setMicTtsVolume),
    micTtsOutputDeviceId,
    onChangeMicTtsOutputDeviceId: setAndSave("micTtsOutputDeviceId", setMicTtsOutputDeviceId),
    loopbackStatus: loopbackTranscript.status,
    loopbackError: loopbackTranscript.error,
    micStatus: micTranscript.status,
    micError: micTranscript.error,
    onStart: start,
    onStop: stop,
  };

  const contextsState = {
    contexts,
    loading: contextsLoading,
    onAdd: addCtx,
    onEdit: editCtx,
    onRemove: removeCtx,
    selectedId: loopbackContextId,
    onSelect: setAndSave("loopbackContextId", setLoopbackContextId),
  };

  const sessionsState = {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    onDelete: removeSession,
    onRefresh: refreshSessions,
  };

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
            <AppLeftContent
              activeTab={activeTab}
              audio={audioProps}
              contextsState={contextsState}
              sessionsState={sessionsState}
              stats={{ entitlement }}
            />
          </LeftBar>

          <main className="main main--center">
            <StartStopCard
              running={running}
              onStart={start}
              onStop={stop}
              elapsed={sessionElapsed}
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

export default App;
