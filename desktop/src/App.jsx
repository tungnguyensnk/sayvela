import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { AIChatPanel } from "./components/AIChatPanel";
import { useMicTranslationTts } from "./tts/useMicTranslationTts";
import { useSpeechHighlight } from "./tts/useSpeechHighlight";
import { TitleBar } from "./components/TitleBar";
import { LoginPanel } from "./components/LoginPanel";
import { QuotaExceededModal } from "./components/QuotaExceededModal";
import { StartStopCard } from "./components/StartStopCard";
import { AppLeftContent } from "./components/AppLeftContent";
import { ServerUnavailableScreen } from "./components/ServerUnavailableScreen";
import { AssistFrame } from "./components/AssistFrame";
import { useAI } from "./hooks/useAI";
import { useAutoAssist } from "./hooks/useAutoAssist";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { useMergedTranscriptGroups } from "./hooks/useMergedTranscriptGroups";
import { useAudioCaptureController } from "./hooks/useAudioCaptureController";
import { useContentProtection } from "./hooks/useContentProtection";
import { useEntitlement } from "./hooks/useEntitlement";
import { useSessionRecorder } from "./hooks/useSessionRecorder";
import { useTranscriptStreams } from "./hooks/useTranscriptStreams";
import { hydratePreferences } from "./store/preferencesSlice";
import { setActiveTab, setAlwaysOnTop, setClickThrough, setMiniMode, setQuotaExceeded } from "./store/uiSlice";
import { useWindowOverlay } from "./hooks/useWindowOverlay";
import { usePreferenceActions } from "./hooks/usePreferenceActions";
import { useAppDisguise } from "./hooks/useAppDisguise";
import { closeFrame } from "./store/assistSlice";
import { clearContexts, fetchContextsThunk } from "./store/contextsSlice";
import { clearSessions, fetchSessionsThunk } from "./store/sessionsSlice";
import { SERVER_UNREACHABLE } from "./services/apiClient";
import { selectActiveContextJson, selectActiveContextName } from "./store/selectors";

