use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
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
        "sample_rate": 24000, "speed": clamp_speed(speed),
        "return_timestamps": true
    })
}

// creates one text chunk for an open stream; text_end marks the last chunk
pub fn text_message(stream_id: &str, text: &str, text_end: bool) -> Value {
    json!({ "stream_id": stream_id, "text": text, "text_end": text_end })
}

// creates a cancellation message for an active synthesis stream
pub fn cancel_message(stream_id: &str) -> Value {
    json!({ "stream_id": stream_id, "cancel": true })
}

// keeps an authenticated idle connection open between utterances
pub fn keep_alive_message() -> Value {
    json!({ "keep_alive": true })
}

#[derive(Debug, Default, PartialEq)]
pub struct AudioFrame {
    pub pcm: Vec<u8>,
    // end time of each character voiced in this frame, seconds from stream start
    pub character_end_times: Vec<f32>,
}

// validates and decodes one pcm16 audio response with its character timings
pub fn parse_audio(value: &Value) -> Result<Option<AudioFrame>, String> {
    let Some(audio) = value.get("audio").and_then(Value::as_str) else {
        return Ok(None);
    };
    let pcm = STANDARD
        .decode(audio)
        .map_err(|_| "invalid Soniox audio".to_string())?;
    if pcm.len() % 2 != 0 {
        return Err("invalid Soniox PCM16 payload".to_string());
    }
    let character_end_times = value
        .get("timestamps")
        .and_then(|t| t.get("character_end_times_seconds"))
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(Value::as_f64)
                .map(|seconds| seconds as f32)
                .collect()
        })
        .unwrap_or_default();
    Ok(Some(AudioFrame {
        pcm,
        character_end_times,
    }))
}

#[derive(Debug, PartialEq, Eq)]
pub enum PumpEvent {
    Timeout,
    Terminated,
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

    // reports whether the server has answered on this socket
    pub fn is_authenticated(&self) -> bool {
        self.authenticated
    }

    // reads any queued frames so server pings are answered and a closed socket is
    // detected before text is written into it and lost
    pub async fn poll_idle(&mut self) -> Result<(), String> {
        self.pump(Duration::from_millis(5), |_frame| Ok(())).await?;
        Ok(())
    }

    // opens one synthesis stream on the shared socket and returns its id
    pub async fn open_stream(
        &mut self,
        language: &str,
        voice: &str,
        speed: Option<f32>,
    ) -> Result<String, String> {
        let stream_id = uuid::Uuid::new_v4().to_string();
        self.send(config_message(
            &self.api_key,
            &stream_id,
            language,
            voice,
            speed,
        ))
        .await?;
        Ok(stream_id)
    }

    // appends one text chunk to an open stream; text_end closes its input
    pub async fn send_text(
        &mut self,
        stream_id: &str,
        text: &str,
        text_end: bool,
    ) -> Result<(), String> {
        self.send(text_message(stream_id, text, text_end)).await
    }

    // requests cancellation of an active stream; the server still terminates it
    pub async fn cancel_stream(&mut self, stream_id: &str) -> Result<(), String> {
        self.send(cancel_message(stream_id)).await
    }

    // keeps the idle connection from being closed between utterances
    pub async fn keep_alive(&mut self) -> Result<(), String> {
        self.send(keep_alive_message()).await
    }

    // reads socket messages for up to wait, forwarding pcm chunks as they decode
    pub async fn pump<F>(&mut self, wait: Duration, mut enqueue: F) -> Result<PumpEvent, String>
    where
        F: FnMut(AudioFrame) -> Result<(), String>,
    {
        let deadline = tokio::time::Instant::now() + wait;
        loop {
            let message = match tokio::time::timeout_at(deadline, self.socket.next()).await {
                Err(_) => return Ok(PumpEvent::Timeout),
                Ok(message) => message,
            };
            let message = message
                .ok_or_else(|| "Soniox stream ended unexpectedly".to_string())?
                .map_err(|_| "Soniox stream closed".to_string())?;
            // any server frame proves the connection is live and accepted
            self.authenticated = true;
            let Message::Text(payload) = message else {
                continue;
            };
            let value: Value =
                serde_json::from_str(&payload).map_err(|_| "invalid Soniox message".to_string())?;
            if let Some(error_type) = value.get("error_type").and_then(Value::as_str) {
                return Err(format!("Soniox error: {error_type}"));
            }
            if let Some(frame) = parse_audio(&value)? {
                enqueue(frame)?;
            }
            if value.get("terminated").and_then(Value::as_bool) == Some(true) {
                return Ok(PumpEvent::Terminated);
            }
        }
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
        assert_eq!(text_message("id", "hello", false)["text_end"], false);
        assert_eq!(text_message("id", "", true)["text_end"], true);
        assert_eq!(cancel_message("id")["cancel"], true);
        assert_eq!(keep_alive_message()["keep_alive"], true);
    }

    #[test]
    fn decodes_only_valid_pcm16() {
        assert_eq!(
            parse_audio(&json!({"audio": "AQI="})).unwrap(),
            Some(AudioFrame {
                pcm: vec![1, 2],
                character_end_times: vec![],
            })
        );
        assert!(parse_audio(&json!({"audio": "AQ=="})).is_err());
        assert!(parse_audio(&json!({"audio": "!"})).is_err());
    }

    #[test]
    fn reads_character_end_times() {
        let frame = parse_audio(&json!({
            "audio": "AQI=",
            "timestamps": {
                "characters": ["あ", "い"],
                "character_start_times_seconds": [0.0, 0.1],
                "character_end_times_seconds": [0.1, 0.25]
            }
        }))
        .unwrap()
        .unwrap();
        assert_eq!(frame.character_end_times, vec![0.1, 0.25]);
        assert!(config_message("k", "s", "ja", "v", None)["return_timestamps"]
            .as_bool()
            .unwrap());
    }
}
