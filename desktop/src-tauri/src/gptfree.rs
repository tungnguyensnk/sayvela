use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use reqwest::Client;
use tauri::{AppHandle, Emitter, Manager, State};

// build a shared http client with reasonable timeouts
fn make_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())
}

#[derive(Default)]
pub struct GptfreeState {
    token: Mutex<Option<CachedToken>>,
    streams: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
}

struct CachedToken {
    id_token: String,
    expires_at: Instant,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamEnvelope {
    pub request_id: String,
    pub event: String,
    pub data: Value,
}

#[derive(Debug, Deserialize)]
struct FirebaseSignUpResponse {
    #[serde(rename = "idToken")]
    id_token: String,
    #[serde(rename = "expiresIn")]
    expires_in: String,
}

fn find_first_between(haystack: &str, left: &str, right: &str) -> Option<String> {
    let start = haystack.find(left)? + left.len();
    let rest = &haystack[start..];
    let end = rest.find(right)?;
    Some(rest[..end].to_string())
}

fn extract_script_src_from_html(html: &str) -> Result<String, String> {
    let mid = find_first_between(html, r#"src="/assets/index-"#, r#".js""#)
        .ok_or_else(|| "could not find gptfree script".to_string())?;
    Ok(format!("/assets/index-{}.js", mid))
}

fn extract_api_key_from_script(script: &str) -> Result<String, String> {
    find_first_between(script, r#"apiKey:""#, r#"""#)
        .ok_or_else(|| "could not find firebase apiKey".to_string())
}

struct SseParser {
    current_event: String,
    buffer: String,
}

impl SseParser {
    fn new() -> Self {
        Self {
            current_event: String::new(),
            buffer: String::new(),
        }
    }

    fn push_str(&mut self, chunk: &str) -> Vec<(String, Value)> {
        self.buffer.push_str(chunk);
        let mut out = Vec::new();

        while let Some(nl) = self.buffer.find('\n') {
            let line: String = self.buffer.drain(..=nl).collect();
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Some(rest) = line.strip_prefix("event:") {
                self.current_event = rest.trim().to_string();
                continue;
            }

            if let Some(rest) = line.strip_prefix("data:") {
                let data_str = rest.trim();
                if data_str.is_empty() {
                    continue;
                }
                if let Ok(v) = serde_json::from_str::<Value>(data_str) {
                    out.push((self.current_event.clone(), v));
                }
            }
        }

        out
    }
}

async fn fetch_token(client: &Client) -> Result<(String, u64), String> {
    let html = client
        .get("https://gptfree.com/en")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let script_src = extract_script_src_from_html(&html)?;

    let script = client
        .get(format!("https://gptfree.com{}", script_src))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let api_key = extract_api_key_from_script(&script)?;

    let res = client
        .post(format!(
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={}",
            api_key
        ))
        .json(&serde_json::json!({ "returnSecureToken": true }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("firebase auth failed: {} {}", status, body));
    }

    let out: FirebaseSignUpResponse = res.json().await.map_err(|e| e.to_string())?;
    let expires_in = out.expires_in.parse::<u64>().unwrap_or(3600);
    Ok((out.id_token, expires_in))
}

async fn get_valid_token(state: &GptfreeState) -> Result<String, String> {
    let now = Instant::now();
    {
        let guard = state
            .token
            .lock()
            .map_err(|_| "state poisoned".to_string())?;
        if let Some(t) = guard.as_ref() {
            if t.expires_at > now + Duration::from_secs(300) {
                return Ok(t.id_token.clone());
            }
        }
    }

    let client = make_client()?;
    let (id_token, expires_in) = fetch_token(&client).await?;
    let lifetime = expires_in.min(1800);
    let cached = CachedToken {
        id_token: id_token.clone(),
        expires_at: Instant::now() + Duration::from_secs(lifetime),
    };
    let mut guard = state
        .token
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    *guard = Some(cached);
    Ok(id_token)
}

async fn stream_agent(app: AppHandle, request_id: String, message: String, history: Vec<Value>) {
    let state = app.state::<GptfreeState>();
    let token = match get_valid_token(&state).await {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit(
                "gptfree_stream_event",
                StreamEnvelope {
                    request_id,
                    event: "failed".to_string(),
                    data: serde_json::json!({ "error": e }),
                },
            );
            return;
        }
    };

    let client = match make_client() {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                "gptfree_stream_event",
                serde_json::json!({ "request_id": request_id, "type": "error", "data": e }),
            );
            return;
        }
    };
    let res = match client
        .post("https://us-central1-gptfree-2.cloudfunctions.net/agent_stream")
        .bearer_auth(token)
        .json(&serde_json::json!({
            "message": message,
            "images": [],
            "history": history
        }))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit(
                "gptfree_stream_event",
                StreamEnvelope {
                    request_id,
                    event: "failed".to_string(),
                    data: serde_json::json!({ "error": e.to_string() }),
                },
            );
            return;
        }
    };

    if !res.status().is_success() {
        let status = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        let _ = app.emit(
            "gptfree_stream_event",
            StreamEnvelope {
                request_id,
                event: "failed".to_string(),
                data: serde_json::json!({ "status": status, "body": body }),
            },
        );
        return;
    }

    let mut stream = res.bytes_stream();
    let mut parser = SseParser::new();

    use futures_util::StreamExt;
    while let Some(item) = stream.next().await {
        let chunk = match item {
            Ok(b) => b,
            Err(e) => {
                let _ = app.emit(
                    "gptfree_stream_event",
                    StreamEnvelope {
                        request_id: request_id.clone(),
                        event: "failed".to_string(),
                        data: serde_json::json!({ "error": e.to_string() }),
                    },
                );
                break;
            }
        };

        for (evt, v) in parser.push_str(&String::from_utf8_lossy(&chunk)) {
            let _ = app.emit(
                "gptfree_stream_event",
                StreamEnvelope {
                    request_id: request_id.clone(),
                    event: evt,
                    data: v,
                },
            );
        }
    }

    {
        let state = app.state::<GptfreeState>();
        let mut guard = match state.streams.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        guard.remove(&request_id);
    }
}

