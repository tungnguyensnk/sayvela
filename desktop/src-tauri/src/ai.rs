use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct AiState {
    streams: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartStreamRequest {
    request_id: String,
    messages: Vec<Value>,
    api_url: String,
    auth_token: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamEnvelope {
    pub request_id: String,
    pub event: String,
    pub data: Value,
}

fn emit(app: &AppHandle, request_id: &str, event: &str, data: Value) {
    let _ = app.emit(
        "ai_stream_event",
        StreamEnvelope {
            request_id: request_id.to_string(),
            event: event.to_string(),
            data,
        },
    );
}

// extracts the text delta from one openai-compatible sse line
fn delta_of(line: &str) -> Option<String> {
    let json = line.strip_prefix("data:")?.trim();
    if json == "[DONE]" {
        return None;
    }
    let chunk: Value = serde_json::from_str(json).ok()?;
    chunk
        .get("choices")?
        .get(0)?
        .get("delta")?
        .get("content")?
        .as_str()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

// posts the chat history to the backend proxy and forwards sse deltas as events
async fn run_stream(
    app: &AppHandle,
    request_id: &str,
    messages: Vec<Value>,
    api_url: &str,
    auth_token: &str,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(format!("{}/backend/ai/chat", api_url.trim_end_matches('/')))
        .bearer_auth(auth_token)
        .json(&json!({ "messages": messages }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "ai chat failed: {} {}",
            status,
            body.chars().take(500).collect::<String>().replace('\n', " ")
        ));
    }
    let mut stream = res.bytes_stream();
    let mut buffer: Vec<u8> = Vec::new();
    let mut text = String::new();
    while let Some(item) = stream.next().await {
        buffer.extend_from_slice(&item.map_err(|e| e.to_string())?);
        // split on newline bytes so multi-byte utf-8 is never cut mid-char
        while let Some(nl) = buffer.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = buffer.drain(..=nl).collect();
            if let Some(delta) = delta_of(String::from_utf8_lossy(&line).trim()) {
                text.push_str(&delta);
                emit(app, request_id, "chunk", json!({ "delta": delta }));
            }
        }
    }
    Ok(text)
}

async fn stream_chat(app: AppHandle, request: StartStreamRequest) {
    let StartStreamRequest {
        request_id,
        messages,
        api_url,
        auth_token,
    } = request;
    match run_stream(&app, &request_id, messages, &api_url, &auth_token).await {
        Ok(text) => emit(&app, &request_id, "result", json!({ "response": text })),
        Err(e) => emit(&app, &request_id, "failed", json!({ "error": e })),
    }
    if let Ok(mut guard) = app.state::<AiState>().streams.lock() {
        guard.remove(&request_id);
    }
}

#[tauri::command]
pub async fn ai_start_stream(
    app: AppHandle,
    state: State<'_, AiState>,
    mut request: StartStreamRequest,
) -> Result<(), String> {
    request.request_id = request.request_id.trim().to_string();
    if request.request_id.is_empty() || request.auth_token.trim().is_empty() {
        return Err("missing request_id or auth_token".to_string());
    }
    let mut guard = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if guard.contains_key(&request.request_id) {
        return Err("stream already running".to_string());
    }
    let request_id = request.request_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        stream_chat(app, request).await;
    });
    guard.insert(request_id, handle);
    Ok(())
}

#[tauri::command]
pub fn ai_cancel_stream(state: State<'_, AiState>, request_id: String) -> Result<(), String> {
    let mut guard = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if let Some(h) = guard.remove(request_id.trim()) {
        h.abort();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_delta_content() {
        let line = r#"data: {"choices":[{"delta":{"content":"hi"}}]}"#;
        assert_eq!(delta_of(line).as_deref(), Some("hi"));
    }

    #[test]
    fn skips_done_and_empty_delta() {
        assert_eq!(delta_of("data: [DONE]"), None);
        assert_eq!(delta_of(r#"data: {"choices":[{"delta":{"role":"assistant"}}]}"#), None);
        assert_eq!(delta_of(": keep-alive"), None);
    }
}
