use serde::{Deserialize, Serialize};
use std::time::Duration;

const API_BASE: &str = "https://api.soniox.com/v1";

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SonioxVoice {
    pub id: String,
    pub name: String,
    pub model: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct VoicesPage {
    #[serde(default)]
    voices: Vec<VoiceWire>,
    next_page_cursor: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VoiceWire {
    id: String,
    name: String,
    #[serde(default)]
    models: Vec<VoiceModelWire>,
}

#[derive(Debug, Deserialize)]
struct VoiceModelWire {
    model: String,
    status: String,
}

// maps one api page into supported cloned tts voices and its next cursor
fn parse_voices_page(page: VoicesPage) -> (Vec<SonioxVoice>, Option<String>) {
    let voices = page
        .voices
        .into_iter()
        .filter_map(|voice| {
            let model = voice
                .models
                .into_iter()
                .find(|model| model.model == "tts-rt-v1")?;
            Some(SonioxVoice {
                id: voice.id,
                name: voice.name,
                model: model.model,
                status: model.status,
            })
        })
        .collect();
    (voices, page.next_page_cursor)
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SonioxSttTempKey {
    pub api_key: String,
    pub expires_at: String,
}

// builds the bounded http client used by soniox management requests
fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|_| "failed to initialize Soniox client".to_string())
}

// maps non-success soniox responses without exposing credentials or response bodies
async fn ensure_success(response: reqwest::Response) -> Result<reqwest::Response, String> {
    if response.status().is_success() {
        return Ok(response);
    }
    Err(format!(
        "Soniox request failed ({})",
        response.status().as_u16()
    ))
}

// lists all cloned tts voices by following the server cursor
pub async fn list_voices() -> Result<Vec<SonioxVoice>, String> {
    let key = crate::secure_store::get_api_key()?;
    let client = client()?;
    let mut cursor: Option<String> = None;
    let mut output = Vec::new();
    loop {
        let mut request = client
            .get(format!("{API_BASE}/voices?limit=1000"))
            .bearer_auth(&key);
        if let Some(value) = cursor.as_deref() {
            request = request.query(&[("cursor", value)]);
        }
        let page: VoicesPage = ensure_success(
            request
                .send()
                .await
                .map_err(|_| "Soniox network error".to_string())?,
        )
        .await?
        .json()
        .await
        .map_err(|_| "invalid Soniox response".to_string())?;
        let (voices, next_cursor) = parse_voices_page(page);
        output.extend(voices);
        cursor = next_cursor;
        if cursor.is_none() {
            break;
        }
    }
    Ok(output)
}

// requests the temporary key used by the existing realtime stt sessions
#[tauri::command]
pub async fn soniox_get_temp_key() -> Result<SonioxSttTempKey, String> {
    let response = client()?
        .post("https://soniox.com/api/speech-to-text")
        .header("accept", "*/*")
        .header("origin", "https://soniox.com")
        .header("referer", "https://soniox.com/")
        .send()
        .await
        .map_err(|_| "Soniox network error".to_string())?;
    ensure_success(response)
        .await?
        .json()
        .await
        .map_err(|_| "invalid Soniox response".to_string())
}

#[tauri::command]
pub async fn soniox_list_voices() -> Result<Vec<SonioxVoice>, String> {
    list_voices().await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_cursor_and_filters_model() {
        let page: VoicesPage = serde_json::from_value(serde_json::json!({
            "voices": [
                {"id": "a", "name": "A", "models": [{"model": "other", "status": "ready"}, {"model": "tts-rt-v1", "status": "ready"}]},
                {"id": "b", "name": "B", "models": [{"model": "other", "status": "ready"}]}
            ],
            "next_page_cursor": "next"
        }))
        .unwrap();
        let (voices, cursor) = parse_voices_page(page);
        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].id, "a");
        assert_eq!(cursor.as_deref(), Some("next"));
    }
}
