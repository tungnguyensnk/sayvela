import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getStoredAuth } from "../services/authService.js";
import { getConversationState } from "../services/chatgptConversationService.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:80/api";

function isTauriRuntime() {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

function abortError() {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

export async function sendStreamMessage(message, history = [], onEvent, options = {}) {
  if (!isTauriRuntime()) {
    throw new Error("chatgpt provider requires tauri runtime");
  }
  const requestId = options?.requestId;
  if (!requestId) throw new Error("missing requestId");
  const authToken = getStoredAuth()?.token;
  if (!authToken) throw new Error("missing auth token");

  const signal = options?.signal;
  const keepConversation = options?.keepConversation ?? false;
  const state = keepConversation ? options?.conversationState || getConversationState() : null;
  let unlisten = null;
  let finished = false;

  const teardown = async () => {
    if (!unlisten) return;
    try {
      unlisten();
    } catch {}
    unlisten = null;
  };

  return new Promise(async (resolve, reject) => {
    try {
      unlisten = await listen("chatgpt_stream_event", (e) => {
        const payload = e?.payload;
        const rid = payload?.request_id || payload?.requestId;
        if (!payload || rid !== requestId) return;
        const evt = payload.event;
        const data = payload.data;
        onEvent?.({ event: evt, data });
        if (evt === "result" || evt === "failed") {
          finished = true;
          teardown().then(() => {
            if (evt === "failed") reject(new Error(data?.error || "stream failed"));
            else resolve(data);
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
              await invoke("chatgpt_cancel_stream", { requestId });
            } catch {}
            await teardown();
            reject(abortError());
          },
          { once: true }
        );
      }

      await invoke("chatgpt_start_stream", {
        requestId,
        message,
        conversationId: state?.conversationId || null,
        parentMessageId: state?.parentMessageId || null,
        apiUrl: API_URL,
        authToken,
        keepConversation,
      });
    } catch (err) {
      await teardown();
      if (signal?.aborted) reject(abortError());
      else reject(err);
    }
  });
}
