mod audio;
mod groq;
mod soniox;
mod types;
mod tts_native;

use std::sync::Mutex;
use std::collections::HashMap;

use tauri::{AppHandle, PhysicalPosition, State};
use tauri::Manager;

use crate::types::AudioDevice;
use crate::soniox::SonioxTempKey;

#[derive(Default)]
struct ChatgptBridgeState {
    initialized: bool,
    last_prompt: Option<String>,
}

pub struct AppState {
    captures: Mutex<HashMap<String, audio::CaptureHandle>>,
    chatgpt_bridge: Mutex<ChatgptBridgeState>,
}

impl Default for AppState {
    // initialize app state with empty captures map
    fn default() -> Self {
        Self {
            captures: Mutex::new(HashMap::new()),
            chatgpt_bridge: Mutex::new(ChatgptBridgeState::default()),
        }
    }
}

fn build_chatgpt_prompt(me_input_language: &str, context: &str, conversation: &str) -> String {
    let template = r#"Bạn là một AI hỗ trợ trả lời câu hỏi. Hãy tuân thủ mạnh mẽ những điều sau:
    - giao tiếp bằng ngôn ngữ (ngôn ngữ input của ME)
    - trả lời câu hỏi cuối cùng (mới nhất từ dưới lên) của đoạn hội thoại phía dưới
    - dùng từ ngữ ngắn gọn, đúng trọng tâm, không lời lẽ thừa thãi
    - tìm kiếm internet khi cần thiết
    - nếu câu hỏi về code, nếu có thể hãy hiển thị code mẫu bằng python
    ví dụ về câu trả lời đầy đủ:
    Câu hỏi: 長所と短所を教えてください。
    Dịch: Hãy cho biết điểm mạnh và điểm yếu của bạn.
    Trả lời:
    Điểm mạnh: Có trách nhiệm, làm việc đến cùng, có kinh nghiệm làm leader dự án.
    Điểm yếu: Hơi quá cẩn thận, nhưng đang cải thiện bằng cách đặt ưu tiên và hành động nhanh hơn.
    context là: (context)
    đoạn hội thoại là: (đoạn hội thoại)"#;

    template
        .replace("(ngôn ngữ input của ME)", me_input_language.trim())
        .replace("(context)", context.trim())
        .replace("(đoạn hội thoại)", conversation.trim())
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
// toggle content protection (prevent screenshot) for main window
fn set_main_window_content_protected(app: AppHandle, enabled: bool) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    win.set_content_protected(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
// toggle content protection for chatgpt window
fn set_chatgpt_window_content_protected(_app: AppHandle, _enabled: bool) -> Result<(), String> {
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
fn chatgpt_init(state: State<AppState>) -> Result<(), String> {
    let mut guard = state
        .chatgpt_bridge
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    guard.initialized = true;
    Ok(())
}

#[tauri::command]
fn chatgpt_send_message(
    state: State<AppState>,
    me_input_language: String,
    context: String,
    conversation: String,
) -> Result<(), String> {
    let prompt = build_chatgpt_prompt(&me_input_language, &context, &conversation);
    let mut guard = state
        .chatgpt_bridge
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if !guard.initialized {
        guard.initialized = true;
    }
    guard.last_prompt = Some(prompt);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// setup and run the tauri application with window positioning and event handlers
pub fn run() {
    let _ = dotenvy::dotenv();
    tauri::Builder::default()
        .manage(AppState::default())
        .manage(tts_native::TtsState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let monitor = win.current_monitor()?.or_else(|| win.primary_monitor().ok().flatten());
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
            set_chatgpt_window_content_protected,
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

#[cfg(test)]
mod tests {
    use super::build_chatgpt_prompt;

    #[test]
    fn build_chatgpt_prompt_replaces_all_placeholders() {
        let out = build_chatgpt_prompt(" vi ", " weather ", " hello ");
        assert!(out.contains("giao tiếp bằng ngôn ngữ vi"));
        assert!(out.contains("context là: weather"));
        assert!(out.contains("đoạn hội thoại là: hello"));
        assert!(!out.contains("(context)"));
        assert!(!out.contains("(đoạn hội thoại)"));
    }
}
