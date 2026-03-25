use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
 
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SonioxTempKey {
    pub api_key: String,
    pub expires_at: String,
}
 
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SonioxTempKeyResponse {
    api_key: String,
    expires_at: String,
}
 
// request a temporary api key from soniox for speech-to-text
pub async fn get_temp_key() -> Result<SonioxTempKey> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://soniox.com/api/speech-to-text")
        .header("accept", "*/*")
        .header("accept-language", "vi,en-US;q=0.9,en;q=0.8")
        .header("cache-control", "no-cache")
        .header("pragma", "no-cache")
        .header("origin", "https://soniox.com")
        .header("referer", "https://soniox.com/")
        .send()
        .await
        .context("send request")?;
 
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("soniox temp key failed: status={} body={}", status.as_u16(), body);
    }
 
    let data: SonioxTempKeyResponse = resp.json().await.context("decode json")?;
    Ok(SonioxTempKey {
        api_key: data.api_key,
        expires_at: data.expires_at,
    })
}
