use log::{debug, warn};
use serde_json::Value;

// issues a GET request with bearer auth; returns parsed json value or error string
async fn get(url: &str, token: &str) -> Result<Value, String> {
    debug!("[api] GET {}", url);
    let res = reqwest::Client::new()
        .get(url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        warn!("[api] GET {} → {} {}", url, status.as_u16(), text);
        return Err(format!("http {} — {}", status.as_u16(), text));
    }
    debug!("[api] GET {} → {}", url, status.as_u16());
    res.json::<Value>().await.map_err(|e| e.to_string())
}

// issues a PUT/POST/PATCH request with json body and bearer auth
async fn request_with_body(
    method: &str,
    url: &str,
    token: &str,
    body: Value,
) -> Result<Value, String> {
    debug!("[api] {} {} body={}", method, url, body);
    let builder = match method {
        "POST" => reqwest::Client::new().post(url),
        "PUT" => reqwest::Client::new().put(url),
        "PATCH" => reqwest::Client::new().patch(url),
        _ => return Err(format!("unsupported method: {}", method)),
    };

    let res = builder
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        warn!("[api] {} {} → {} {}", method, url, status.as_u16(), text);
        return Err(format!("http {} — {}", status.as_u16(), text));
    }
    debug!("[api] {} {} → {}", method, url, status.as_u16());

    // 204 no content — return empty object
    if status.as_u16() == 204 {
        return Ok(Value::Object(Default::default()));
    }
    res.json::<Value>().await.map_err(|e| e.to_string())
}

// issues a DELETE request with bearer auth
async fn delete(url: &str, token: &str) -> Result<(), String> {
    debug!("[api] DELETE {}", url);
    let res = reqwest::Client::new()
        .delete(url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() && status.as_u16() != 204 {
        let text = res.text().await.unwrap_or_default();
        warn!("[api] DELETE {} → {} {}", url, status.as_u16(), text);
        return Err(format!("http {} — {}", status.as_u16(), text));
    }
    debug!("[api] DELETE {} → {}", url, status.as_u16());
    Ok(())
}

// ── settings ─────────────────────────────────────────────────────────────────

// fetches current user settings from backend; returns settingsJson object
#[tauri::command]
pub async fn api_get_settings(api_url: String, token: String) -> Result<Value, String> {
    let url = format!("{}/backend/settings/me", api_url.trim_end_matches('/'));
    get(&url, &token).await
}

// replaces current user settings on backend; returns updated row
#[tauri::command]
pub async fn api_update_settings(
    api_url: String,
    token: String,
    settings_json: Value,
) -> Result<Value, String> {
    let url = format!("{}/backend/settings/me", api_url.trim_end_matches('/'));
    request_with_body("PUT", &url, &token, serde_json::json!({ "settingsJson": settings_json })).await
}

// ── contexts ──────────────────────────────────────────────────────────────────

// returns all contexts owned by the authenticated user
#[tauri::command]
pub async fn api_list_contexts(api_url: String, token: String) -> Result<Value, String> {
    let url = format!("{}/backend/contexts", api_url.trim_end_matches('/'));
    get(&url, &token).await
}

// creates a new soniox context; payload: { name, description?, contextJson }
#[tauri::command]
pub async fn api_create_context(
    api_url: String,
    token: String,
    payload: Value,
) -> Result<Value, String> {
    let url = format!("{}/backend/contexts", api_url.trim_end_matches('/'));
    request_with_body("POST", &url, &token, payload).await
}

// updates an existing context by id
#[tauri::command]
pub async fn api_update_context(
    api_url: String,
    token: String,
    id: String,
    payload: Value,
) -> Result<Value, String> {
    let url = format!("{}/backend/contexts/{}", api_url.trim_end_matches('/'), id);
    request_with_body("PUT", &url, &token, payload).await
}

// deletes a context by id; returns nothing on success
#[tauri::command]
pub async fn api_delete_context(
    api_url: String,
    token: String,
    id: String,
) -> Result<(), String> {
    let url = format!("{}/backend/contexts/{}", api_url.trim_end_matches('/'), id);
    delete(&url, &token).await
}

// ── billing ───────────────────────────────────────────────────────────────────

// fetches current entitlement (quota) for the authenticated user
#[tauri::command]
pub async fn api_get_entitlement(api_url: String, token: String) -> Result<Value, String> {
    let url = format!("{}/backend/billing/entitlement", api_url.trim_end_matches('/'));
    get(&url, &token).await
}

// records minutes used after a session ends
#[tauri::command]
pub async fn api_record_usage(
    api_url: String,
    token: String,
    minutes: u32,
) -> Result<(), String> {
    let url = format!("{}/backend/billing/usage", api_url.trim_end_matches('/'));
    request_with_body("POST", &url, &token, serde_json::json!({ "minutes": minutes }))
        .await
        .map(|_| ())
}

// ── sessions ──────────────────────────────────────────────────────────────────

// creates a new transcript session; returns created session id
#[tauri::command]
pub async fn api_create_session(
    api_url: String,
    token: String,
    title: Option<String>,
    language: String,
) -> Result<Value, String> {
    let url = format!("{}/backend/sessions", api_url.trim_end_matches('/'));
    request_with_body(
        "POST",
        &url,
        &token,
        serde_json::json!({ "title": title, "language": language }),
    )
    .await
}

// updates session metadata after it finishes (duration, status, title)
#[tauri::command]
pub async fn api_finalize_session(
    api_url: String,
    token: String,
    session_id: String,
    duration_seconds: u32,
    status: String,
    title: Option<String>,
) -> Result<(), String> {
    let url = format!("{}/backend/sessions/{}", api_url.trim_end_matches('/'), session_id);
    request_with_body(
        "PUT",
        &url,
        &token,
        serde_json::json!({ "durationSeconds": duration_seconds, "status": status, "title": title }),
    )
    .await
    .map(|_| ())
}

// bulk-uploads transcript segments for a session
#[tauri::command]
pub async fn api_upload_segments(
    api_url: String,
    token: String,
    session_id: String,
    segments: Value,
) -> Result<(), String> {
    let url = format!(
        "{}/backend/sessions/{}/segments",
        api_url.trim_end_matches('/'),
        session_id
    );
    request_with_body("POST", &url, &token, serde_json::json!({ "segments": segments }))
        .await
        .map(|_| ())
}

// ── sessions list / delete ──────────────────────────────────────────────────

// returns all sessions owned by the authenticated user
#[tauri::command]
pub async fn api_list_sessions(
    api_url: String,
    token: String,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<Value, String> {
    let p = page.unwrap_or(1);
    let l = limit.unwrap_or(50);
    let url = format!(
        "{}/backend/sessions?page={}&limit={}",
        api_url.trim_end_matches('/'),
        p,
        l
    );
    get(&url, &token).await
}

// deletes a session by id; returns nothing on success
#[tauri::command]
pub async fn api_delete_session(
    api_url: String,
    token: String,
    session_id: String,
) -> Result<(), String> {
    let url = format!("{}/backend/sessions/{}", api_url.trim_end_matches('/'), session_id);
    delete(&url, &token).await
}

// ── auth ──────────────────────────────────────────────────────────────────────

// fetches currently authenticated user info (userId, email)
#[tauri::command]
pub async fn api_get_me(api_url: String, token: String) -> Result<Value, String> {
    let url = format!("{}/backend/auth/me", api_url.trim_end_matches('/'));
    get(&url, &token).await
}
