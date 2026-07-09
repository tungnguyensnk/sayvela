import { useEffect, useRef } from "react";
import { useTranscript } from "../transcript/useTranscript";

export function useTranscriptStreams({ running, loopbackCaptureState, micCaptureState, preferences, activeContextJson, sendSegment }) {
  const loopbackTranscript = useTranscript();
  const micTranscript = useTranscript();
  const loopbackStartedRef = useRef(false);
  const micStartedRef = useRef(false);

  useEffect(() => {
    if (!running) { loopbackStartedRef.current = false; return; }
    if (loopbackCaptureState?.state === "running" && loopbackCaptureState?.sampleRate && !loopbackStartedRef.current && preferences.loopbackDeviceId) {
      loopbackStartedRef.current = true;
      loopbackTranscript.start({
        sampleRate: loopbackCaptureState.sampleRate,
        languageHints: preferences.loopbackInputLangs.length ? preferences.loopbackInputLangs : ["en", "ja"],
        targetLanguage: preferences.loopbackOutputLang,
        enableTranslation: Boolean(preferences.loopbackOutputLang),
        audioEventName: "audio_chunk_loopback",
        context: activeContextJson,
        onTurnEnd: (seg) => sendSegment({ ...seg, source: "loopback" }),
      }).catch(() => {});
    }
  }, [running, loopbackCaptureState, preferences.loopbackInputLangs, preferences.loopbackOutputLang, preferences.loopbackDeviceId, activeContextJson, sendSegment]);

  useEffect(() => {
    if (!running) { micStartedRef.current = false; return; }
    if (micCaptureState?.state === "running" && micCaptureState?.sampleRate && !micStartedRef.current && preferences.micDeviceId) {
      micStartedRef.current = true;
      micTranscript.start({
        sampleRate: micCaptureState.sampleRate,
        languageHints: preferences.micInputLangs.length ? preferences.micInputLangs : ["vi"],
        targetLanguage: preferences.micOutputLang,
        enableTranslation: Boolean(preferences.micOutputLang),
        audioEventName: "audio_chunk_mic",
        context: activeContextJson,
        speakerOverride: "me",
        splitTurnsOnLanguage: false,
        enableSpeakerDiarization: false,
        onTurnEnd: (seg) => sendSegment({ ...seg, source: "mic", speaker: seg.translationStatus === "original" ? "me" : seg.speaker }),
      }).catch(() => {});
    }
  }, [running, micCaptureState, preferences.micInputLangs, preferences.micOutputLang, preferences.micDeviceId, activeContextJson, sendSegment]);

  const stopTranscripts = async () => {
    try { await loopbackTranscript.stop(); } catch {}
    try { await micTranscript.stop(); } catch {}
  };

  return { loopbackTranscript, micTranscript, stopTranscripts };
}
