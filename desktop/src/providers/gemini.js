import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function abortError() {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

export async function sendStreamMessage(message, _history = [], onEvent, options = {}) {
  if (!isTauri()) throw new Error("gemini provider requires tauri runtime");
  const requestId = options.requestId;
  if (!requestId) throw new Error("missing requestId");
  const signal = options.signal;
  let unlisten;
  let finished = false;
  return new Promise(async (resolve, reject) => {
    const teardown = () => {
      unlisten?.();
      unlisten = null;
    };
    try {
      unlisten = await listen("gemini_stream_event", ({ payload }) => {
        if (payload?.request_id !== requestId) return;
        onEvent?.({ event: payload.event, data: payload.data });
        if (payload.event === "result" || payload.event === "failed") {
          finished = true;
          teardown();
          payload.event === "failed" ? reject(new Error(payload.data?.error || "stream failed")) : resolve(payload.data);
        }
      });
      signal?.addEventListener("abort", async () => {
        if (finished) return;
        await invoke("gemini_cancel_stream", { requestId }).catch(() => {});
        teardown();
        reject(abortError());
      }, { once: true });
      if (signal?.aborted) throw abortError();
      await invoke("gemini_start_stream", { requestId, message });
    } catch (error) {
      teardown();
      reject(signal?.aborted ? abortError() : error);
    }
  });
}
