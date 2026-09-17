import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  isRegistered: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
}));

const { pluginCombo } = await import("../src/services/hotkeyService.js");

describe("pluginCombo", () => {
  it("sends plain combos to RegisterHotKey", () => {
    expect(pluginCombo("Ctrl+Shift+KeyJ")).toBe("CmdOrCtrl+Shift+KeyJ");
    expect(pluginCombo("Alt+Space")).toBe("Alt+Space");
    expect(pluginCombo("Ctrl+Alt+F8")).toBe("CmdOrCtrl+Alt+F8");
  });

  it("keeps what RegisterHotKey cannot bind on the hooks", () => {
    expect(pluginCombo("ControlLeft")).toBeNull();
    expect(pluginCombo("Ctrl+MouseRight")).toBeNull();
    expect(pluginCombo("MouseX1")).toBeNull();
    expect(pluginCombo("Shift+ControlRight")).toBeNull();
    expect(pluginCombo("F8")).toBeNull();
    expect(pluginCombo("")).toBeNull();
  });
});
