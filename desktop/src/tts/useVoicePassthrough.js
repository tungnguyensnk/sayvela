import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { registerHotkey } from "../services/hotkeyService";

// a press held longer than this is push-to-talk: letting go flips it back
const HOLD_MS = 300;

// arm and disarm each block on a backend thread; run in order, a late disarm
// cannot tear down the engine a newer arm just opened
let lifecycle = Promise.resolve();
const inOrder = (command, args) => {
  const next = lifecycle.then(() => invoke(command, args));
  lifecycle = next.catch(() => {});
  return next;
};

// sends your own mic straight to the tts output while on. a tap toggles it,
// a hold switches it only for as long as the key is down
export function useVoicePassthrough({ armed, hotkey, micDeviceId, outputDeviceId, paused = false }) {
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);

  // the streams open ahead of time, so the hotkey switches with no device lag
  useEffect(() => {
    setOn(false);
    setReady(false);
    if (!armed) return undefined;
    let alive = true;
    inOrder("passthrough_arm", { micDeviceId, outputDeviceId })
      .then(() => alive && setReady(true))
      .catch((err) => console.error("voice passthrough failed", err));
    return () => {
      alive = false;
      inOrder("passthrough_disarm").catch(() => {});
    };
  }, [armed, micDeviceId, outputDeviceId]);

  useEffect(() => {
    invoke("passthrough_set", { enabled: ready && on }).catch(() => {});
  }, [ready, on]);

  useEffect(() => {
    if (!ready || paused || !hotkey) return undefined;
    // a slow registration from a previous combo must not undo the current one
    let cancelled = false;
    let unregister = null;
    let pressedAt = 0;
    registerHotkey("passthrough", hotkey, {
      onPress: () => {
        pressedAt = Date.now();
        setOn((v) => !v);
      },
      onRelease: () => {
        if (pressedAt && Date.now() - pressedAt >= HOLD_MS) setOn((v) => !v);
        pressedAt = 0;
      },
    })
      .then((fn) => {
        if (cancelled) fn?.();
        else unregister = fn;
      })
      .catch((err) => console.error("voice passthrough hotkey failed", err));
    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [ready, paused, hotkey]);

  return ready && on;
}
