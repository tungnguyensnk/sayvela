use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;
use std::time::Instant;
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};

const ENDPOINT: &str = "wss://tts-rt.soniox.com/tts-websocket";

// clamps soniox speech speed to the supported protocol range
pub fn clamp_speed(speed: Option<f32>) -> f32 {
    speed.unwrap_or(1.0).clamp(0.7, 1.3)
}

// creates the initial stream configuration without retaining the api key
pub fn config_message(
    api_key: &str,
    stream_id: &str,
    language: &str,
    voice: &str,
    speed: Option<f32>,
) -> Value {
    json!({
        "api_key": api_key, "stream_id": stream_id, "model": "tts-rt-v1",
        "language": language, "voice": voice, "audio_format": "pcm_s16le",
        "sample_rate": 24000, "speed": clamp_speed(speed)
    })
}

// creates a final text message for one independent synthesis stream
pub fn text_message(stream_id: &str, text: &str) -> Value {
    json!({ "stream_id": stream_id, "text": text, "text_end": true })
}

// creates a cancellation message for an active synthesis stream
pub fn cancel_message(stream_id: &str) -> Value {
    json!({ "stream_id": stream_id, "cancel": true })
}

// validates and decodes one pcm16 audio response
pub fn parse_audio(value: &Value) -> Result<Option<Vec<u8>>, String> {
    let Some(audio) = value.get("audio").and_then(Value::as_str) else {
        return Ok(None);
    };
    let pcm = STANDARD
        .decode(audio)
        .map_err(|_| "invalid Soniox audio".to_string())?;
    if pcm.len() % 2 != 0 {
        return Err("invalid Soniox PCM16 payload".to_string());
    }
    Ok(Some(pcm))
}

pub struct SonioxSession {
    api_key: String,
    socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
    connected_at: Instant,
    authenticated: bool,
}

impl SonioxSession {
    // opens one authenticated websocket that is reused for sequential synthesis streams
    pub async fn connect(api_key: String) -> Result<Self, String> {
        let (socket, _) = tokio::time::timeout(Duration::from_secs(10), connect_async(ENDPOINT))
            .await
            .map_err(|_| "Soniox connection timeout".to_string())?
            .map_err(|_| "Soniox connection failed".to_string())?;
        Ok(Self {
            api_key,
            socket,
            connected_at: Instant::now(),
            authenticated: false,
        })
    }

    // detects unauthenticated sockets that are too close to the server config deadline
    pub fn needs_reconnect(&self) -> bool {
        !self.authenticated && self.connected_at.elapsed() >= Duration::from_secs(8)
    }

    // sends one stream on the existing socket and forwards pcm until completion or cancellation
    pub async fn synthesize<F>(
        &mut self,
        text: &str,
        language: &str,
        voice: &str,
        speed: Option<f32>,
        cancel: Arc<AtomicBool>,
        mut enqueue: F,
    ) -> Result<(), String>
    where
        F: FnMut(Vec<u8>) -> Result<(), String>,
    {
        let stream_id = uuid::Uuid::new_v4().to_string();
        self.send(config_message(
            &self.api_key,
            &stream_id,
            language,
            voice,
            speed,
        ))
        .await?;
        self.authenticated = true;
        self.send(text_message(&stream_id, text)).await?;
        let result = tokio::time::timeout(Duration::from_secs(45), async {
            loop {
                tokio::select! {
                    message = self.socket.next() => {
                        let message = message
                            .ok_or_else(|| "Soniox stream ended unexpectedly".to_string())?
                            .map_err(|_| "Soniox stream closed".to_string())?;
                        if let Message::Text(payload) = message {
                            let value: Value = serde_json::from_str(&payload)
                                .map_err(|_| "invalid Soniox message".to_string())?;
                            if let Some(error_type) = value.get("error_type").and_then(Value::as_str) {
                                return Err(format!("Soniox error: {error_type}"));
                            }
                            if let Some(pcm) = parse_audio(&value)? {
                                enqueue(pcm)?;
                            }
                            if value.get("terminated").and_then(Value::as_bool) == Some(true) {
                                return Ok(());
                            }
                        }
                    }
                    _ = tokio::time::sleep(Duration::from_millis(25)) => {
                        if cancel.load(Ordering::SeqCst) {
                            let _ = self.send(cancel_message(&stream_id)).await;
                            return Ok(());
                        }
                    }
                }
            }
        })
        .await;
        result.map_err(|_| "Soniox stream timeout".to_string())?
    }

    // serializes and sends one soniox protocol message without exposing credentials
    async fn send(&mut self, value: Value) -> Result<(), String> {
        self.socket
            .send(Message::Text(value.to_string().into()))
            .await
            .map_err(|_| "Soniox send failed".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_messages_and_clamps_speed() {
        let config = config_message("secret", "id", "vi", "Maya", Some(2.0));
        assert!((config["speed"].as_f64().unwrap() - 1.3).abs() < f64::EPSILON * 1_000_000_000.0);
        assert_eq!(config["audio_format"], "pcm_s16le");
        assert_eq!(text_message("id", "hello")["text_end"], true);
        assert_eq!(cancel_message("id")["cancel"], true);
    }

    #[test]
    fn decodes_only_valid_pcm16() {
        assert_eq!(
            parse_audio(&json!({"audio": "AQI="})).unwrap(),
            Some(vec![1, 2])
        );
        assert!(parse_audio(&json!({"audio": "AQ=="})).is_err());
        assert!(parse_audio(&json!({"audio": "!"})).is_err());
    }
}
