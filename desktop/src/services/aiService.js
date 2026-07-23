import { sendStreamMessage as sendChatgptMessage } from "../providers/chatgpt.js";

export async function sendMessage(message, history = [], onEvent, options = {}) {
  return sendChatgptMessage(message, history, onEvent, options);
}
