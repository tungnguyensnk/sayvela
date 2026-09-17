// global hotkey support for both keyboard and mouse. the tauri global-shortcut
// plugin covers neither bare modifiers nor mouse buttons, so windows low level
// hooks are used instead; other platforms simply accept and ignore the combo.

use serde::Serialize;
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Trigger {
    Key(u32),
    Mouse(MouseButton),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    X1,
    X2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Mods {
    ctrl: Option<Side>,
    alt: Option<Side>,
    shift: Option<Side>,
    meta: Option<Side>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Any,
    Left,
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Combo {
    mods: Mods,
    trigger: Trigger,
}

#[derive(Debug, Serialize, Clone)]
pub struct HotkeyEvent {
    pub combo: String,
}

pub static COMBO: Mutex<Option<Combo>> = Mutex::new(None);
pub static COMBO_TEXT: Mutex<String> = Mutex::new(String::new());

fn mouse_of(token: &str) -> Option<MouseButton> {
    match token {
        "MouseLeft" => Some(MouseButton::Left),
        "MouseRight" => Some(MouseButton::Right),
        "MouseMiddle" => Some(MouseButton::Middle),
        "MouseX1" => Some(MouseButton::X1),
        "MouseX2" => Some(MouseButton::X2),
        _ => None,
    }
}

// maps a browser KeyboardEvent.code to the windows virtual key it stands for
fn vk_of(code: &str) -> Option<u32> {
    let vk = match code {
        "ControlLeft" => 0xA2,
        "ControlRight" => 0xA3,
        "ShiftLeft" => 0xA0,
        "ShiftRight" => 0xA1,
        "AltLeft" => 0xA4,
        "AltRight" => 0xA5,
        "MetaLeft" => 0x5B,
        "MetaRight" => 0x5C,
        "Space" => 0x20,
        "Enter" => 0x0D,
        "Escape" => 0x1B,
        "Tab" => 0x09,
        "Backspace" => 0x08,
        "Delete" => 0x2E,
        "Insert" => 0x2D,
        "Home" => 0x24,
        "End" => 0x23,
        "PageUp" => 0x21,
        "PageDown" => 0x22,
        "ArrowLeft" => 0x25,
        "ArrowUp" => 0x26,
        "ArrowRight" => 0x27,
        "ArrowDown" => 0x28,
        "CapsLock" => 0x14,
        "Minus" => 0xBD,
        "Equal" => 0xBB,
        "BracketLeft" => 0xDB,
        "BracketRight" => 0xDD,
        "Backslash" => 0xDC,
        "Semicolon" => 0xBA,
        "Quote" => 0xDE,
        "Backquote" => 0xC0,
        "Comma" => 0xBC,
        "Period" => 0xBE,
        "Slash" => 0xBF,
        _ => {
            if let Some(letter) = code.strip_prefix("Key") {
                let byte = letter.as_bytes().first().copied()?;
                return Some(byte.to_ascii_uppercase() as u32);
            }
            if let Some(digit) = code.strip_prefix("Digit") {
                let byte = digit.as_bytes().first().copied()?;
                return Some(byte as u32);
            }
            if let Some(n) = code.strip_prefix('F') {
                let n: u32 = n.parse().ok()?;
                if (1..=24).contains(&n) {
                    return Some(0x70 + n - 1);
                }
            }
            if let Some(digit) = code.strip_prefix("Numpad") {
                let byte = digit.as_bytes().first().copied()?;
                if byte.is_ascii_digit() {
                    return Some(0x60 + (byte - b'0') as u32);
                }
            }
            return None;
        }
    };
    Some(vk)
}

// reverse of vk_of, used while the dialog is capturing a new combo
fn code_of(vk: u32) -> Option<String> {
    let named = match vk {
        0xA2 => "ControlLeft",
        0xA3 => "ControlRight",
        0xA0 => "ShiftLeft",
        0xA1 => "ShiftRight",
        0xA4 => "AltLeft",
        0xA5 => "AltRight",
        0x5B => "MetaLeft",
        0x5C => "MetaRight",
        0x20 => "Space",
        0x0D => "Enter",
        0x1B => "Escape",
        0x09 => "Tab",
        0x08 => "Backspace",
        0x2E => "Delete",
        0x2D => "Insert",
        0x24 => "Home",
        0x23 => "End",
        0x21 => "PageUp",
        0x22 => "PageDown",
        0x25 => "ArrowLeft",
        0x26 => "ArrowUp",
        0x27 => "ArrowRight",
        0x28 => "ArrowDown",
        0x14 => "CapsLock",
        0xBD => "Minus",
        0xBB => "Equal",
        0xDB => "BracketLeft",
        0xDD => "BracketRight",
        0xDC => "Backslash",
        0xBA => "Semicolon",
        0xDE => "Quote",
        0xC0 => "Backquote",
        0xBC => "Comma",
        0xBE => "Period",
        0xBF => "Slash",
        _ => {
            if (0x41..=0x5A).contains(&vk) {
                return Some(format!("Key{}", (vk as u8) as char));
            }
            if (0x30..=0x39).contains(&vk) {
                return Some(format!("Digit{}", (vk as u8) as char));
            }
            if (0x70..=0x87).contains(&vk) {
                return Some(format!("F{}", vk - 0x70 + 1));
            }
            if (0x60..=0x69).contains(&vk) {
                return Some(format!("Numpad{}", vk - 0x60));
            }
            return None;
        }
    };
    Some(named.to_string())
}

fn apply_modifier(mods: &mut Mods, token: &str) -> bool {
    let (slot, side) = match token {
        "Ctrl" | "CmdOrCtrl" | "Control" => (&mut mods.ctrl, Side::Any),
        "CtrlLeft" | "ControlLeft" => (&mut mods.ctrl, Side::Left),
        "CtrlRight" | "ControlRight" => (&mut mods.ctrl, Side::Right),
        "Alt" => (&mut mods.alt, Side::Any),
        "AltLeft" => (&mut mods.alt, Side::Left),
        "AltRight" => (&mut mods.alt, Side::Right),
        "Shift" => (&mut mods.shift, Side::Any),
        "ShiftLeft" => (&mut mods.shift, Side::Left),
        "ShiftRight" => (&mut mods.shift, Side::Right),
        "Win" | "Super" | "Meta" => (&mut mods.meta, Side::Any),
        "MetaLeft" | "WinLeft" => (&mut mods.meta, Side::Left),
        "MetaRight" | "WinRight" => (&mut mods.meta, Side::Right),
        _ => return false,
    };
    *slot = Some(side);
    true
}

// parses "CtrlLeft+Shift+KeyJ", "MouseX1" or a bare "ControlLeft"
pub fn parse_combo(text: &str) -> Result<Combo, String> {
    let tokens: Vec<&str> = text.split('+').map(|t| t.trim()).filter(|t| !t.is_empty()).collect();
    let (last, rest) = tokens.split_last().ok_or_else(|| "combo rỗng".to_string())?;

    let mut mods = Mods::default();
    for token in rest {
        if !apply_modifier(&mut mods, token) {
            return Err(format!("không hiểu phím bổ trợ: {}", token));
        }
    }

    if let Some(button) = mouse_of(last) {
        return Ok(Combo { mods, trigger: Trigger::Mouse(button) });
    }
    let vk = vk_of(last).ok_or_else(|| format!("không hiểu phím: {}", last))?;
    // a bare modifier is its own trigger, so it must not also be required held
    match *last {
        "ControlLeft" | "ControlRight" => mods.ctrl = None,
        "ShiftLeft" | "ShiftRight" => mods.shift = None,
        "AltLeft" | "AltRight" => mods.alt = None,
        "MetaLeft" | "MetaRight" => mods.meta = None,
        _ => {}
    }
    Ok(Combo { mods, trigger: Trigger::Key(vk) })
}

#[cfg(windows)]
mod imp {
    use super::*;
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use std::sync::mpsc::{sync_channel, SyncSender};
    use std::sync::OnceLock;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Emitter};
    use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage, HHOOK,
        KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT, WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN,
        WM_LBUTTONDOWN, WM_MBUTTONDOWN, WM_RBUTTONDOWN, WM_SYSKEYDOWN, WM_XBUTTONDOWN,
    };

    static APP: OnceLock<AppHandle> = OnceLock::new();
    // windows drops a low level hook that takes too long, and emitting to the
    // webview from inside the callback is exactly that; hand it to a thread
    static EVENTS: OnceLock<SyncSender<(&'static str, String)>> = OnceLock::new();
    static HOOKS_STARTED: AtomicBool = AtomicBool::new(false);
    pub static CAPTURING: AtomicBool = AtomicBool::new(false);
    static LAST_FIRED: Mutex<Option<Instant>> = Mutex::new(None);
    // the key currently held down, so auto repeat fires once and a modifier
    // held before the real key does not swallow it
    static HELD_VK: AtomicU32 = AtomicU32::new(0);
    // while capturing, key events are swallowed, so windows no longer reports
    // the modifier state; track it from the hook itself instead
    static CAPTURE_MODS: AtomicU32 = AtomicU32::new(0);

    fn modifier_bit(vk: u32) -> Option<u32> {
        match vk {
            0xA2 => Some(1 << 0),
            0xA3 => Some(1 << 1),
            0xA4 => Some(1 << 2),
            0xA5 => Some(1 << 3),
            0xA0 => Some(1 << 4),
            0xA1 => Some(1 << 5),
            0x5B => Some(1 << 6),
            0x5C => Some(1 << 7),
            _ => None,
        }
    }

    fn down(vk: u32) -> bool {
        unsafe { GetAsyncKeyState(vk as i32) as u16 & 0x8000 != 0 }
    }

    // checks that exactly the wanted modifiers are held, ignoring the trigger itself
    fn mods_match(mods: &Mods, trigger: Trigger) -> bool {
        let pairs = [
            (mods.ctrl, 0xA2u32, 0xA3u32),
            (mods.alt, 0xA4, 0xA5),
            (mods.shift, 0xA0, 0xA1),
            (mods.meta, 0x5B, 0x5C),
        ];
        for (want, left, right) in pairs {
            let trigger_is_left = trigger == Trigger::Key(left);
            let trigger_is_right = trigger == Trigger::Key(right);
            let left_down = down(left) && !trigger_is_left;
            let right_down = down(right) && !trigger_is_right;
            let ok = match want {
                None => !left_down && !right_down,
                Some(Side::Any) => left_down || right_down,
                Some(Side::Left) => left_down,
                Some(Side::Right) => right_down,
            };
            if !ok {
                return false;
            }
        }
        true
    }

    fn fire() {
        // auto repeat is already handled by HELD_VK; this only swallows a double
        // fire from one physical press, so keep it short enough to press twice
        let mut guard = match LAST_FIRED.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        if let Some(at) = *guard {
            if at.elapsed() < Duration::from_millis(200) {
                return;
            }
        }
        *guard = Some(Instant::now());
        drop(guard);
        let combo = COMBO_TEXT.lock().map(|t| t.clone()).unwrap_or_default();
        post("hotkey_pressed", combo);
    }

    // never blocks: a full queue means the app is already behind on presses
    fn post(event: &'static str, combo: String) {
        if let Some(tx) = EVENTS.get() {
            let _ = tx.try_send((event, combo));
        }
    }

    fn wanted() -> Option<Combo> {
        COMBO.lock().ok().and_then(|g| *g)
    }

    // the modifiers currently held, skipping the one the trigger itself is
    fn held_modifiers(skip_prefix: &str) -> Vec<String> {
        let mut parts = Vec::new();
        let mask = CAPTURE_MODS.load(Ordering::SeqCst);
        let groups = [
            ("Control", 0xA2u32, 0xA3u32, "Ctrl"),
            ("Alt", 0xA4, 0xA5, "Alt"),
            ("Shift", 0xA0, 0xA1, "Shift"),
            ("Meta", 0x5B, 0x5C, "Win"),
        ];
        for (prefix, left, right, label) in groups {
            if prefix == skip_prefix {
                continue;
            }
            let bits = modifier_bit(left).unwrap_or(0) | modifier_bit(right).unwrap_or(0);
            let held = mask & bits != 0 || down(left) || down(right);
            if held {
                parts.push(label.to_string());
            }
        }
        parts
    }

    fn emit_captured(trigger: String, skip_prefix: &str) {
        let mut parts = held_modifiers(skip_prefix);
        parts.push(trigger);
        post("hotkey_captured", parts.join("+"));
    }

    unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 {
            let is_down = wparam.0 as u32 == WM_KEYDOWN || wparam.0 as u32 == WM_SYSKEYDOWN;
            let vk = (*(lparam.0 as *const KBDLLHOOKSTRUCT)).vkCode;
            if CAPTURING.load(Ordering::SeqCst) {
                if let Some(bit) = modifier_bit(vk) {
                    if is_down {
                        CAPTURE_MODS.fetch_or(bit, Ordering::SeqCst);
                    } else {
                        CAPTURE_MODS.fetch_and(!bit, Ordering::SeqCst);
                    }
                }
                // escape stays usable so the dialog can be dismissed
                if is_down && vk != 0x1B {
                    if let Some(code) = code_of(vk) {
                        let skip = match vk {
                            0xA2 | 0xA3 => "Control",
                            0xA4 | 0xA5 => "Alt",
                            0xA0 | 0xA1 => "Shift",
                            0x5B | 0x5C => "Meta",
                            _ => "",
                        };
                        if HELD_VK.swap(vk, Ordering::SeqCst) != vk {
                            emit_captured(code, skip);
                        }
                    }
                    return LRESULT(1);
                }
                if !is_down {
                    let _ = HELD_VK.compare_exchange(vk, 0, Ordering::SeqCst, Ordering::SeqCst);
                }
                return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
            }
            if let Some(combo) = wanted() {
                if combo.trigger == Trigger::Key(vk) {
                    if is_down {
                        // windows repeats key down while held; only the first counts
                        if HELD_VK.swap(vk, Ordering::SeqCst) != vk && mods_match(&combo.mods, combo.trigger) {
                            fire();
                        }
                    } else {
                        let _ = HELD_VK.compare_exchange(vk, 0, Ordering::SeqCst, Ordering::SeqCst);
                    }
                }
            }
        }
        CallNextHookEx(HHOOK::default(), code, wparam, lparam)
    }

    unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 {
            let button = match wparam.0 as u32 {
                WM_LBUTTONDOWN => Some(MouseButton::Left),
                WM_RBUTTONDOWN => Some(MouseButton::Right),
                WM_MBUTTONDOWN => Some(MouseButton::Middle),
                WM_XBUTTONDOWN => {
                    let data = (*(lparam.0 as *const MSLLHOOKSTRUCT)).mouseData;
                    if (data >> 16) as u16 == 1 {
                        Some(MouseButton::X1)
                    } else {
                        Some(MouseButton::X2)
                    }
                }
                _ => None,
            };
            if CAPTURING.load(Ordering::SeqCst) {
                if let Some(button) = button {
                    let name = match button {
                        MouseButton::Left => "MouseLeft",
                        MouseButton::Right => "MouseRight",
                        MouseButton::Middle => "MouseMiddle",
                        MouseButton::X1 => "MouseX1",
                        MouseButton::X2 => "MouseX2",
                    };
                    let bare_click = matches!(button, MouseButton::Left | MouseButton::Right)
                        && held_modifiers("").is_empty();
                    // a plain click must still reach the dialog buttons
                    if !bare_click {
                        emit_captured(name.to_string(), "");
                        return LRESULT(1);
                    }
                }
                return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
            }
            if let (Some(button), Some(combo)) = (button, wanted()) {
                if combo.trigger == Trigger::Mouse(button) && mods_match(&combo.mods, combo.trigger) {
                    fire();
                }
            }
        }
        CallNextHookEx(HHOOK::default(), code, wparam, lparam)
    }

    pub fn set_capturing(enabled: bool) {
        CAPTURE_MODS.store(0, Ordering::SeqCst);
        HELD_VK.store(0, Ordering::SeqCst);
        CAPTURING.store(enabled, Ordering::SeqCst);
    }

    // installs both hooks on a dedicated thread with its own message pump
    pub fn ensure_hooks(app: &AppHandle) {
        let _ = APP.set(app.clone());
        if HOOKS_STARTED.swap(true, Ordering::SeqCst) {
            return;
        }
        let (tx, rx) = sync_channel::<(&'static str, String)>(32);
        let _ = EVENTS.set(tx);
        let emitter = app.clone();
        std::thread::spawn(move || {
            for (event, combo) in rx {
                let _ = emitter.emit(event, HotkeyEvent { combo });
            }
        });
        std::thread::spawn(|| unsafe {
            let keyboard = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), None, 0);
            let mouse = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0);
            if keyboard.is_err() || mouse.is_err() {
                log::warn!("[hotkey] could not install input hooks");
                return;
            }
            let mut message = MSG::default();
            while GetMessageW(&mut message, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        });
    }
}

