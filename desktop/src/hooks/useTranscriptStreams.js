import { useEffect, useRef } from "react";
import { useTranscript } from "../transcript/useTranscript";

export function useTranscriptStreams({ running, loopbackCaptureState, micCaptureState, preferences, activeContextJson, sendSegment }) {
  const loopbackTranscript = useTranscript();
  const micTranscript = useTranscript();
  const loopbackStartedRef = useRef(false);
  const micStartedRef = useRef(false);
  const loopbackRetryRef = useRef(0);
  const micRetryRef = useRef(0);

  useEffect(() => {
    if (!running) { loopbackStartedRef.current = false; loopbackRetryRef.current = 0; return; }
    if (loopbackTranscript.status === "streaming") loopbackRetryRef.current = 0;
    if (loopbackTranscript.status === "error") {
      loopbackStartedRef.current = false;
      if (loopbackRetryRef.current >= 5) return;
      const timer = setTimeout(() => {
        loopbackRetryRef.current += 1;
        loopbackStartedRef.current = true;
        loopbackTranscript.start({
          sampleRate: loopbackCaptureState.sampleRate,
          languageHints: preferences.loopbackInputLangs.length ? preferences.loopbackInputLangs : ["en", "ja"],
          targetLanguage: preferences.loopbackOutputLang,
          audioEventName: "audio_chunk_loopback",
          context: activeContextJson,
          preserveGroups: true,
          onTurnEnd: (seg) => sendSegment({ ...seg, source: "loopback" }),
        }).catch(() => { loopbackStartedRef.current = false; });
      }, Math.min(1000 * 2 ** loopbackRetryRef.current, 8000));
      return () => clearTimeout(timer);
    }
    if (loopbackCaptureState?.state === "running" && loopbackCaptureState?.sampleRate && !loopbackStartedRef.current && preferences.loopbackDeviceId) {
      loopbackStartedRef.current = true;
      loopbackTranscript.start({
        sampleRate: loopbackCaptureState.sampleRate,
        languageHints: preferences.loopbackInputLangs.length ? preferences.loopbackInputLangs : ["en", "ja"],
        targetLanguage: preferences.loopbackOutputLang,
        audioEventName: "audio_chunk_loopback",
        context: activeContextJson,
        onTurnEnd: (seg) => sendSegment({ ...seg, source: "loopback" }),
      }).catch(() => { loopbackStartedRef.current = false; });
    }
  }, [running, loopbackCaptureState, loopbackTranscript.status, preferences.loopbackInputLangs, preferences.loopbackOutputLang, preferences.loopbackDeviceId, activeContextJson, sendSegment]);

  useEffect(() => {
    if (!running) { micStartedRef.current = false; micRetryRef.current = 0; return; }
    if (micTranscript.status === "streaming") micRetryRef.current = 0;
    if (micTranscript.status === "error") {
      micStartedRef.current = false;
      if (micRetryRef.current >= 5) return;
      const timer = setTimeout(() => {
        micRetryRef.current += 1;
        micStartedRef.current = true;
        micTranscript.start({
          sampleRate: micCaptureState.sampleRate,
          languageHints: preferences.micInputLangs.length ? preferences.micInputLangs : ["vi"],
          targetLanguage: preferences.micOutputLang,
          audioEventName: "audio_chunk_mic",
          context: activeContextJson,
          speakerOverride: "me",
          enableSpeakerDiarization: false,
          preserveGroups: true,
          onTurnEnd: (seg) => sendSegment({ ...seg, source: "mic", speaker: seg.translationStatus === "original" ? "me" : seg.speaker }),
        }).catch(() => { micStartedRef.current = false; });
      }, Math.min(1000 * 2 ** micRetryRef.current, 8000));
      return () => clearTimeout(timer);
    }
    if (micCaptureState?.state === "running" && micCaptureState?.sampleRate && !micStartedRef.current && preferences.micDeviceId) {
      micStartedRef.current = true;
      micTranscript.start({
        sampleRate: micCaptureState.sampleRate,
        languageHints: preferences.micInputLangs.length ? preferences.micInputLangs : ["vi"],
        targetLanguage: preferences.micOutputLang,
        audioEventName: "audio_chunk_mic",
        context: activeContextJson,
        speakerOverride: "me",
        enableSpeakerDiarization: false,
        onTurnEnd: (seg) => sendSegment({ ...seg, source: "mic", speaker: seg.translationStatus === "original" ? "me" : seg.speaker }),
      }).catch(() => { micStartedRef.current = false; });
    }
  }, [running, micCaptureState, micTranscript.status, preferences.micInputLangs, preferences.micOutputLang, preferences.micDeviceId, activeContextJson, sendSegment]);

  const stopTranscripts = async () => {
    try { await loopbackTranscript.stop(); } catch {}
    try { await micTranscript.stop(); } catch {}
  };

  return { loopbackTranscript, micTranscript, stopTranscripts };
}
