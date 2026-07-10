import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useDispatch } from "react-redux";
import { byteSize } from "../transcript/transcriptUtils";
import { addLoopbackBytes, addMicBytes, setDevices, setDevicesError, setLoopbackCaptureState, setMicCaptureState } from "../store/audioSlice";

export function useAudioCaptureController(onReady) {
  const dispatch = useDispatch();
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const refreshDevices = useCallback(async () => {
    dispatch(setDevicesError(""));
    try {
      const list = await invoke("list_audio_devices");
      dispatch(setDevices(list));
    } catch (e) {
      dispatch(setDevices([]));
      dispatch(setDevicesError(String(e)));
    }
  }, [dispatch]);

  useEffect(() => {
    refreshDevices();
    onReadyRef.current?.();
  }, [refreshDevices]);

  useEffect(() => {
    let unlistenList = [];
    (async () => {
      unlistenList.push(await listen("audio_chunk_loopback", (e) => {
        const n = byteSize(e.payload);
        if (n > 0) dispatch(addLoopbackBytes(n));
      }));
      unlistenList.push(await listen("audio_chunk_mic", (e) => {
        const n = byteSize(e.payload);
        if (n > 0) dispatch(addMicBytes(n));
      }));
      unlistenList.push(await listen("capture_state_loopback", (e) => dispatch(setLoopbackCaptureState(e.payload))));
      unlistenList.push(await listen("capture_state_mic", (e) => dispatch(setMicCaptureState(e.payload))));
    })();
    return () => unlistenList.forEach((u) => u());
  }, [dispatch]);

  return { refreshDevices };
}
