import { describe, expect, it } from "vitest";
import reducer, {
  applyToolCall,
  closeFrame,
  setStatus,
} from "../src/store/assistSlice.js";

const tool = (name, args, createdAt = 1) =>
  applyToolCall({ name, args, id: `${name}-${createdAt}`, createdAt });

function run(actions, state = undefined) {
  return actions.reduce((acc, action) => reducer(acc, action), state ?? reducer(undefined, { type: "@@init" }));
}

describe("assistSlice", () => {
  it("opens a frame in the first free slot and stacks newest first", () => {
    const state = run([
      tool("suggest_answer", { question: "q1" }, 1),
      tool("suggest_answer", { question: "q2" }, 2),
    ]);

    expect(state.slots).toEqual(["qa", null, null]);
    expect(state.frames.qa.items.map((i) => i.question)).toEqual(["q2", "q1"]);
    expect(state.frames.qa.updatedAt).toBe(2);
  });

  it("keeps all three kinds open at once", () => {
    const state = run([
      tool("suggest_answer", { question: "q" }, 1),
      tool("show_code", { title: "c" }, 2),
      tool("guide_steps", { goal: "g" }, 3),
    ]);

    expect(state.slots).toEqual(["qa", "code", "guide"]);
    expect(Object.keys(state.frames).sort()).toEqual(["code", "guide", "qa"]);
  });

  it("closes one frame by tool call and by user action", () => {
    let state = run([
      tool("suggest_answer", { question: "q" }, 1),
      tool("show_code", { title: "c" }, 2),
      tool("close_frame", { kind: "qa" }, 3),
    ]);
    expect(state.slots).toEqual([null, "code", null]);

    state = reducer(state, closeFrame("code"));
    expect(state.slots).toEqual([null, null, null]);
    expect(state.frames).toEqual({});
  });

  it("finish clears every frame and returns to watching", () => {
    const state = run([
      setStatus("assisting"),
      tool("show_code", { title: "c" }, 1),
      tool("finish", { reason: "done" }, 2),
    ]);

    expect(state.status).toBe("watching");
    expect(state.slots).toEqual([null, null, null]);
    expect(state.frames).toEqual({});
  });

  it("turning the loop off wipes the panels", () => {
    const state = run([tool("show_code", { title: "c" }, 1), setStatus("off")]);

    expect(state.status).toBe("off");
    expect(state.slots).toEqual([null, null, null]);
    expect(state.pending).toBe(false);
  });
});