#[tauri::command]
pub async fn gptfree_start_stream(
    app: AppHandle,
    state: State<'_, GptfreeState>,
    request_id: String,
    message: String,
    history: Vec<Value>,
) -> Result<(), String> {
    let request_id = request_id.trim().to_string();
    if request_id.is_empty() {
        return Err("missing request_id".to_string());
    }

    let mut guard = state
        .streams
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if guard.contains_key(&request_id) {
        return Err("stream already running".to_string());
    }

    let app2 = app.clone();
    let rid2 = request_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        stream_agent(app2, rid2, message, history).await;
    });
    guard.insert(request_id, handle);
    Ok(())
}

#[tauri::command]
pub fn gptfree_cancel_stream(
    state: State<'_, GptfreeState>,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_script_src_from_html_ok() {
        let html = r#"<html><head></head><body><script type="module" crossorigin src="/assets/index-abc123.js"></script></body></html>"#;
        let out = extract_script_src_from_html(html).unwrap();
        assert_eq!(out, "/assets/index-abc123.js");
    }

    #[test]
    fn extract_api_key_from_script_ok() {
        let script = r#"const x={apiKey:"k-123",authDomain:"example"};"#;
        let out = extract_api_key_from_script(script).unwrap();
        assert_eq!(out, "k-123");
    }

    #[test]
    fn sse_parser_handles_chunk_boundaries() {
        let mut p = SseParser::new();
        let a = "event: chunk\ndata: {\"delta\":\"he\"}\n\nevent: result\ndata: {\"response\":\"he";
        let b = "llo\"}\n\n";

        let out1 = p.push_str(a);
        assert_eq!(out1.len(), 1);
        assert_eq!(out1[0].0, "chunk");
        assert_eq!(out1[0].1["delta"], "he");

        let out2 = p.push_str(b);
        assert_eq!(out2.len(), 1);
        assert_eq!(out2[0].0, "result");
        assert_eq!(out2[0].1["response"], "hello");
    }

    #[test]
    #[ignore = "network test — run with --include-ignored only"]
    fn fetch_token_smoke_network() {
        let client = make_client().expect("build client");
        let (token, expires_in) =
            tauri::async_runtime::block_on(fetch_token(&client)).expect("fetch_token should work");
        assert!(!token.is_empty());
        assert!(expires_in > 0);
    }
}
