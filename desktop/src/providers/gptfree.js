import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function isTauriRuntime() {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

export async function sendStreamMessage(message, history = [], onEvent, options = {}) {
  if (!isTauriRuntime()) {
    throw new Error("gptfree provider requires tauri runtime");
  }

  const requestId = options?.requestId;
  if (!requestId) {
    throw new Error("missing requestId");
  }
  const signal = options?.signal;

  let unlisten = null;
  let finished = false;

  const teardown = async () => {
    if (unlisten) {
      try {
        unlisten();
      } catch {}
      unlisten = null;
    }
  };

  const abortError = () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    return e;
  };

  return new Promise(async (resolve, reject) => {
    try {
      unlisten = await listen("gptfree_stream_event", (e) => {
        const payload = e?.payload;
        const rid = payload?.request_id || payload?.requestId;
        if (!payload || rid !== requestId) return;
        const evt = payload.event;
        const data = payload.data;
        if (onEvent) onEvent({ event: evt, data });
        if (evt === "result" || evt === "failed") {
          finished = true;
          teardown().then(() => {
            if (evt === "failed") reject(new Error(data?.error || "stream failed"));
            else resolve();
          });
        }
      });

      if (signal) {
        if (signal.aborted) {
          await teardown();
          reject(abortError());
          return;
        }
        signal.addEventListener(
          "abort",
          async () => {
            if (finished) return;
            try {
              await invoke("gptfree_cancel_stream", { requestId });
            } catch {}
            await teardown();
            reject(abortError());
          },
          { once: true }
        );
      }

      await invoke("gptfree_start_stream", { requestId, message, history });
    } catch (err) {
      await teardown();
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      reject(err);
    }
  });
}
