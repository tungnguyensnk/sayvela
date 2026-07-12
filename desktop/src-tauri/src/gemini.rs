use futures_util::StreamExt;
use reqwest::Client;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

const GEMINI_BL: &str = "boq_assistant-bard-web-server_20260525.09_p0";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

#[derive(Default)]
pub struct GeminiState {
    streams: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
}

#[derive(Clone, Serialize)]
struct StreamEnvelope {
    request_id: String,
    event: String,
    data: Value,
}

fn build_payload(prompt: &str) -> String {
    let mut inner = vec![Value::Null; 102];
    inner[0] = json!([prompt, 0, null, null, null, null, 0]);
    inner[1] = json!(["en"]);
    inner[2] = json!(["", "", "", null, null, null, null, null, null, ""]);
    inner[6] = json!([0]);
    inner[7] = json!(1);
    inner[10] = json!(1);
    inner[11] = json!(0);
    inner[17] = json!([[4]]);
    inner[18] = json!(0);
    inner[27] = json!(1);
    inner[30] = json!([4]);
    inner[41] = json!([2]);
    inner[53] = json!(0);
    inner[59] = json!(format!("{}", now_millis()));
    inner[61] = json!([]);
    inner[68] = json!(1);
    inner[79] = json!(1);
    serde_json::to_string(&json!([
        null,
        serde_json::to_string(&inner).unwrap_or_default()
    ]))
    .unwrap_or_default()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn extract_message(line: &str) -> Option<String> {
    if !line.contains("\"wrb.fr\"") {
        return None;
    }
    let outer: Value = serde_json::from_str(line).ok()?;
    let encoded = outer.get(0)?.get(2)?.as_str()?;
    let payload: Value = serde_json::from_str(encoded).ok()?;
    payload
        .get(4)?
        .as_array()?
        .iter()
        .filter_map(|part| part.get(1)?.as_array())
        .flatten()
        .filter_map(Value::as_str)
        .max_by_key(|text| text.len())
        .map(str::to_string)
}

async fn stream(app: AppHandle, request_id: String, message: String) -> Result<(), String> {
    let reqid = now_millis() % 1_000_000;
    let url = format!("https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl={GEMINI_BL}&hl=en&_reqid={reqid}&rt=c");
    let response = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?
        .post(url)
        .header("Origin", "https://gemini.google.com")
        .header("Referer", "https://gemini.google.com/app")
        .header("X-Same-Domain", "1")
        .header("User-Agent", USER_AGENT)
        .form(&[("f.req", build_payload(&message))])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("gemini request failed: {}", response.status()));
    }
    let mut bytes = response.bytes_stream();
    let mut buffer = String::new();
    let mut previous = String::new();
    while let Some(chunk) = bytes.next().await {
        buffer.push_str(&String::from_utf8_lossy(&chunk.map_err(|e| e.to_string())?));
        while let Some(index) = buffer.find('\n') {
            let line = buffer[..index].trim().to_string();
            buffer.drain(..=index);
            if let Some(text) = extract_message(&line) {
                if text.len() > previous.len() {
                    let delta = text[previous.len()..].to_string();
                    previous = text;
                    let _ = app.emit(
                        "gemini_stream_event",
                        StreamEnvelope {
                            request_id: request_id.clone(),
                            event: "chunk".into(),
                            data: json!({ "delta": delta }),
                        },
                    );
                }
            }
        }
    }
    if previous.is_empty() {
        return Err("no Gemini message found".into());
    }
    let _ = app.emit(
        "gemini_stream_event",
        StreamEnvelope {
            request_id,
            event: "result".into(),
            data: json!({ "response": previous }),
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn gemini_start_stream(
    app: AppHandle,
    state: State<'_, GeminiState>,
    request_id: String,
    message: String,
) -> Result<(), String> {
    if message.trim().is_empty() || request_id.trim().is_empty() {
        return Err("message and request id are required".into());
    }
    let event_app = app.clone();
    let event_id = request_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        if let Err(error) = stream(app, event_id.clone(), message).await {
            let _ = event_app.emit(
                "gemini_stream_event",
                StreamEnvelope {
                    request_id: event_id,
                    event: "failed".into(),
                    data: json!({ "error": error }),
                },
            );
        }
    });
    state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?
        .insert(request_id, handle);
    Ok(())
}

#[tauri::command]
pub fn gemini_cancel_stream(
    state: State<'_, GeminiState>,
    request_id: String,
) -> Result<(), String> {
    if let Some(handle) = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?
        .remove(&request_id)
    {
        handle.abort();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_longest_message() {
        let payload = json!([
            null,
            null,
            null,
            null,
            [[null, ["short", "complete answer"]]]
        ]);
        let line = serde_json::to_string(&json!([["wrb.fr", null, payload.to_string()]])).unwrap();
        assert_eq!(extract_message(&line).as_deref(), Some("complete answer"));
    }
}
