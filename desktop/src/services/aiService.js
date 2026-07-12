import { sendStreamMessage as sendChatgptMessage } from "../providers/chatgpt.js";
import { sendStreamMessage as sendGeminiMessage } from "../providers/gemini.js";

const providers = { chatgpt: sendChatgptMessage, gemini: sendGeminiMessage };

export async function sendMessage(provider, message, history = [], onEvent, options = {}) {
  const send = providers[provider];
  if (!send) throw new Error(`unsupported AI provider: ${provider}`);
  return send(message, history, onEvent, options);
}
