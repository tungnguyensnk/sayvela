import { sendStreamMessage } from '../providers/gptfree.js';

export async function sendMessage(message, history = [], onEvent, options = {}) {
  return sendStreamMessage(message, history, onEvent, options);
}
