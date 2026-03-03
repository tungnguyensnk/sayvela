mod audio;
mod soniox;
mod types;

use std::sync::Mutex;
use std::collections::HashMap;

use tauri::{AppHandle, State};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            soniox_get_temp_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