#[cfg(not(windows))]
mod imp {
    use std::sync::atomic::AtomicBool;
    use tauri::AppHandle;
    pub static CAPTURING: AtomicBool = AtomicBool::new(false);
    pub fn set_capturing(_enabled: bool) {}
    pub fn ensure_hooks(_app: &AppHandle) {}
}

// registers the combo listened for globally; an empty combo clears it
#[tauri::command]
pub fn hotkey_set(app: tauri::AppHandle, combo: Option<String>) -> Result<(), String> {
    let text = combo.unwrap_or_default().trim().to_string();
    let parsed = if text.is_empty() {
        None
    } else {
        Some(parse_combo(&text)?)
    };
    *COMBO.lock().map_err(|_| "state poisoned".to_string())? = parsed;
    *COMBO_TEXT.lock().map_err(|_| "state poisoned".to_string())? = text;
    imp::ensure_hooks(&app);
    Ok(())
}

// while the dialog is open every key and button is reported instead of matched
#[tauri::command]
pub fn hotkey_capture(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    imp::ensure_hooks(&app);
    imp::set_capturing(enabled);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_key_combo() {
        let combo = parse_combo("CmdOrCtrl+Shift+KeyJ").unwrap();
        assert_eq!(combo.trigger, Trigger::Key(b'J' as u32));
        assert_eq!(combo.mods.ctrl, Some(Side::Any));
        assert_eq!(combo.mods.shift, Some(Side::Any));
        assert_eq!(combo.mods.alt, None);
    }

    #[test]
    fn parses_bare_modifier_without_requiring_itself() {
        let combo = parse_combo("ControlRight").unwrap();
        assert_eq!(combo.trigger, Trigger::Key(0xA3));
        assert_eq!(combo.mods.ctrl, None);
    }

    #[test]
    fn parses_mouse_combo() {
        let combo = parse_combo("CtrlLeft+MouseRight").unwrap();
        assert_eq!(combo.trigger, Trigger::Mouse(MouseButton::Right));
        assert_eq!(combo.mods.ctrl, Some(Side::Left));
    }

    #[test]
    fn rejects_unknown_tokens() {
        assert!(parse_combo("Ctrl+Banana").is_err());
        assert!(parse_combo("").is_err());
    }

    #[test]
    fn maps_function_and_digit_keys() {
        assert_eq!(parse_combo("F5").unwrap().trigger, Trigger::Key(0x74));
        assert_eq!(parse_combo("Digit1").unwrap().trigger, Trigger::Key(b'1' as u32));
    }
}
