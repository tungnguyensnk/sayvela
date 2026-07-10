const STORAGE_KEY = "sayvela_chatgpt_conversation";

export function getConversationState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversationId: "", parentMessageId: "" };
    const data = JSON.parse(raw);
    return {
      conversationId: data?.conversationId || "",
      parentMessageId: data?.parentMessageId || "",
    };
  } catch {
    return { conversationId: "", parentMessageId: "" };
  }
}

export function saveConversationState({ conversationId, parentMessageId }) {
  if (!conversationId || !parentMessageId) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId, parentMessageId, updatedAt: Date.now() })
    );
  } catch {}
}

export function clearConversationState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
