use base64::{engine::general_purpose, Engine as _};
use futures_util::StreamExt;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha3::{Digest, Sha3_512};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const DEVICE_ID: &str = "sayvela-desktop";
const CHATGPT_API: &str = "https://chatgpt.com/backend-api";

#[derive(Default)]
pub struct ChatgptState {
    streams: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamEnvelope {
    pub request_id: String,
    pub event: String,
    pub data: Value,
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    #[serde(rename = "accessToken")]
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct RequirementsResponse {
    token: Option<String>,
    proofofwork: Option<ProofOfWork>,
}

#[derive(Debug, Deserialize)]
struct ProofOfWork {
    required: Option<bool>,
    seed: Option<String>,
    difficulty: Option<String>,
}

fn make_client(timeout_secs: u64) -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())
}

fn now_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64() * 1000.0)
        .unwrap_or(0.0)
}

fn pick<'a>(items: &'a [&'a str], seed: u128) -> &'a str {
    items[(seed as usize) % items.len()]
}

fn pick_u64(items: &[u64], seed: u128) -> u64 {
    items[(seed as usize) % items.len()]
}

fn pow_config(user_agent: &str) -> Vec<Value> {
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let perf_ms = Instant::now().elapsed().as_secs_f64() * 1000.0;
    let nav = [
        "webdriver−false",
        "hardwareConcurrency−32",
        "vendor−Google Inc.",
    ];
    let docs = ["location"];
    let wins = ["document", "navigator", "crypto", "performance"];
    vec![
        Value::from(pick_u64(&[3000, 4000], seed)),
        Value::from("Wed Jul 09 2026 14:00:00 GMT-0500 (Eastern Standard Time)"),
        Value::from(4294705152_u64),
        Value::from(0),
        Value::from(user_agent),
        Value::from("https://cdn.oaistatic.com/_next/static/chunks/webpack-abc.js?dpl=prod-4bda065f9289c86e8c6af9828bb28c19eb4ab3bc"),
        Value::from("prod-4bda065f9289c86e8c6af9828bb28c19eb4ab3bc"),
        Value::from("en-US"),
        Value::from("en-US,en"),
        Value::from(0),
        Value::from(pick(&nav, seed)),
        Value::from(pick(&docs, seed >> 2)),
        Value::from(pick(&wins, seed >> 4)),
        Value::from(perf_ms),
        Value::from(""),
        Value::from(""),
        Value::from(pick_u64(&[8, 16, 24, 32], seed >> 6)),
        Value::from(now_ms() - perf_ms),
    ]
}

fn compact_json(values: &[Value]) -> String {
    serde_json::to_string(values).unwrap_or_else(|_| "[]".to_string())
}

fn generate_answer(seed: &str, diff_hex: &str, config: &[Value], max_iterations: usize) -> String {
    let diff = hex_bytes(diff_hex);
    for i in 0..max_iterations {
        let mut cfg = config.to_vec();
        cfg[3] = Value::from(i as u64);
        cfg[9] = Value::from((i >> 1) as u64);
        let encoded = general_purpose::STANDARD.encode(compact_json(&cfg));
        let mut hasher = Sha3_512::new();
        hasher.update(seed.as_bytes());
        hasher.update(encoded.as_bytes());
        let hash = hasher.finalize();
        if hash.get(..diff.len()).unwrap_or(&[]) <= diff.as_slice() {
            return encoded;
        }
    }
    format!(
        "wQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D{}",
        general_purpose::STANDARD.encode(format!("\"{}\"", seed))
    )
}

fn hex_bytes(input: &str) -> Vec<u8> {
    (0..input.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(input.get(i..i + 2)?, 16).ok())
        .collect()
}

fn requirements_token(config: &[Value]) -> String {
    let seed = format!("{}", now_ms());
    format!(
        "gAAAAAC{}",
        generate_answer(&seed, "0fffff", config, 10_000)
    )
}

fn answer_token(seed: &str, diff_hex: &str, config: &[Value]) -> String {
    format!(
        "gAAAAAB{}",
        generate_answer(seed, diff_hex, config, 100_000)
    )
}

async fn fetch_access_token(
    client: &Client,
    api_url: &str,
    auth_token: &str,
) -> Result<String, String> {
    let base = api_url.trim_end_matches('/');
    let res = client
        .get(format!("{}/backend/chatgpt-token/access-token", base))
        .bearer_auth(auth_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "chatgpt token unavailable: {} {}",
            status,
            trim_error(&body)
        ));
    }
    let out: AccessTokenResponse = res.json().await.map_err(|e| e.to_string())?;
    let token = out.access_token.trim().to_string();
    if token.split('.').count() != 3 {
        return Err("chatgpt token invalid format".to_string());
    }
    Ok(token)
}

