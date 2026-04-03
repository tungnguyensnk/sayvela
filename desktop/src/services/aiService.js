// src/services/aiService.js
import { sendStreamMessage } from '../providers/gptfree.js';

export const aiProviders = {
  GPTFREE: 'gptfree'
};

let currentProvider = aiProviders.GPTFREE;

export function setAIProvider(provider) {
  currentProvider = provider;
}

export async function sendMessage(message, history = [], onEvent, options = {}) {
  if (currentProvider === aiProviders.GPTFREE) {
    return sendStreamMessage(message, history, onEvent, options);
  }
  throw new Error(`Unsupported AI provider: ${currentProvider}`);
}
