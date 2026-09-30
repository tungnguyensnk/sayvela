import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { requestGate, sendAssist } from "../services/aiService.js";
import { captureScreen } from "../services/screenService.js";
import { registerAssistHotkey } from "../services/hotkeyService.js";
import { buildTranscriptWindow, nextBackoff, summarizeTurn } from "../ai/autoAssist.js";
import { CHAT_SOURCES } from "../ai/chatReducer.js";
import {
  applyToolCall,
  setError,
  setHotkeyError,
  setLastGateAt,
  setPending,
  setStatus,
} from "../store/assistSlice";

const MAX_HISTORY = 8;

// keeps the assist loop alive: gate on a timer, assist turns on new transcript
export function useAutoAssist({ running, preferences, groups, context, chat }) {
  const dispatch = useDispatch();
  const { status, frames, slots, pending, hotkeyPaused } = useSelector((s) => s.assist);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const stateRef = useRef({});
  stateRef.current = { status, frames, slots, pending, preferences, context };
  const runtimeRef = useRef({
    lastSeenId: "",
    lastTurnAt: 0,
    lastActivityAt: 0,
    history: [],
    busy: false,
    backoffMs: 0,
    retryAt: 0,
  });

  const reset = useCallback(() => {
    runtimeRef.current = {
      lastSeenId: "",
      lastTurnAt: 0,
      lastActivityAt: 0,
        history: [],
      busy: false,
      backoffMs: 0,
      retryAt: 0,
    };
  }, []);

  // every turn carries a fresh screenshot: history is text only, so a model
  // that did not get the image this turn is blind to the screen
  const grabScreen = useCallback(async () => {
    const { preferences: prefs } = stateRef.current;
    if (!prefs.assistSendScreenshot) return null;
    try {
      const shot = await captureScreen(prefs.assistMonitorId);
      return shot?.data_url || null;
    } catch {
      return null;
    }
  }, []);

  // holds the loop back after a failure so a broken upstream is not hammered
  const holdAfterError = useCallback(
    (e) => {
      const runtime = runtimeRef.current;
      runtime.backoffMs = nextBackoff(runtime.backoffMs);
      runtime.retryAt = Date.now() + runtime.backoffMs;
      dispatch(setError(String(e?.message || e)));
    },
    [dispatch]
  );

  const openFrames = useCallback(() => {
    const { frames: current, slots: currentSlots } = stateRef.current;
    return currentSlots
      .map((kind, slot) => {
        if (!kind) return null;
        const frame = current[kind];
        const latest = frame?.items?.[0] ?? {};
        return {
          kind,
          slot,
          cardCount: frame?.items?.length ?? 0,
          latestTitle: String(latest.title || latest.goal || latest.question || "").slice(0, 200),
        };
      })
      .filter(Boolean);
  }, []);

  const runAssistTurn = useCallback(
    async (window, { manual = false } = {}) => {
      const runtime = runtimeRef.current;
      if (runtime.busy) return;
      runtime.busy = true;
      runtime.lastTurnAt = Date.now();
      dispatch(setPending(true));
      const image = await grabScreen();
      const { preferences: prefs, context: ctx } = stateRef.current;
      const toolCalls = [];
      try {
        const result = await chat.runTurn({
          text: window.text,
          source: CHAT_SOURCES.AUTO,
          // the transcript already sits in the left column, no need to echo it
          showUser: false,
          request: (onEvent, opts) =>
            sendAssist(
              {
                transcript: window.text,
                image: image || undefined,
                history: runtime.history.slice(-MAX_HISTORY),
                language: prefs.loopbackOutputLang || "vi",
                speakLanguage: prefs.loopbackInputLangs?.[0] || undefined,
                context: ctx || undefined,
                openFrames: openFrames(),
                manual: manual || undefined,
              },
              onEvent,
              opts
            ),
          onEvent: (payload) => {
            if (payload?.event !== "tool") return;
            const { name, args } = payload.data || {};
            if (!name) return;
            toolCalls.push({ name, args });
            dispatch(
              applyToolCall({ name, args, id: `${Date.now()}-${toolCalls.length}`, createdAt: Date.now() })
            );
          },
        });
        const summary = summarizeTurn(toolCalls, result?.response ?? "");
        if (summary) {
          runtime.history = [
            ...runtime.history,
            { role: "user", content: window.text },
            { role: "assistant", content: summary },
          ].slice(-MAX_HISTORY);
        }
        runtime.backoffMs = 0;
        runtime.retryAt = 0;
        dispatch(setError(""));
      } catch (e) {
        holdAfterError(e);
      } finally {
        runtime.busy = false;
        dispatch(setPending(false));
      }
    },
    [chat, dispatch, grabScreen, holdAfterError, openFrames]
  );

  // one tick: gate while watching, assist turns while assisting
  const tick = useCallback(async () => {
    const runtime = runtimeRef.current;
    const { status: current, preferences: prefs, context: ctx } = stateRef.current;
    if (current === "off" || runtime.busy || Date.now() < runtime.retryAt) return;
    const window = buildTranscriptWindow(groupsRef.current, {
      maxAgeMs: prefs.assistWindowSec * 1000,
    });
    if (!window.count) return;
    const isNew = window.lastId !== runtime.lastSeenId;
    if (isNew) runtime.lastActivityAt = Date.now();

    if (current === "assisting") {
      const idleMs = Date.now() - (runtime.lastActivityAt || Date.now());
      if (idleMs > prefs.assistIdleExitSec * 1000) {
        dispatch(setStatus("watching"));
        reset();
        return;
      }
      if (!isNew) return;
      if (Date.now() - runtime.lastTurnAt < prefs.assistMinGapSec * 1000) return;
      runtime.lastSeenId = window.lastId;
      await runAssistTurn(window);
      return;
    }

    if (!prefs.assistAutoGate || !isNew) return;
    runtime.lastSeenId = window.lastId;
    try {
      const needHelp = await requestGate({ transcript: window.text, context: ctx || undefined });
      dispatch(setLastGateAt(Date.now()));
      if (!needHelp) return;
      dispatch(setStatus("assisting"));
      await runAssistTurn(window);
    } catch (e) {
      holdAfterError(e);
    }
  }, [dispatch, holdAfterError, reset, runAssistTurn]);

  // manual trigger: pressing it asks again, pressing it mid answer stops that
  // answer — it never costs two presses to get the next one
  const triggerNow = useCallback(async () => {
    const { preferences: prefs } = stateRef.current;
    if (runtimeRef.current.busy) {
      chat.cancel?.();
      return;
    }
    const found = buildTranscriptWindow(groupsRef.current, {
      maxAgeMs: prefs.assistWindowSec * 1000,
    });
    // asking by hand works even before anyone speaks: the screen is the question
    const window = found.count
      ? found
      : { ...found, text: "(no speech yet - answer from the screen)" };
    runtimeRef.current.lastSeenId = window.lastId;
    runtimeRef.current.lastActivityAt = Date.now();
    dispatch(setStatus("assisting"));
    await runAssistTurn(window, { manual: true });
  }, [chat, dispatch, runAssistTurn]);

  // the tick and trigger closures change on every render, so the timer and the
  // hotkey read them through refs instead of being torn down each time
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const triggerRef = useRef(triggerNow);
  triggerRef.current = triggerNow;

  // the loop only lives while a session is running
  useEffect(() => {
    reset();
    if (!running) dispatch(setStatus("off"));
  }, [running, dispatch, reset]);

  // with live ai off nothing watches, so the loop rests at off until the hotkey or bolt wakes it
  const resting = preferences.assistAutoGate ? "watching" : "off";
  useEffect(() => {
    if (running && status !== "assisting" && status !== resting) dispatch(setStatus(resting));
  }, [running, status, resting, dispatch]);

  useEffect(() => {
    if (status === "off") return undefined;
    const ms = Math.max(preferences.assistIntervalSec, 1) * 1000;
    const timer = setInterval(() => {
      tickRef.current().catch(() => {});
    }, ms);
    return () => clearInterval(timer);
  }, [status, preferences.assistIntervalSec]);

  useEffect(() => {
    // a slow registration from a previous combo must not undo the current one
    let cancelled = false;
    let unregister = null;
    if (hotkeyPaused) return undefined;
    registerAssistHotkey(preferences.assistHotkey, () => triggerRef.current())
      .then((fn) => {
        if (cancelled) {
          fn?.();
          return;
        }
        unregister = fn;
        dispatch(setHotkeyError(""));
      })
      .catch((e) => {
        if (!cancelled) dispatch(setHotkeyError(String(e?.message || e)));
      });
    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [preferences.assistHotkey, hotkeyPaused, dispatch]);

  return { status, pending, triggerNow };
}
