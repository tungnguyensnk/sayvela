import { useEffect, useState, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

function groupKey(g) {
  if (!g) return "";
  if (g.id) return String(g.id);
  return String(`${g.createdAt || 0}-${g.seq || 0}-${g.speaker || ""}`);
}

function groupFullText(g) {
  const finalText = typeof g?.finalText === "string" ? g.finalText : "";
  const partialText = typeof g?.partialText === "string" ? g.partialText : "";
  return `${finalText}${partialText}`;
}

function buildSpeakerDelta(groups, cursor) {
  const list = Array.isArray(groups) ? groups : [];
  const filtered = list.filter((g) => {
    if (!g) return false;
    if (String(g.translationStatus || "original") !== "original") return false;
    const sp = String(g.speaker || "").trim().toLowerCase();
    if (!sp) return false;
    if (sp === "me") return false;
    return true;
  });

  let startIndex = 0;
  let startOffset = 0;
  if (cursor?.groupKey) {
    const idx = filtered.findIndex((g) => groupKey(g) === cursor.groupKey);
    if (idx >= 0) {
      startIndex = idx;
      startOffset = Math.max(0, Number(cursor.textLen) || 0);
    }
  }

  const lines = [];
  for (let i = startIndex; i < filtered.length; i++) {
    const g = filtered[i];
    let text = groupFullText(g);
    if (i === startIndex && startOffset > 0) {
      text = text.slice(Math.min(startOffset, text.length));
    }
    text = String(text || "").trim();
    if (!text) continue;
    lines.push(`SPEAKER ${String(g.speaker)}: ${text}`);
  }
  return lines.join("\n").trim();
}

function cursorAtEnd(groups) {
  const list = Array.isArray(groups) ? groups : [];
  const filtered = list.filter((g) => {
    if (!g) return false;
    if (String(g.translationStatus || "original") !== "original") return false;
    const sp = String(g.speaker || "").trim().toLowerCase();
    if (!sp) return false;
    if (sp === "me") return false;
    return true;
  });
  const last = filtered[filtered.length - 1];
  if (!last) return { groupKey: "", textLen: 0 };
  return { groupKey: groupKey(last), textLen: groupFullText(last).length };
}

function parseBinaryAnswer(s) {
  const m = String(s || "").match(/[01]/);
  return m ? Number(m[0]) : 0;
}

function buildRecentConversationText(loopbackGroups, micGroups, limitChars = 2000) {
  const sys = (Array.isArray(loopbackGroups) ? loopbackGroups : []).map((g) => ({ ...g, sessionId: "sys" }));
  const mic = (Array.isArray(micGroups) ? micGroups : []).map((g) => ({ ...g, sessionId: "mic" }));
  const merged = [...sys, ...mic].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const lines = [];

  for (const g of merged) {
    if (!g) continue;
    if (String(g.translationStatus || "original") !== "original") continue;
    const text = String(groupFullText(g) || "").trim();
    if (!text) continue;
    const label = g.sessionId === "mic" ? "ME" : `SPEAKER ${String(g.speaker || "").trim()}`;
    lines.push(`${label}: ${text}`);
  }

  const all = lines.join("\n").trim();
  if (all.length <= limitChars) return all;
  return all.slice(all.length - limitChars);
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
  const loopbackGroupsRef = useRef([]);
  const micGroupsRef = useRef([]);
  const speakerCursorRef = useRef({ groupKey: "", textLen: 0 });
  const speakerCheckingRef = useRef(false);
  const speakerPauseTimerRef = useRef(null);
  const speakerIntervalRef = useRef(null);
  const runningRef = useRef(false);
  const lastChatgptSentContextRef = useRef("");

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    loopbackGroupsRef.current = loopbackTranscript.groups;
  }, [loopbackTranscript.groups]);

  useEffect(() => {
    micGroupsRef.current = micTranscript.groups;
  }, [micTranscript.groups]);

  const triggerSpeakerQuestionCheck = async () => {
    if (!runningRef.current) return;
    if (speakerCheckingRef.current) return;

    const delta = buildSpeakerDelta(loopbackGroupsRef.current, speakerCursorRef.current);
    if (!delta) return;

    speakerCheckingRef.current = true;
    try {
      const out = await invoke("groq_check_question", { content: delta });
      const bin = parseBinaryAnswer(out);
      console.log(bin);

      if (bin === 1) {
        const recent = buildRecentConversationText(loopbackGroupsRef.current, micGroupsRef.current, 2000);
        if (recent && lastChatgptSentContextRef.current !== recent) {
          lastChatgptSentContextRef.current = recent;
          try {
            await ensureChatGPTWindow();
            await invoke("chatgpt_send_message", { meInputLanguage: micInputLangs?.[0] || "vi", context: loopbackContext, conversation: recent });
          } catch (e) {
            lastChatgptSentContextRef.current = "";
            console.error("chatgpt_send_message failed:", e);
          }
        }
      }

      speakerCursorRef.current = cursorAtEnd(loopbackGroupsRef.current);
    } catch (e) {
      console.error("groq_check_question failed:", e);
    } finally {
      speakerCheckingRef.current = false;
    }
  };

  const ensureChatGPTWindow = async () => {
    if (chatgptInitRef.current) return chatgptInitRef.current;

    chatgptInitRef.current = (async () => {
      try {
        const existing = await WebviewWindow.getByLabel(CHATGPT_WINDOW_LABEL);
        if (existing) return;
        const opts = {
          url: CHATGPT_URL,
          title: "ChatGPT (anon)",
          width: 600,
          height: 800,
          resizable: true,
          decorations: true,
          incognito: true,
        };

        try {
          const appWindow = getCurrentWindow();
          const pos = await appWindow.outerPosition();
          const size = await appWindow.outerSize();
          const gap = 8;

          let x = Math.round((pos?.x ?? 0) + (size?.width ?? 0) + gap);
          let y = Math.round(pos?.y ?? 0);

          try {
            const monitor = await appWindow.currentMonitor();
            const work = monitor?.workArea || monitor;
            const wx = work?.position?.x;
            const wy = work?.position?.y;
            const ww = work?.size?.width;
            const wh = work?.size?.height;

            if ([wx, wy, ww, wh].every((n) => Number.isFinite(n))) {
              const maxX = Math.round(wx + ww - opts.width);
              const maxY = Math.round(wy + wh - opts.height);
              x = Math.min(maxX, Math.max(Math.round(wx), x));
              y = Math.min(maxY, Math.max(Math.round(wy), y));
            }
          } catch {}

          if (Number.isFinite(x)) opts.x = x;
          if (Number.isFinite(y)) opts.y = y;
        } catch {}

        new WebviewWindow(CHATGPT_WINDOW_LABEL, opts);
      } catch {
        chatgptInitRef.current = null;
      }
    })();

    return chatgptInitRef.current;
  };

  const resetChatGPTWindow = async () => {
    try {
      const existing = await WebviewWindow.getByLabel(CHATGPT_WINDOW_LABEL);
      if (existing) {
        await existing.close();
      }
    } catch {}
    chatgptInitRef.current = null;
    chatgptDidInitRef.current = false;
  };

  const initChatGPTWindow = async () => {
    await ensureChatGPTWindow();
    if (chatgptDidInitRef.current) return;
    chatgptDidInitRef.current = true;
    await new Promise((r) => setTimeout(r, 300));
    await invoke("chatgpt_init");
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
        await initChatGPTWindow();
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

  useEffect(() => {
    if (!running) {
      if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
      speakerPauseTimerRef.current = null;
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
      speakerIntervalRef.current = null;
      speakerCursorRef.current = { groupKey: "", textLen: 0 };
      speakerCheckingRef.current = false;
      lastChatgptSentContextRef.current = "";
      return;
    }

    speakerCursorRef.current = { groupKey: "", textLen: 0 };
    speakerIntervalRef.current = setInterval(() => {
      triggerSpeakerQuestionCheck();
    }, 10000);

    return () => {
      if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
      speakerPauseTimerRef.current = null;
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
      speakerIntervalRef.current = null;
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (speakerPauseTimerRef.current) clearTimeout(speakerPauseTimerRef.current);
    speakerPauseTimerRef.current = setTimeout(() => {
      triggerSpeakerQuestionCheck();
    }, 2000);
  }, [running, loopbackTranscript.groups]);

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
      await resetChatGPTWindow();
      await initChatGPTWindow();
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