async fn fetch_requirements(
    client: &Client,
    access_token: &str,
) -> Result<(String, Option<String>), String> {
    let config = pow_config(USER_AGENT);
    let res = client
        .post(format!("{}/sentinel/chat-requirements", CHATGPT_API))
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("User-Agent", USER_AGENT)
        .header("oai-device-id", DEVICE_ID)
        .header("oai-language", "vi-VN")
        .header("Origin", "https://chatgpt.com")
        .header("Referer", "https://chatgpt.com/")
        .json(&serde_json::json!({ "p": requirements_token(&config) }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "chat requirements failed: {} {}",
            status,
            trim_error(&body)
        ));
    }
    let out: RequirementsResponse = res.json().await.map_err(|e| e.to_string())?;
    let chat_token = out
        .token
        .ok_or_else(|| "missing chat requirements token".to_string())?;
    let proof = out.proofofwork.and_then(|p| {
        if p.required.unwrap_or(false) {
            Some(answer_token(&p.seed?, &p.difficulty?, &config))
        } else {
            None
        }
    });
    Ok((chat_token, proof))
}

fn message_text(chunk: &Value) -> Option<String> {
    if chunk.get("message")?.get("author")?.get("role")?.as_str()? != "assistant" {
        return None;
    }
    chunk
        .get("message")?
        .get("content")?
        .get("parts")?
        .get(0)?
        .as_str()
        .map(|s| s.to_string())
}

fn message_metadata(chunk: &Value) -> Option<&Value> {
    if chunk.get("message")?.get("author")?.get("role")?.as_str()? != "assistant" {
        return None;
    }
    chunk.get("message")?.get("metadata")
}

fn metadata_array(metadata: Option<&Value>, key: &str) -> Value {
    metadata
        .and_then(|m| m.get(key))
        .and_then(|v| v.as_array())
        .map(|v| Value::Array(v.clone()))
        .unwrap_or_else(|| Value::Array(vec![]))
}

fn message_id(chunk: &Value) -> Option<String> {
    chunk
        .get("message")?
        .get("id")?
        .as_str()
        .map(|s| s.to_string())
}

fn conversation_id(chunk: &Value) -> Option<String> {
    chunk
        .get("conversation_id")?
        .as_str()
        .map(|s| s.to_string())
}

fn trim_error(body: &str) -> String {
    body.chars()
        .take(500)
        .collect::<String>()
        .replace('\n', " ")
}

async fn emit_failed(app: &AppHandle, request_id: String, error: String) {
    let _ = app.emit(
        "chatgpt_stream_event",
        StreamEnvelope {
            request_id,
            event: "failed".to_string(),
            data: serde_json::json!({ "error": error }),
        },
    );
}

fn base_payload(
    message: &str,
    conversation_id: Option<String>,
    parent_message_id: Option<String>,
    keep_conversation: bool,
) -> Value {
    let mut payload = serde_json::json!({
        "action": "next",
        "messages": [{
            "id": uuid_like(),
            "author": { "role": "user" },
            "content": { "content_type": "text", "parts": [message] }
        }],
        "parent_message_id": if keep_conversation { parent_message_id.unwrap_or_else(|| "client-created-root".to_string()) } else { "client-created-root".to_string() },
        "model": "auto",
        "history_and_training_disabled": !keep_conversation,
        "conversation_mode": { "kind": "primary_assistant" }
    });
    if keep_conversation {
        if let Some(id) = conversation_id.filter(|s| !s.trim().is_empty()) {
            payload["conversation_id"] = Value::from(id);
        }
    }
    payload
}

fn uuid_like() -> String {
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("00000000-0000-4000-8000-{:012x}", n & 0xffffffffffff)
}

async fn send_conversation(
    client: &Client,
    access_token: &str,
    message: &str,
    conversation_id: Option<String>,
    parent_message_id: Option<String>,
    keep_conversation: bool,
) -> Result<Response, String> {
    let (chat_token, proof_token) = fetch_requirements(client, access_token).await?;
    let mut req = client
        .post(format!("{}/f/conversation", CHATGPT_API))
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .header("Accept", "text/event-stream")
        .header("User-Agent", USER_AGENT)
        .header("oai-device-id", DEVICE_ID)
        .header("oai-language", "vi-VN")
        .header("Origin", "https://chatgpt.com")
        .header("Referer", "https://chatgpt.com/")
        .header("openai-sentinel-chat-requirements-token", chat_token)
        .json(&base_payload(
            message,
            conversation_id,
            parent_message_id,
            keep_conversation,
        ));
    if let Some(proof) = proof_token {
        req = req.header("openai-sentinel-proof-token", proof);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "conversation failed: {} {}",
            status,
            trim_error(&body)
        ));
    }
    Ok(res)
}

