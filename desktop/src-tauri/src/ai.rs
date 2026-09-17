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
    #[serde(default = "default_path")]
    path: String,
    body: Value,
    api_url: String,
    auth_token: String,
}

fn default_path() -> String {
    "chat".to_string()
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

// parses one sse line into a json chunk, ignoring comments and the done marker
fn chunk_of(line: &str) -> Option<Value> {
    let json = line.strip_prefix("data:")?.trim();
    if json == "[DONE]" {
        return None;
    }
    serde_json::from_str::<Value>(json).ok()
}

// extracts the text delta from an openai-compatible chunk
fn delta_of(chunk: &Value) -> Option<String> {
    chunk
        .get("choices")?
        .get(0)?
        .get("delta")?
        .get("content")?
        .as_str()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

// posts to the backend proxy and forwards text deltas and assist tool events
async fn run_stream(
    app: &AppHandle,
    request_id: &str,
    path: &str,
    body: &Value,
    api_url: &str,
    auth_token: &str,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(format!(
            "{}/backend/ai/{}",
            api_url.trim_end_matches('/'),
            path
        ))
        .bearer_auth(auth_token)
        .json(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "ai {} failed: {} {}",
            path,
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
            let Some(chunk) = chunk_of(String::from_utf8_lossy(&line).trim()) else {
                continue;
            };
            match chunk.get("type").and_then(|t| t.as_str()) {
                // sayvela assist envelope
                Some("text") => {
                    if let Some(delta) = chunk.get("delta").and_then(|d| d.as_str()) {
                        text.push_str(delta);
                        emit(app, request_id, "chunk", json!({ "delta": delta }));
                    }
                }
                Some("tool") => emit(app, request_id, "tool", chunk.clone()),
                Some("error") => {
                    return Err(chunk
                        .get("error")
                        .and_then(|e| e.as_str())
                        .unwrap_or("assist failed")
                        .to_string())
                }
                // plain openai chat chunk
                _ => {
                    if let Some(delta) = delta_of(&chunk) {
                        text.push_str(&delta);
                        emit(app, request_id, "chunk", json!({ "delta": delta }));
                    }
                }
            }
        }
    }
    Ok(text)
}

async fn stream_chat(app: AppHandle, request: StartStreamRequest) {
    let StartStreamRequest {
        request_id,
        path,
        body,
        api_url,
        auth_token,
    } = request;
    match run_stream(&app, &request_id, &path, &body, &api_url, &auth_token).await {
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

// asks the backend gate whether the latest transcript needs assistance
#[tauri::command]
pub async fn ai_gate(api_url: String, token: String, body: Value) -> Result<Value, String> {
    crate::api::post_json(
        &format!("{}/backend/ai/gate", api_url.trim_end_matches('/')),
        &token,
        body,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_delta_content() {
        let chunk = chunk_of(r#"data: {"choices":[{"delta":{"content":"hi"}}]}"#).unwrap();
        assert_eq!(delta_of(&chunk).as_deref(), Some("hi"));
    }

    #[test]
    fn skips_done_and_empty_delta() {
        assert!(chunk_of("data: [DONE]").is_none());
        assert!(chunk_of(": keep-alive").is_none());
        let chunk = chunk_of(r#"data: {"choices":[{"delta":{"role":"assistant"}}]}"#).unwrap();
        assert_eq!(delta_of(&chunk), None);
    }

    #[test]
    fn reads_assist_envelope() {
        let chunk = chunk_of(r#"data: {"type":"tool","name":"show_code","args":{"title":"a"}}"#)
            .unwrap();
        assert_eq!(chunk["type"], "tool");
        assert_eq!(chunk["name"], "show_code");
    }
}
