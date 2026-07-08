mod audio;
mod api;
mod gptfree;
mod groq;
mod soniox;
mod tts_native;
mod types;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State};

use crate::soniox::SonioxTempKey;
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

fn build_prompt_impl(me_input_language: &str, context: &str, conversation: &str) -> String {
    let (question_label, translation_label, answer_label) = output_labels(me_input_language);
    let template = r#"Bạn là trợ lý AI trả lời câu hỏi dựa trên đoạn hội thoại được cung cấp.

Nguyên tắc bắt buộc:
- chỉ dùng ngôn ngữ: {meInputLanguage}
- chỉ trả lời câu hỏi mới nhất xuất hiện trong hội thoại (đọc từ dưới lên)
- nếu không có câu hỏi hoàn chỉnh, trả lời: "chưa thấy câu hỏi hoàn chỉnh"
- trả lời đúng trọng tâm câu hỏi
- không bịa thông tin; nếu cần tra cứu internet để chắc chắn, hãy nói rõ bạn cần tra cứu gì và vì sao
- nếu câu hỏi về code và phù hợp, đưa ví dụ code bằng Python (tối thiểu)

Output format phải tuân theo cấu trúc sau (phải dùng đúng tiêu đề mục như bên dưới):
- {questionLabel}: <trích nguyên văn câu hỏi cuối cùng>
- (tuỳ chọn) {translationLabel}: <nếu câu hỏi không phải {meInputLanguage}, dịch sang {meInputLanguage}>
- {answerLabel}: <ngắn gọn theo ý chính>

Context: {context}
Đoạn hội thoại (mới nhất ở dưới):
{conversation}"#;

    template
        .replace("{meInputLanguage}", me_input_language.trim())
        .replace("{questionLabel}", question_label)
        .replace("{translationLabel}", translation_label)
        .replace("{answerLabel}", answer_label)
        .replace("{context}", context.trim())
        .replace("{conversation}", conversation.trim())
}

fn output_labels(me_input_language: &str) -> (&'static str, &'static str, &'static str) {
    match normalize_lang_code(me_input_language).as_str() {
        "vi" => ("Câu hỏi", "Dịch", "Trả lời"),
        "en" => ("Question", "Translation", "Answer"),
        "fr" => ("Question", "Traduction", "Réponse"),
        "de" => ("Frage", "Übersetzung", "Antwort"),
        "es" => ("Pregunta", "Traducción", "Respuesta"),
        "it" => ("Domanda", "Traduzione", "Risposta"),
        "pt" => ("Pergunta", "Tradução", "Resposta"),
        "ru" => ("Вопрос", "Перевод", "Ответ"),
        "ja" => ("質問", "翻訳", "回答"),
        "ko" => ("질문", "번역", "답변"),
        "zh" => ("问题", "翻译", "回答"),
        _ => ("Question", "Translation", "Answer"),
    }
}

fn normalize_lang_code(me_input_language: &str) -> String {
    let raw = me_input_language.trim().to_lowercase();
    let first = raw
        .split(|c: char| c == '-' || c == '_' || c.is_whitespace())
        .next()
        .unwrap_or("");

    match first {
        "vi" | "vn" => return "vi".to_string(),
        "en" => return "en".to_string(),
        "fr" => return "fr".to_string(),
        "de" => return "de".to_string(),
        "es" => return "es".to_string(),
        "it" => return "it".to_string(),
        "pt" => return "pt".to_string(),
        "ru" => return "ru".to_string(),
        "ja" | "jp" => return "ja".to_string(),
        "ko" | "kr" => return "ko".to_string(),
        "zh" => return "zh".to_string(),
        _ => {}
    }

    if first.starts_with("viet") {
        return "vi".to_string();
    }
    if first.starts_with("eng") {
        return "en".to_string();
    }
    if first.starts_with("french") || first.starts_with("fran") {
        return "fr".to_string();
    }
    if first.starts_with("german") || first.starts_with("deut") {
        return "de".to_string();
    }
    if first.starts_with("span") {
        return "es".to_string();
    }
    if first.starts_with("ital") {
        return "it".to_string();
    }
    if first.starts_with("portug") {
        return "pt".to_string();
    }
    if first.starts_with("russ") {
        return "ru".to_string();
    }
    if first.starts_with("japan") {
        return "ja".to_string();
    }
    if first.starts_with("korea") {
        return "ko".to_string();
    }
    if first.starts_with("chin") {
        return "zh".to_string();
    }

    first.chars().take(2).collect()
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
async fn soniox_get_temp_key() -> Result<SonioxTempKey, String> {
    soniox::get_temp_key().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn groq_check_question(content: String) -> Result<String, String> {
    groq::check_question(content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn build_prompt(me_input_language: String, context: String, conversation: String) -> String {
    build_prompt_impl(&me_input_language, &context, &conversation)
}

#[tauri::command]
async fn auth_poll_pending_token(code: String, api_url: Option<String>) -> Result<Option<String>, String> {
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

// opens a native save-file dialog and writes content to the chosen path; returns the path or null
#[tauri::command]
fn save_file_dialog(default_name: String, content: String) -> Result<Option<String>, String> {
    let path = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .save_file();
    if let Some(p) = path {
        std::fs::write(&p, content.as_bytes()).map_err(|e| e.to_string())?;
        Ok(Some(p.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// setup and run the tauri application with window positioning and event handlers
pub fn run() {
    let _ = dotenvy::dotenv();
    tauri::Builder::default()
        .manage(AppState::default())
        .manage(gptfree::GptfreeState::default())
        .manage(tts_native::TtsState::default())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
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
            soniox_get_temp_key,
            groq_check_question,
            build_prompt,
            auth_poll_pending_token,
            gptfree::gptfree_start_stream,
            gptfree::gptfree_cancel_stream,
            tts_native::tts_list_voices,
            tts_native::tts_speak,
            tts_native::tts_stop,
            save_file_dialog,
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
            api::api_upload_segments,
            api::api_list_sessions,
            api::api_delete_session,
            api::api_get_me,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::build_prompt_impl;
    use super::output_labels;

    #[test]
    fn build_prompt_replaces_all_placeholders() {
        let out = build_prompt_impl(" vi ", " weather ", " hello ");
        assert!(out.contains("chỉ dùng ngôn ngữ: vi"));
        assert!(out.contains("Context: weather"));
        assert!(out.contains("hello"));
        assert!(out.contains("- Câu hỏi:"));
        assert!(out.contains("(tuỳ chọn) Dịch:"));
        assert!(out.contains("- Trả lời:"));
        assert!(!out.contains("{meInputLanguage}"));
        assert!(!out.contains("{questionLabel}"));
        assert!(!out.contains("{translationLabel}"));
        assert!(!out.contains("{answerLabel}"));
        assert!(!out.contains("{context}"));
        assert!(!out.contains("{conversation}"));
    }

    #[test]
    fn output_labels_support_common_languages() {
        assert_eq!(output_labels("en"), ("Question", "Translation", "Answer"));
        assert_eq!(
            output_labels("en-US"),
            ("Question", "Translation", "Answer")
        );
        assert_eq!(output_labels("vi"), ("Câu hỏi", "Dịch", "Trả lời"));
        assert_eq!(output_labels("ja-JP"), ("質問", "翻訳", "回答"));
        assert_eq!(output_labels("Korean"), ("질문", "번역", "답변"));
    }
}
