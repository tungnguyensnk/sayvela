import { describe, expect, it } from "vitest";
import { comboProblem, formatCombo } from "../src/components/AudioControlPanel/HotkeyDialog.jsx";

describe("comboProblem", () => {
  it("rejects a bare left or right click", () => {
    expect(comboProblem("MouseLeft")).not.toBe("");
    expect(comboProblem("MouseRight")).not.toBe("");
  });

  it("accepts clicks with a modifier and other buttons alone", () => {
    expect(comboProblem("Ctrl+MouseRight")).toBe("");
    expect(comboProblem("MouseMiddle")).toBe("");
    expect(comboProblem("ControlLeft")).toBe("");
  });
});

describe("formatCombo", () => {
  it("reads back in plain words", () => {
    expect(formatCombo("ControlLeft")).toBe("L Ctrl");
    expect(formatCombo("Ctrl+Shift+KeyJ")).toBe("Ctrl + Shift + J");
    expect(formatCombo("Ctrl+MouseX2")).toBe("Ctrl + Mouse 5");
  });
});
