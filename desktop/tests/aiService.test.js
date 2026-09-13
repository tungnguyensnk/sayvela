import { describe, it, expect, vi } from "vitest";

function setup(onStart) {
  vi.resetModules();
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  });
  localStorage.setItem("sayvela_auth", JSON.stringify({ token: "jwt" }));

  let handler = null;
  const invoke = vi.fn(async (cmd, args) => {
    if (cmd === "ai_start_stream") onStart(args.request, (payload) => handler?.({ payload }));
    return null;
  });
  const listen = vi.fn(async (_name, cb) => {
    handler = cb;
    return () => {
      handler = null;
    };
  });
  vi.doMock("@tauri-apps/api/core", () => ({ invoke }));
  vi.doMock("@tauri-apps/api/event", () => ({ listen }));
  return { invoke };
}

describe("aiService", () => {
  it("should stream via tauri bridge with full history", async () => {
    const { invoke } = setup((req, emit) => {
      emit({ request_id: req.requestId, event: "chunk", data: { delta: "hi" } });
      emit({ request_id: req.requestId, event: "result", data: { response: "hi" } });
    });
    const { sendMessage } = await import("../src/services/aiService.js");
    const messages = [{ role: "user", content: "hello" }];
    const events = [];
    const out = await sendMessage(messages, (p) => events.push(p), { requestId: "rid" });

    expect(invoke).toHaveBeenCalledWith("ai_start_stream", {
      request: { requestId: "rid", messages, apiUrl: "http://localhost:80/api", authToken: "jwt" },
    });
    expect(events).toEqual([
      { event: "chunk", data: { delta: "hi" } },
      { event: "result", data: { response: "hi" } },
    ]);
    expect(out).toEqual({ response: "hi" });
  });

  it("should reject when stream fails", async () => {
    setup((req, emit) => emit({ request_id: req.requestId, event: "failed", data: { error: "boom" } }));
    const { sendMessage } = await import("../src/services/aiService.js");
    await expect(sendMessage([{ role: "user", content: "x" }], () => {}, { requestId: "rid" })).rejects.toThrow("boom");
  });
});