async fn stream_agent(
    app: AppHandle,
    request_id: String,
    message: String,
    conversation_id_in: Option<String>,
    parent_message_id: Option<String>,
    api_url: String,
    auth_token: String,
    keep_conversation: bool,
) {
    let client = match make_client(120) {
        Ok(c) => c,
        Err(e) => return emit_failed(&app, request_id, e).await,
    };
    let access_token = match fetch_access_token(&client, &api_url, &auth_token).await {
        Ok(t) => t,
        Err(e) => return emit_failed(&app, request_id, e).await,
    };
    let res = match send_conversation(
        &client,
        &access_token,
        &message,
        conversation_id_in,
        parent_message_id,
        keep_conversation,
    )
    .await
    {
        Ok(r) => r,
        Err(e) => return emit_failed(&app, request_id, e).await,
    };

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    let mut final_text = String::new();
    let mut conv_id = String::new();
    let mut last_msg_id = String::new();
    let mut content_references = Value::Array(vec![]);
    let mut citations = Value::Array(vec![]);
    let mut safe_urls = Value::Array(vec![]);
    while let Some(item) = stream.next().await {
        let bytes = match item {
            Ok(b) => b,
            Err(e) => return emit_failed(&app, request_id, e.to_string()).await,
        };
        buffer.push_str(&String::from_utf8_lossy(&bytes));
        while let Some(nl) = buffer.find('\n') {
            let line: String = buffer.drain(..=nl).collect();
            let line = line.trim();
            if !line.starts_with("data: ") || line == "data: [DONE]" {
                continue;
            }
            let Ok(chunk) = serde_json::from_str::<Value>(&line[6..]) else {
                continue;
            };
            if let Some(id) = conversation_id(&chunk) {
                conv_id = id;
            }
            if let Some(id) = message_id(&chunk) {
                last_msg_id = id;
            }
            if let Some(metadata) = message_metadata(&chunk) {
                let next_content_references = metadata_array(Some(metadata), "content_references");
                let next_citations = metadata_array(Some(metadata), "citations");
                let next_safe_urls = metadata_array(Some(metadata), "safe_urls");
                if next_content_references
                    .as_array()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false)
                {
                    content_references = next_content_references;
                }
                if next_citations
                    .as_array()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false)
                {
                    citations = next_citations;
                }
                if next_safe_urls
                    .as_array()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false)
                {
                    safe_urls = next_safe_urls;
                }
            }
            if let Some(text) = message_text(&chunk) {
                if text.len() > final_text.len() && text.starts_with(&final_text) {
                    let delta = text[final_text.len()..].to_string();
                    final_text = text;
                    let _ = app.emit(
                        "chatgpt_stream_event",
                        StreamEnvelope {
                            request_id: request_id.clone(),
                            event: "chunk".to_string(),
                            data: serde_json::json!({ "delta": delta }),
                        },
                    );
                } else {
                    final_text = text;
                }
            }
        }
    }
    let _ = app.emit(
        "chatgpt_stream_event",
        StreamEnvelope {
            request_id: request_id.clone(),
            event: "result".to_string(),
            data: serde_json::json!({
                "response": final_text,
                "conversation_id": conv_id,
                "message_id": last_msg_id,
                "content_references": content_references,
                "citations": citations,
                "safe_urls": safe_urls
            }),
        },
    );
    if let Ok(mut guard) = app.state::<ChatgptState>().streams.lock() {
        guard.remove(&request_id);
    }
}

#[tauri::command]
pub async fn chatgpt_start_stream(
    app: AppHandle,
    state: State<'_, ChatgptState>,
    request_id: String,
    message: String,
    conversation_id: Option<String>,
    parent_message_id: Option<String>,
    api_url: String,
    auth_token: String,
    keep_conversation: Option<bool>,
) -> Result<(), String> {
    let request_id = request_id.trim().to_string();
    if request_id.is_empty() || auth_token.trim().is_empty() {
        return Err("missing request_id or auth_token".to_string());
    }
    let mut guard = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if guard.contains_key(&request_id) {
        return Err("stream already running".to_string());
    }
    let rid = request_id.clone();
    let keep_conversation = keep_conversation.unwrap_or(false);
    let handle = tauri::async_runtime::spawn(async move {
        stream_agent(
            app,
            rid,
            message,
            conversation_id,
            parent_message_id,
            api_url,
            auth_token,
            keep_conversation,
        )
        .await;
    });
    guard.insert(request_id, handle);
    Ok(())
}

