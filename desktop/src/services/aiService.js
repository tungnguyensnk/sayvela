import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getStoredAuth } from "./authService.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:80/api";

function abortError() {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

// streams a chat completion through the backend proxy via the tauri bridge
export async function sendMessage(messages, onEvent, { requestId, signal } = {}) {
  if (!requestId) throw new Error("missing requestId");
  const authToken = getStoredAuth()?.token;
  if (!authToken) throw new Error("missing auth token");

  let unlisten = null;
  let finished = false;
  const teardown = () => {
    try {
      unlisten?.();
    } catch {}
    unlisten = null;
  };

  return new Promise(async (resolve, reject) => {
    try {
      unlisten = await listen("ai_stream_event", (e) => {
        const payload = e?.payload;
        if (!payload || payload.request_id !== requestId) return;
        onEvent?.({ event: payload.event, data: payload.data });
        if (payload.event !== "result" && payload.event !== "failed") return;
        finished = true;
        teardown();
        if (payload.event === "failed") reject(new Error(payload.data?.error || "stream failed"));
        else resolve(payload.data);
      });

      if (signal) {
        if (signal.aborted) {
          teardown();
          reject(abortError());
          return;
        }
        signal.addEventListener(
          "abort",
          async () => {
            if (finished) return;
            try {
              await invoke("ai_cancel_stream", { requestId });
            } catch {}
            teardown();
            reject(abortError());
          },
          { once: true }
        );
      }

      await invoke("ai_start_stream", {
        request: { requestId, messages, apiUrl: API_URL, authToken },
      });
    } catch (err) {
      teardown();
      reject(signal?.aborted ? abortError() : err);
    }
  });
}
