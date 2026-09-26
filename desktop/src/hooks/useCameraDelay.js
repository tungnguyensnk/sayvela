import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// start and stop each block on a backend thread; run in order, a late stop
// cannot tear down the engine a newer start just opened
let lifecycle = Promise.resolve();
const inOrder = (command, args) => {
  const next = lifecycle.then(() => invoke(command, args));
  lifecycle = next.catch(() => {});
  return next;
};

// republishes the chosen webcam as "DirectShow Softcam", held back by delayMs
// while active and live otherwise, rendered at scalePercent of its size and
// fps frames a second. returns the last error, if any
export function useCameraDelay({ enabled, deviceName, delayMs, scalePercent, fps, active }) {
  const [error, setError] = useState("");
  const delay = active ? delayMs : 0;

  useEffect(() => {
    setError("");
    if (!enabled) return undefined;
    let alive = true;
    inOrder("vcam_start", { deviceName }).catch((err) => alive && setError(String(err)));
    return () => {
      alive = false;
      inOrder("vcam_stop").catch(() => {});
    };
  }, [enabled, deviceName]);

  useEffect(() => {
    if (!enabled) return;
    invoke("vcam_set_output", { delayMs: delay, scalePercent, fps }).catch(() => {});
  }, [enabled, delay, scalePercent, fps]);

  return error;
}
