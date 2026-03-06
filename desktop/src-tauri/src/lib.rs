mod audio;
mod groq;
mod soniox;
mod types;
mod tts_native;

use std::sync::Mutex;
use std::collections::HashMap;

use tauri::{AppHandle, State};
use tauri::Manager;

use crate::types::AudioDevice;
use crate::soniox::SonioxTempKey;

pub struct AppState {
    captures: Mutex<HashMap<String, audio::CaptureHandle>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            captures: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    audio::list_audio_devices().map_err(|e| e.to_string())
}

#[tauri::command]
fn start_audio_capture(app: AppHandle, state: State<AppState>, device_id: String, kind: String) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (app, state, device_id, kind);
        return Err("only supported on windows".to_string());
    }

    #[cfg(windows)]
    {
        let mut guard = state.captures.lock().map_err(|_| "state poisoned".to_string())?;
        
        // Check if capture of this kind is already running
        if guard.contains_key(&kind) {
            return Err(format!("capture for {} already running", kind));
        }

        let handle = audio::start_audio_capture(app, device_id, kind.clone()).map_err(|e| e.to_string())?;
        guard.insert(kind, handle);
        Ok(())
    }
}

#[tauri::command]
fn stop_audio_capture(state: State<AppState>, kind: String) -> Result<(), String> {
    let handle = {
        let mut guard = state.captures.lock().map_err(|_| "state poisoned".to_string())?;
        guard.remove(&kind)
    };

    #[cfg(windows)]
    if let Some(h) = handle {
        h.stop();
    }
    Ok(())
}

#[tauri::command]
async fn soniox_get_temp_key() -> Result<SonioxTempKey, String> {
    soniox::get_temp_key().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn groq_check_question(content: String) -> Result<String, String> {
    groq::check_question(content).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn chatgpt_init(app: AppHandle) -> Result<(), String> {
    let win = app
        .get_webview_window("chatgpt-anon")
        .ok_or_else(|| "chatgpt window not found".to_string())?;

    let common = include_str!("chatgpt_inject_common.js");
    let init = include_str!("chatgpt_inject_init.js");
    let js = format!("{common}\n{init}", common = common, init = init);
    win.eval(&js).map_err(|e| e.to_string())
}

#[tauri::command]
fn chatgpt_send_message(app: AppHandle, text: String) -> Result<(), String> {
    let win = app
        .get_webview_window("chatgpt-anon")
        .ok_or_else(|| "chatgpt window not found".to_string())?;

    let text_js = serde_json::to_string(&text).map_err(|e| e.to_string())?;
    let common = include_str!("chatgpt_inject_common.js");
    let send = include_str!("chatgpt_inject_send.js").replace("__TEXT_JSON__", &text_js);
    let js = format!("{common}\n{send}", common = common, send = send);

    win.eval(&js).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();
    tauri::Builder::default()
        .manage(AppState::default())
        .manage(tts_native::TtsState::default())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(chat) = window.app_handle().get_webview_window("chatgpt-anon") {
                    let _ = chat.close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            soniox_get_temp_key,
            groq_check_question,
            chatgpt_init,
            chatgpt_send_message,
            tts_native::tts_list_voices,
            tts_native::tts_speak,
            tts_native::tts_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
