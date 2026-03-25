import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

const CHATGPT_URL = "https://chatgpt.com";
const CHATGPT_WINDOW_LABEL = "chatgpt-anon";

// manages the lifecycle and interaction with an external chatgpt window
export function useChatGPT({ contentProtectionEnabled, micInputLangs, loopbackContext }) {
  const chatgptInitRef = useRef(null);
  const chatgptDidInitRef = useRef(false);
  const lastChatgptSentContextRef = useRef("");

  // initializes and positions the chatgpt webview window if it doesn't already exist
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
        try {
          await new Promise((r) => setTimeout(r, 200));
          await invoke("set_chatgpt_window_content_protected", { enabled: contentProtectionEnabled });
        } catch {}
      } catch {
        chatgptInitRef.current = null;
      }
    })();

    return chatgptInitRef.current;
  };

  // closes the chatgpt window and resets its initialization state
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

  // sends a conversation context to the chatgpt window for processing
  const sendMessage = async (conversation) => {
    if (!conversation || lastChatgptSentContextRef.current === conversation) return;
    
    lastChatgptSentContextRef.current = conversation;
    try {
      await ensureChatGPTWindow();
      await invoke("chatgpt_send_message", { 
        meInputLanguage: micInputLangs?.[0] || "vi", 
        context: loopbackContext, 
        conversation 
      });
    } catch (e) {
      lastChatgptSentContextRef.current = "";
      console.error("chatgpt_send_message failed:", e);
      throw e;
    }
  };

  // clears the record of the last sent conversation context
  const clearSentContext = () => {
    lastChatgptSentContextRef.current = "";
  };

  return {
    initChatGPTWindow,
    resetChatGPTWindow,
    sendMessage,
    clearSentContext,
  };
}
