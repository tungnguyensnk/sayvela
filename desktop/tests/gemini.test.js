import { describe, expect, it, vi } from "vitest";

describe("gemini provider", () => {
  it("streams through tauri", async () => {
    vi.resetModules();
    let handler;
    const invoke = vi.fn(async (command, args) => {
      if (command === "gemini_start_stream") {
        handler({ payload: { request_id: args.requestId, event: "chunk", data: { delta: "hi" } } });
        handler({ payload: { request_id: args.requestId, event: "result", data: { response: "hi" } } });
      }
    });
    vi.doMock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke }));
    vi.doMock("@tauri-apps/api/event", () => ({ listen: async (_, callback) => {
      handler = callback;
      return () => {};
    } }));
    const { sendStreamMessage } = await import("../src/providers/gemini.js");
    const events = [];
    await sendStreamMessage("hello", [], (event) => events.push(event), { requestId: "rid" });
    expect(invoke).toHaveBeenCalledWith("gemini_start_stream", { requestId: "rid", message: "hello" });
    expect(events).toHaveLength(2);
  });
});
