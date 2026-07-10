import { sendStreamMessage } from '../providers/chatgpt.js';

export async function sendMessage(message, history = [], onEvent, options = {}) {
  return sendStreamMessage(message, history, onEvent, options);
}
