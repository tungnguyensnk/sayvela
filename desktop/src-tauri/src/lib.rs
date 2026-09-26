mod ai;
mod api;
mod audio;
mod disguise;
mod passthrough;
mod hotkey;
mod screen;
mod secure_store;
mod soniox;
mod tts_native;
mod tts_soniox;
mod types;
mod vb_cable;
mod vcam;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State};

use crate::types::AudioDevice;

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
fn start_audio_capture(
    app: AppHandle,
    state: State<AppState>,
    device_id: String,
    kind: String,
) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (app, state, device_id, kind);
        return Err("only supported on windows".to_string());
    }

    #[cfg(windows)]
    {
        let mut guard = state
            .captures
            .lock()
            .map_err(|_| "state poisoned".to_string())?;

        // Check if capture of this kind is already running
        if guard.contains_key(&kind) {
            return Err(format!("capture for {} already running", kind));
        }

        let handle =
            audio::start_audio_capture(app, device_id, kind.clone()).map_err(|e| e.to_string())?;
        guard.insert(kind, handle);
        Ok(())
    }
}

#[tauri::command]
fn stop_audio_capture(state: State<AppState>, kind: String) -> Result<(), String> {
    let handle = {
        let mut guard = state
            .captures
            .lock()
            .map_err(|_| "state poisoned".to_string())?;
        guard.remove(&kind)
    };

    #[cfg(windows)]
    if let Some(h) = handle {
        h.stop();
    }
    Ok(())
}

#[tauri::command]
// toggle content protection (prevent screenshot) for main window
fn set_main_window_content_protected(app: AppHandle, enabled: bool) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    win.set_content_protected(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn auth_poll_pending_token(
    code: String,
    api_url: Option<String>,
) -> Result<Option<String>, String> {
    let base = api_url.unwrap_or_else(|| "http://localhost:80/api".to_string());
    let base = base.trim_end_matches('/');
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let url = format!("{}/backend/auth/pending-token/{}?t={}", base, code, ts);

    let res = reqwest::Client::new()
        .get(url)
        .header("Cache-Control", "no-cache")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(None);
    }

    let value: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let token = value
        .get("token")
        .and_then(|t| t.as_str())
        .filter(|t| !t.is_empty())
        .map(|t| t.to_string());
    Ok(token)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// setup and run the tauri application with window positioning and event handlers
pub fn run() {
    let _ = dotenvy::dotenv();
    let mut builder = tauri::Builder::default()
        .manage(AppState::default())
        .manage(ai::AiState::default())
        .manage(tts_native::TtsState::default())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                // keep the app's own traces, drop the chatter from the http and
                // websocket stacks that repeats every request
                .level_for("reqwest", log::LevelFilter::Warn)
                .level_for("hyper", log::LevelFilter::Warn)
                .level_for("hyper_util", log::LevelFilter::Warn)
                .level_for("tungstenite", log::LevelFilter::Warn)
                .level_for("tokio_tungstenite", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        // combos go through RegisterHotKey, which keeps working while an
        // elevated window holds focus; the input hooks cover what it cannot bind
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // when a second instance is launched, check if any arg is a deep link URL
            if let Some(url) = argv.iter().find(|a| a.starts_with("sayvela://")) {
                let url = url.clone();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.emit("deep-link-url", url);
                    let _ = win.set_focus();
                }
            }
        }))
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let monitor = win
                    .current_monitor()?
                    .or_else(|| win.primary_monitor().ok().flatten());
                if let Some(monitor) = monitor {
                    let work = monitor.work_area();
                    let win_size = win.outer_size()?;
                    let scale = monitor.scale_factor();
                    let x_offset = (30.0 * scale).round() as i32;
                    let y_offset = ((work.size.height as i32 - win_size.height as i32) / 2).max(0);
                    let x = work.position.x + x_offset;
                    let y = work.position.y + y_offset;
                    win.set_position(tauri::Position::Physical(PhysicalPosition::new(x, y)))?;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            set_main_window_content_protected,
            disguise::disguise_list,
            disguise::disguise_apply,
            passthrough::passthrough_arm,
            passthrough::passthrough_disarm,
            passthrough::passthrough_set,
            secure_store::soniox_set_api_key,
            secure_store::soniox_has_api_key,
            secure_store::soniox_delete_api_key,
            soniox::soniox_get_temp_key,
            soniox::soniox_list_voices,
            auth_poll_pending_token,
            ai::ai_start_stream,
            ai::ai_cancel_stream,
            ai::ai_gate,
            hotkey::hotkey_set,
            hotkey::hotkey_capture,
            screen::screen_list_monitors,
            screen::screen_capture,
            screen::screen_highlight,
            tts_native::tts_list_voices,
            tts_native::tts_start,
            tts_native::tts_speak,
            tts_native::tts_stop,
            vb_cable::install_vb_cable,
            vcam::vcam_list_devices,
            vcam::vcam_installed,
            vcam::vcam_install,
            vcam::vcam_start,
            vcam::vcam_stop,
            vcam::vcam_set_output,
            api::api_get_settings,
            api::api_update_settings,
            api::api_list_contexts,
            api::api_create_context,
            api::api_update_context,
            api::api_delete_context,
            api::api_get_entitlement,
            api::api_record_usage,
            api::api_create_session,
            api::api_finalize_session,
            api::api_list_sessions,
            api::api_get_session,
            api::api_delete_session,
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
