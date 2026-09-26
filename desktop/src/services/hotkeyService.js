import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isRegistered, register, unregister } from "@tauri-apps/plugin-global-shortcut";

const PLUGIN_MODIFIERS = { Ctrl: "CmdOrCtrl", Alt: "Alt", Shift: "Shift", Win: "Super" };

// RegisterHotKey keeps firing while an elevated window has focus, which the
// input hooks cannot do — but it only binds a modifier plus a real key, and it
// swallows that combo system wide. Everything else stays on the hooks.
export function pluginCombo(combo) {
  const parts = String(combo || "").split("+").filter(Boolean);
  const trigger = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  if (!trigger || !modifiers.length) return null;
  if (/^Mouse/.test(trigger)) return null;
  if (/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(trigger)) return null;
  const mapped = modifiers.map((m) => PLUGIN_MODIFIERS[m]);
  if (mapped.some((m) => !m)) return null;
  return [...mapped, trigger].join("+");
}

// while capturing, the hooks report every key and button instead of matching
export async function startHotkeyCapture(onCombo) {
  await invoke("hotkey_capture", { enabled: true });
  const unlisten = await listen("hotkey_captured", (e) => onCombo?.(e.payload?.combo || ""));
  return async () => {
    try {
      unlisten();
    } catch {}
    try {
      await invoke("hotkey_capture", { enabled: false });
    } catch {}
  };
}

async function registerViaPlugin(accelerator, { onPress, onRelease }) {
  if (await isRegistered(accelerator)) await unregister(accelerator);
  await register(accelerator, (event) => {
    if (!event || event.state === "Pressed") onPress?.();
    else if (event.state === "Released") onRelease?.();
  });
  return async () => {
    try {
      await unregister(accelerator);
    } catch {}
  };
}

// the hooks serve every slot at once, so each listener keeps to its own
async function registerViaHooks(slot, combo, { onPress, onRelease }) {
  await invoke("hotkey_set", { combo, slot });
  const offPress = await listen("hotkey_pressed", (e) => e.payload?.slot === slot && onPress?.());
  const offRelease = await listen("hotkey_released", (e) => e.payload?.slot === slot && onRelease?.());
  return async () => {
    try {
      offPress();
      offRelease();
    } catch {}
    try {
      await invoke("hotkey_set", { combo: "", slot });
    } catch {}
  };
}

// listens for the combo globally under a named slot; throws when it cannot be bound at all
export async function registerHotkey(slot, combo, handlers) {
  const key = String(combo || "").trim();
  if (!key) throw new Error("chưa đặt phím tắt");
  const accelerator = pluginCombo(key);
  if (accelerator) {
    try {
      return await registerViaPlugin(accelerator, handlers);
    } catch {
      // taken by another app or rejected: the hooks can still watch for it
    }
  }
  return registerViaHooks(slot, key, handlers);
}

export function registerAssistHotkey(combo, handler) {
  return registerHotkey("assist", combo, { onPress: handler });
}
