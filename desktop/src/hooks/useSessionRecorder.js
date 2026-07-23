import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { invoke } from "@tauri-apps/api/core";
import { resetBytes, setRunning } from "../store/audioSlice";
import { resetSessionElapsed, setSessionElapsed, setSyncStatus } from "../store/uiSlice";
import { fetchSessionsThunk } from "../store/sessionsSlice";
import { createSession, finalizeSession } from "../services/sessionSyncService";
import { recordUsage } from "../services/entitlementService";
import { getStoredAuth } from "../services/authService";
import { createSegmentWsClient } from "../services/segmentWsClient";
import { getRemainingSegments } from "../transcript/segmentMappers";
import { useRecorderMachine } from "./useRecorderMachine";

export function useSessionRecorder({ isAuthenticated, preferences, transcripts, chatgpt, checkQuota }) {
  const dispatch = useDispatch();
  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const wsClientRef = useRef(null);
  const { state, dispatch: dispatchMachine, canStart, canStop } = useRecorderMachine();
  const { loopbackCaptureState, micCaptureState } = useSelector((s) => s.audio);

  const sendSegment = useCallback((segment) => {
    wsClientRef.current?.send(segment);
  }, []);

  const cleanupPartialStart = useCallback(async () => {
    clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    try { if (preferences.loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" }); } catch {}
    try { if (preferences.micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" }); } catch {}
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    sessionIdRef.current = null;
    dispatch(setRunning(false));
  }, [dispatch, preferences.loopbackDeviceId, preferences.micDeviceId]);

  const start = useCallback(async () => {
    if (!canStart) return;
    dispatchMachine({ type: "QUOTA_CHECKING" });
    const allowed = await checkQuota();
    if (!allowed) { dispatchMachine({ type: "RESET" }); return; }
    dispatchMachine({ type: "STARTING" });
    dispatch(resetBytes());
    dispatch(setRunning(true));
    dispatch(resetSessionElapsed());
    sessionStartRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      dispatch(setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000)));
    }, 1000);

    try {
      if (isAuthenticated) {
        const sid = await createSession({ title: `Session ${new Date().toLocaleString("vi-VN")}` });
        sessionIdRef.current = sid;
        dispatch(setSyncStatus(null));
        if (sid) {
          const { token } = getStoredAuth() ?? {};
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:80/api";
          wsClientRef.current = createSegmentWsClient();
          wsClientRef.current.connect(sid, token, apiUrl).catch(() => {});
        }
      }
      await chatgpt.resetChatGPTWindow();
      await chatgpt.initChatGPTWindow();
      if (preferences.loopbackDeviceId) await invoke("start_audio_capture", { deviceId: preferences.loopbackDeviceId, kind: "loopback" });
      if (preferences.micDeviceId) await invoke("start_audio_capture", { deviceId: preferences.micDeviceId, kind: "microphone" });
      dispatchMachine({ type: "STARTED" });
    } catch (e) {
      await cleanupPartialStart();
      dispatchMachine({ type: "FAILED", error: String(e) });
      alert("Start failed: " + e);
    }
  }, [canStart, chatgpt, checkQuota, cleanupPartialStart, dispatch, dispatchMachine, isAuthenticated, preferences]);

  const stop = useCallback(async () => {
    if (!canStop) return;
    dispatchMachine({ type: "STOPPING" });
    clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    try { if (preferences.loopbackDeviceId) await invoke("stop_audio_capture", { kind: "loopback" }); } catch {}
    try { if (preferences.micDeviceId) await invoke("stop_audio_capture", { kind: "microphone" }); } catch {}
    dispatch(setRunning(false));
    await transcripts.stopTranscripts();

    if (isAuthenticated && sessionIdRef.current) {
      const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
      const minutes = Math.ceil(durationMs / 60000);
      dispatchMachine({ type: "SYNCING" });
      dispatch(setSyncStatus("syncing"));
      let synced = false;
      try {
        const remaining = getRemainingSegments({
          loopbackGroups: transcripts.loopbackTranscript.groups,
          micGroups: transcripts.micTranscript.groups,
          sentIds: wsClientRef.current?.getSentIds() ?? new Set(),
        });
        await wsClientRef.current?.flush(remaining);
        await Promise.all([
          finalizeSession(sessionIdRef.current, { durationSeconds: Math.round(durationMs / 1000), status: "completed" }),
          recordUsage(minutes),
        ]);
        synced = true;
        dispatch(setSyncStatus("synced"));
        setTimeout(() => dispatch(setSyncStatus(null)), 3000);
        dispatchMachine({ type: "SYNCED" });
      } catch (e) {
        dispatch(setSyncStatus("failed"));
        dispatchMachine({ type: "FAILED", error: String(e) });
      } finally {
        wsClientRef.current?.disconnect();
        wsClientRef.current = null;
        if (synced) sessionIdRef.current = null;
      }
      dispatch(fetchSessionsThunk());
    } else {
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
      dispatchMachine({ type: "SYNCED" });
    }
  }, [canStop, dispatch, dispatchMachine, isAuthenticated, preferences.loopbackDeviceId, preferences.micDeviceId, transcripts]);

  const sourceProgress = (status) => {
    if (status === "streaming") return 0.5;
    if (["connecting", "configuring", "reconnecting"].includes(status)) return 0.35;
    if (status === "starting") return 0.2;
    return 0;
  };
  const enabledSourceCount = [preferences.loopbackDeviceId, preferences.micDeviceId].filter(Boolean).length;
  const sourceStatuses = [
    preferences.loopbackDeviceId && transcripts.loopbackTranscript.status,
    preferences.micDeviceId && transcripts.micTranscript.status,
  ].filter(Boolean);
  const hasStreamError = sourceStatuses.some((status) => ["error", "closed"].includes(status));
  const streamProgress = enabledSourceCount
    ? (sourceProgress(preferences.loopbackDeviceId ? transcripts.loopbackTranscript.status : "idle") + sourceProgress(preferences.micDeviceId ? transcripts.micTranscript.status : "idle")) / (enabledSourceCount * 0.5)
    : 0;
  const isPreparing = state.status === "running" && !hasStreamError && enabledSourceCount > 0 && streamProgress < 1;
  const isReadyToStop = state.status === "running" && (hasStreamError || enabledSourceCount === 0 || streamProgress >= 1);

  return { start, stop, sendSegment, recorderStatus: state.status, recorderError: state.error, isPreparing, isReadyToStop, streamProgress };
}
