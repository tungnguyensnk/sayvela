import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

// manages the lifecycle and interaction with an external chatgpt window
export function useChatGPT({ contentProtectionEnabled, micInputLangs, loopbackContext }) {
  const chatgptDidInitRef = useRef(false);
  const lastChatgptSentContextRef = useRef("");

  void contentProtectionEnabled;

  const resetChatGPTWindow = async () => {
    chatgptDidInitRef.current = false;
  };

  const initChatGPTWindow = async () => {
    if (chatgptDidInitRef.current) return;
    chatgptDidInitRef.current = true;
    await invoke("chatgpt_init");
  };

  // sends a conversation context to the chatgpt window for processing
  const sendMessage = async (conversation) => {
    if (!conversation || lastChatgptSentContextRef.current === conversation) return;
    
    lastChatgptSentContextRef.current = conversation;
    try {
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
