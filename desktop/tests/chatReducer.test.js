import { describe, it, expect } from "vitest";
import {
  chatReducer,
  initialChatState,
  createChatMessage,
  CHAT_SOURCES,
  CHAT_STATUSES,
  shouldSkipAutoSend,
} from "../src/ai/chatReducer.js";

describe("chatReducer", () => {
  it("should stream chunks then finish", () => {
    const requestId = "r1";
    const user = createChatMessage({
      id: "u1",
      role: "user",
      text: "hi",
      source: CHAT_SOURCES.MANUAL,
      status: CHAT_STATUSES.DONE,
      createdAt: 1,
    });
    const assistant = createChatMessage({
      id: "a1",
      role: "assistant",
      text: "",
      source: CHAT_SOURCES.MANUAL,
      status: CHAT_STATUSES.STREAMING,
      createdAt: 2,
    });

    let state = initialChatState();
    state = chatReducer(state, { type: "chat/start", payload: { requestId, userMessage: user, assistantMessage: assistant } });
    state = chatReducer(state, { type: "chat/append_chunk", payload: { requestId, delta: "he" } });
    state = chatReducer(state, { type: "chat/append_chunk", payload: { requestId, delta: "llo" } });
    state = chatReducer(state, { type: "chat/finish", payload: { requestId, text: "hello" } });

    const a = state.messages.find((m) => m.id === "a1");
    expect(a.text).toBe("hello");
    expect(a.status).toBe(CHAT_STATUSES.DONE);
    expect(state.active).toBe(null);
  });

  it("should mark cancelled", () => {
    const requestId = "r2";
    const user = createChatMessage({ id: "u2", role: "user", text: "x", source: CHAT_SOURCES.AUTO, status: CHAT_STATUSES.DONE, createdAt: 1 });
    const assistant = createChatMessage({ id: "a2", role: "assistant", text: "", source: CHAT_SOURCES.AUTO, status: CHAT_STATUSES.STREAMING, createdAt: 2 });

    let state = initialChatState();
    state = chatReducer(state, { type: "chat/start", payload: { requestId, userMessage: user, assistantMessage: assistant } });
    state = chatReducer(state, { type: "chat/cancel", payload: { requestId } });

    const a = state.messages.find((m) => m.id === "a2");
    expect(a.status).toBe(CHAT_STATUSES.CANCELLED);
    expect(state.active).toBe(null);
  });
});

describe("shouldSkipAutoSend", () => {
  it("should skip when empty signature", () => {
    const out = shouldSkipAutoSend({ lastSig: "", lastAtMs: 0, nowMs: 1000, cooldownMs: 1000 }, "");
    expect(out).toBe(true);
  });

  it("should allow first send", () => {
    const out = shouldSkipAutoSend({ lastSig: "", lastAtMs: 0, nowMs: 1000, cooldownMs: 1000 }, "hello?");
    expect(out).toBe(false);
  });

  it("should dedupe same signature within cooldown", () => {
    const out = shouldSkipAutoSend({ lastSig: "hello?", lastAtMs: 1000, nowMs: 1500, cooldownMs: 1000 }, "  HELLO?  ");
    expect(out).toBe(true);
  });

  it("should allow same signature after cooldown", () => {
    const out = shouldSkipAutoSend({ lastSig: "hello?", lastAtMs: 1000, nowMs: 2500, cooldownMs: 1000 }, "hello?");
    expect(out).toBe(false);
  });
});

