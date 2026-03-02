mod audio;
mod soniox;
mod types;

use std::sync::Mutex;

use tauri::{AppHandle, State};

use crate::types::AudioDevice;
use crate::soniox::SonioxTempKey;

pub struct AppState {
    capture: Mutex<Option<audio::CaptureHandle>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            capture: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn list_loopback_devices() -> Result<Vec<AudioDevice>, String> {
    audio::list_loopback_devices().map_err(|e| e.to_string())
}

#[tauri::command]
fn start_loopback_capture(app: AppHandle, state: State<AppState>, device_id: String) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (app, state, device_id);
        return Err("only supported on windows".to_string());
    }

    #[cfg(windows)]
    {
        let mut guard = state.capture.lock().map_err(|_| "state poisoned".to_string())?;
        if guard.is_some() {
            return Err("capture already running".to_string());
        }
        let handle = audio::start_loopback_capture(app, device_id).map_err(|e| e.to_string())?;
        *guard = Some(handle);
        Ok(())
    }
}

#[tauri::command]
fn stop_loopback_capture(state: State<AppState>) -> Result<(), String> {
    let handle = {
        let mut guard = state.capture.lock().map_err(|_| "state poisoned".to_string())?;
        guard.take()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_loopback_devices,
            start_loopback_capture,
            stop_loopback_capture,
            soniox_get_temp_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