#[tauri::command]
pub fn chatgpt_cancel_stream(
    state: State<'_, ChatgptState>,
    request_id: String,
) -> Result<(), String> {
    let mut guard = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if let Some(h) = guard.remove(request_id.trim()) {
        h.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn chatgpt_hide_conversation(
    conversation_id: String,
    api_url: String,
    auth_token: String,
) -> Result<(), String> {
    let conversation_id = conversation_id.trim();
    if conversation_id.is_empty() || auth_token.trim().is_empty() {
        return Ok(());
    }
    let client = make_client(30)?;
    let access_token = fetch_access_token(&client, &api_url, &auth_token).await?;
    let res = client
        .patch(format!("{}/conversation/{}", CHATGPT_API, conversation_id))
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .header("Accept", "*/*")
        .header("User-Agent", USER_AGENT)
        .header("oai-device-id", DEVICE_ID)
        .header("oai-language", "vi-VN")
        .header("Origin", "https://chatgpt.com")
        .header(
            "Referer",
            format!("https://chatgpt.com/c/{}", conversation_id),
        )
        .header(
            "x-openai-target-path",
            format!("/backend-api/conversation/{}", conversation_id),
        )
        .header(
            "x-openai-target-route",
            "/backend-api/conversation/{conversation_id}",
        )
        .json(&serde_json::json!({ "is_visible": false }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "hide conversation failed: {} {}",
            status,
            trim_error(&body)
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn chatgpt_prepare_stop(
    conversation_id: String,
    parent_message_id: String,
    api_url: String,
    auth_token: String,
) -> Result<(), String> {
    let conversation_id = conversation_id.trim();
    let parent_message_id = parent_message_id.trim();
    if conversation_id.is_empty() || parent_message_id.is_empty() || auth_token.trim().is_empty() {
        return Ok(());
    }
    let client = make_client(30)?;
    let access_token = fetch_access_token(&client, &api_url, &auth_token).await?;
    let res = client
        .post(format!("{}/f/conversation/prepare", CHATGPT_API))
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .header("Accept", "*/*")
        .header("User-Agent", USER_AGENT)
        .header("oai-device-id", DEVICE_ID)
        .header("oai-language", "vi-VN")
        .header("Origin", "https://chatgpt.com")
        .header(
            "Referer",
            format!("https://chatgpt.com/c/{}", conversation_id),
        )
        .header(
            "x-openai-target-path",
            "/backend-api/f/conversation/prepare",
        )
        .header(
            "x-openai-target-route",
            "/backend-api/f/conversation/prepare",
        )
        .json(&serde_json::json!({
            "action": "next",
            "conversation_id": conversation_id,
            "parent_message_id": parent_message_id,
            "model": "auto",
            "client_prepare_state": "none",
            "client_prepare_dispatch": "immediate",
            "client_prepare_source": "context_change",
            "timezone_offset_min": -420,
            "timezone": "Asia/Saigon",
            "conversation_mode": { "kind": "primary_assistant" },
            "system_hints": [],
            "supports_buffering": true,
            "supported_encodings": ["v1"],
            "client_contextual_info": {
                "app_name": "chatgpt.com",
                "has_web_push_capabilities": true,
                "web_push_notification_permission": "default"
            }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "prepare stop failed: {} {}",
            status,
            trim_error(&body)
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requirements_token_has_prefix() {
        let token = requirements_token(&pow_config(USER_AGENT));
        assert!(token.starts_with("gAAAAAC"));
    }

    #[test]
    fn extracts_message_fields() {
        let v = serde_json::json!({
            "conversation_id": "c1",
            "message": { "id": "m1", "author": { "role": "assistant" }, "content": { "parts": ["hello"] } }
        });
        assert_eq!(conversation_id(&v).as_deref(), Some("c1"));
        assert_eq!(message_id(&v).as_deref(), Some("m1"));
        assert_eq!(message_text(&v).as_deref(), Some("hello"));
    }

    #[test]
    fn skips_user_message_text() {
        let v = serde_json::json!({
            "message": { "id": "m1", "author": { "role": "user" }, "content": { "parts": ["hello"] } }
        });
        assert_eq!(message_text(&v), None);
    }

    #[test]
    fn payload_without_conversation_disables_history() {
        let payload = base_payload(
            "hello",
            Some("c1".to_string()),
            Some("m1".to_string()),
            false,
        );
        assert_eq!(payload["history_and_training_disabled"], true);
        assert!(payload.get("conversation_id").is_none());
        assert_eq!(payload["parent_message_id"], "client-created-root");
    }

    #[test]
    fn payload_with_conversation_enables_history() {
        let payload = base_payload(
            "hello",
            Some("c1".to_string()),
            Some("m1".to_string()),
            true,
        );
        assert_eq!(payload["history_and_training_disabled"], false);
        assert_eq!(payload["conversation_id"], "c1");
        assert_eq!(payload["parent_message_id"], "m1");
    }
}
