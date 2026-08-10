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
import { LeftBar } from "./components/LeftBar";
import { StartStopCard } from "./components/StartStopCard";
import { AppLeftContent } from "./components/AppLeftContent";
import { ServerUnavailableScreen } from "./components/ServerUnavailableScreen";
import { useAI } from "./hooks/useAI";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { useMergedTranscriptGroups } from "./hooks/useMergedTranscriptGroups";
import { useAudioCaptureController } from "./hooks/useAudioCaptureController";
import { useContentProtection } from "./hooks/useContentProtection";
import { useEntitlement } from "./hooks/useEntitlement";
import { useSessionRecorder } from "./hooks/useSessionRecorder";
import { useTranscriptStreams } from "./hooks/useTranscriptStreams";
import { hydratePreferences } from "./store/preferencesSlice";
import { setActiveTab, setQuotaExceeded } from "./store/uiSlice";
import { clearContexts, fetchContextsThunk } from "./store/contextsSlice";
import { clearSessions, fetchSessionsThunk } from "./store/sessionsSlice";
import { SERVER_UNREACHABLE } from "./services/apiClient";
import { selectActiveContextJson, selectActiveContextName } from "./store/selectors";

// main application component that manages audio capture, transcription, and translation state
function App() {
  const dispatch = useDispatch();
  const { running, loopbackBytes, micBytes, loopbackCaptureState, micCaptureState } = useSelector((state) => state.audio);
  const preferences = useSelector((state) => state.preferences);
  const { activeTab, quotaExceeded, syncStatus, sessionElapsed } = useSelector((state) => state.ui);
  const { loading: sessionsLoading, errorCode: sessionsErrorCode } = useSelector((state) => state.sessions);
  const activeContextJson = useSelector(selectActiveContextJson);
  const activeContextName = useSelector(selectActiveContextName);
  const { auth, user, isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth();
  const { settings, update: updateSetting, loaded: settingsLoaded } = useSettings(isAuthenticated);

  // syncs local state from loaded settings after authentication
  useEffect(() => {
    if (!settingsLoaded) return;
    dispatch(hydratePreferences(settings));
  }, [dispatch, settings, settingsLoaded]);

  const chatgpt = useAI();

  const { entitlement, checkQuota } = useEntitlement({
    isAuthenticated,
    auth,
    onQuotaExceeded: () => dispatch(setQuotaExceeded(true)),
  });

  useContentProtection(preferences.contentProtectionEnabled);

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
    <div className="window">
      <div className="app">
        <TitleBar
          title="Sayvela"
          user={user}
          entitlement={entitlement}
          syncStatus={syncStatus}
          onLogoutClick={logout}
        />
        {quotaExceeded && (
          <QuotaExceededModal entitlement={entitlement} onDismiss={() => dispatch(setQuotaExceeded(false))} />
        )}

        <div className="app-body">
          <LeftBar activeTab={activeTab} onTabChange={handleTabChange}>
            <AppLeftContent
              entitlement={entitlement}
              updateSetting={updateSetting}
              audioRuntime={audioRuntime}
            />
          </LeftBar>

          <main className="main main--center" onClick={() => activeTab && dispatch(setActiveTab(null))}>
            <div className="home-panels">
              <TranscriptPanel
                transcriptGroups={mergedGroups}
                running={running}
                loopbackStatus={loopbackTranscript.status}
                loopbackBytes={loopbackBytes}
                micStatus={micTranscript.status}
                micBytes={micBytes}
                speech={speechHighlight}
                titleAction={(
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
                )}
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