// main application component that manages audio capture, transcription, and translation state
function App() {
  const dispatch = useDispatch();
  const { running, loopbackBytes, micBytes, loopbackCaptureState, micCaptureState } = useSelector((state) => state.audio);
  const preferences = useSelector((state) => state.preferences);
  const { activeTab, quotaExceeded, syncStatus, sessionElapsed, miniMode, alwaysOnTop, clickThrough } = useSelector((state) => state.ui);
  const { loading: sessionsLoading, errorCode: sessionsErrorCode } = useSelector((state) => state.sessions);
  const activeContextJson = useSelector(selectActiveContextJson);
  const activeContextName = useSelector(selectActiveContextName);
  const { auth, user, isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth();
  const { settings, update: updateSetting, loaded: settingsLoaded } = useSettings(isAuthenticated);
  const { setAndSave } = usePreferenceActions(updateSetting);

  // syncs local state from loaded settings after authentication
  useEffect(() => {
    if (!settingsLoaded) return;
    dispatch(hydratePreferences(settings));
  }, [dispatch, settings, settingsLoaded]);

  const chatgpt = useAI({ screenMonitorId: preferences.assistMonitorId });

  const { entitlement, checkQuota } = useEntitlement({
    isAuthenticated,
    auth,
    onQuotaExceeded: () => dispatch(setQuotaExceeded(true)),
  });

  useContentProtection(preferences.contentProtectionEnabled);

  const disguise = useAppDisguise(preferences.appDisguise);

  useWindowOverlay({
    alwaysOnTop,
    clickThrough,
    onToggleClickThrough: (value) => dispatch(setClickThrough(value)),
    disguise,
  });

  const sendSegmentRef = useRef(() => {});
  const sendSegment = useCallback((segment) => sendSegmentRef.current(segment), []);

  const transcripts = useTranscriptStreams({
    running,
    loopbackCaptureState,
    micCaptureState,
    preferences,
    activeContextJson,
    sendSegment,
  });

  const recorder = useSessionRecorder({
    isAuthenticated,
    preferences,
    transcripts,
    chatgpt,
    checkQuota,
  });
  sendSegmentRef.current = recorder.sendSegment;

  const { loopbackTranscript, micTranscript } = transcripts;

  // switches left tab and reloads sessions every time the sessions tab is opened
  const handleTabChange = (tab) => {
    dispatch(setActiveTab(tab));
    if (tab === "sessions") dispatch(fetchSessionsThunk());
  };

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(clearContexts());
      dispatch(clearSessions());
      return;
    }
    dispatch(fetchContextsThunk());
    dispatch(fetchSessionsThunk());
  }, [isAuthenticated, dispatch]);

  const handleAudioReady = useCallback(() => {
    chatgpt.initChatGPTWindow().catch(() => {});
  }, [chatgpt]);

  const { refreshDevices } = useAudioCaptureController(handleAudioReady);

  const mergedGroups = useMergedTranscriptGroups(loopbackTranscript.groups, micTranscript.groups);
  const assistFrames = useSelector((state) => state.assist.frames);
  const assistSlots = useSelector((state) => state.assist.slots);
  const assistPending = useSelector((state) => state.assist.pending);
  const assist = useAutoAssist({
    running,
    preferences,
    groups: mergedGroups,
    context: activeContextName,
    chat: chatgpt,
  });
  // assist panels stack above the chat so suggestions stay in view
  const openKinds = assistSlots.filter(Boolean);
  // mini mode keeps only the freshest panel, so one kind shows at a time
  const visibleKinds = miniMode
    ? openKinds
        .slice()
        .sort((a, b) => (assistFrames[b]?.updatedAt ?? 0) - (assistFrames[a]?.updatedAt ?? 0))
        .slice(0, 1)
    : openKinds;
  useMicTranslationTts({
    enabled: preferences.micTtsEnabled,
    running,
    groups: micTranscript.groups,
    endpointTick: micTranscript.endpointTick,
    language: preferences.micOutputLang,
    provider: preferences.micTtsProvider,
    voiceId: preferences.micTtsVoiceIds?.[preferences.micTtsProvider],
    speed: preferences.micTtsSonioxSpeed,
    outputDeviceId: preferences.micTtsOutputDeviceId,
    rate: preferences.micTtsRate,
    pitch: preferences.micTtsPitch,
    volume: preferences.micTtsProvider === "soniox" ? preferences.micTtsSonioxVolume : preferences.micTtsVolume,
  });
  const speechHighlight = useSpeechHighlight(preferences.micTtsEnabled && running);

  const audioRuntime = {
    loopbackError: loopbackTranscript.error,
    micError: micTranscript.error,
    onRefreshDevices: refreshDevices,
  };

  // sits in the transcript header normally, next to the logo in mini mode
  const recorderControl = (
    <StartStopCard
      running={running}
      onStart={recorder.start}
      onStop={recorder.stop}
      elapsed={recorder.isReadyToStop ? sessionElapsed : 0}
      preparing={recorder.isPreparing}
      readyToStop={recorder.isReadyToStop}
      progress={recorder.streamProgress}
      activeContextName={activeContextName}
      inline
    />
  );

  if (!isAuthenticated) {
    return (
      <div className="window">
        <div className="app">
          <TitleBar title="Sayvela" user={null} onLogoutClick={() => {}} />
          <main className="main">
            <LoginPanel onLogin={login} loading={authLoading} error={authError} />
          </main>
        </div>
      </div>
    );
  }

  if (sessionsErrorCode === SERVER_UNREACHABLE) {
    return (
      <div className="window">
        <div className="app">
          <TitleBar title="Sayvela" user={user} onLogoutClick={logout} />
          <ServerUnavailableScreen
            loading={sessionsLoading}
            onRetry={() => dispatch(fetchSessionsThunk())}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`window${clickThrough ? " window--ghost" : ""}`}>
      <div className="app">
        <TitleBar
          title="Sayvela"
          user={user}
          entitlement={entitlement}
          syncStatus={syncStatus}
          assist={{ status: assist.status, pending: assist.pending }}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogoutClick={logout}
          miniMode={miniMode}
          onToggleMiniMode={(value) => dispatch(setMiniMode(value))}
          miniAction={recorderControl}
          alwaysOnTop={alwaysOnTop}
          onToggleAlwaysOnTop={(value) => dispatch(setAlwaysOnTop(value))}
          clickThrough={clickThrough}
          onToggleClickThrough={(value) => dispatch(setClickThrough(value))}
          hideFromCapture={preferences.contentProtectionEnabled}
          onToggleHideFromCapture={setAndSave("contentProtectionEnabled")}
        />
        {quotaExceeded && (
          <QuotaExceededModal entitlement={entitlement} onDismiss={() => dispatch(setQuotaExceeded(false))} />
        )}

        <div className="app-body">
          {activeTab && !miniMode ? (
            <main className="main main--page">
              <AppLeftContent
                entitlement={entitlement}
                updateSetting={updateSetting}
                audioRuntime={audioRuntime}
              />
            </main>
          ) : (
          <main className="main main--center">
            <div className={`home-panels${miniMode ? " home-panels--mini" : ""}`}>
              <div className="home-col home-col--transcript">
                <TranscriptPanel
                  transcriptGroups={mergedGroups}
                  running={running}
                  loopbackStatus={loopbackTranscript.status}
                  loopbackBytes={loopbackBytes}
                  micStatus={micTranscript.status}
                  micBytes={micBytes}
                  speech={speechHighlight}
                  mini={miniMode}
                  titleAction={miniMode ? null : recorderControl}
                />
              </div>
              {/* mini mode drops the side column, so the panel lands over the transcript */}
              {miniMode ? (
                visibleKinds.length ? (
                  <div className="assist-stack assist-stack--mini">
                    {visibleKinds.map((kind) => (
                      <AssistFrame
                        key={kind}
                        kind={kind}
                        frame={assistFrames[kind]}
                        pending={assistPending}
                        onClose={(k) => dispatch(closeFrame(k))}
                      />
                    ))}
                  </div>
                ) : null
              ) : (
                <div className="home-col home-col--side">
                  {visibleKinds.length ? (
                    <div className="assist-stack">
                      {visibleKinds.map((kind) => (
                        <AssistFrame
                          key={kind}
                          kind={kind}
                          frame={assistFrames[kind]}
                          pending={assistPending}
                          onClose={(k) => dispatch(closeFrame(k))}
                        />
                      ))}
                    </div>
                  ) : null}
                  <AIChatPanel
                    messages={chatgpt.chatMessages}
                    input={chatgpt.chatInput}
                    onChangeInput={chatgpt.setChatInput}
                    onSend={chatgpt.sendManual}
                    onCancel={chatgpt.cancel}
                    onClear={chatgpt.clearChat}
                    isStreaming={chatgpt.isStreaming}
                    withScreenshot={chatgpt.withScreenshot}
                    onToggleScreenshot={chatgpt.toggleScreenshot}
                    assist={{
                      status: assist.status,
                      pending: assist.pending,
                      hotkey: preferences.assistHotkey,
                      onTrigger: assist.triggerNow,
                    }}
                    compact={openKinds.length > 0}
                  />
                </div>
              )}
            </div>
          </main>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
