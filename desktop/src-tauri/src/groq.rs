use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct GroqMessage<'a> {
  role: &'a str,
  content: &'a str,
}

#[derive(Debug, Serialize)]
struct GroqChatRequest<'a> {
  model: &'a str,
  messages: Vec<GroqMessage<'a>>,
  stream: bool,
  max_completion_tokens: u32,
  reasoning_effort: &'a str,
}

#[derive(Debug, Deserialize)]
struct GroqChatResponse {
  choices: Vec<GroqChoice>,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
  message: GroqChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct GroqChoiceMessage {
  content: Option<String>,
}

// send chat request to groq to check if user text contains a question
pub async fn check_question(content: String) -> Result<String> {
  let api_key = std::env::var("GROQ_API_KEY").context("missing GROQ_API_KEY env")?;
  let content = content.trim().to_string();
  if content.is_empty() {
    return Ok("0".to_string());
  }

  let req = GroqChatRequest {
    model: "openai/gpt-oss-120b",
    messages: vec![
      GroqMessage {
        role: "system",
        content: "bạn là hệ thống kiểm tra sự tồn tại của câu hỏi, để xem có câu hỏi bên trong đoạn hội thoại mà user gửi không. trả về 1 nếu có, 0 nếu không",
      },
      GroqMessage {
        role: "user",
        content: &content,
      },
    ],
    stream: false,
    max_completion_tokens: 1000,
    reasoning_effort: "medium",
  };

  let client = Client::new();
  let res = client
    .post("https://api.groq.com/openai/v1/chat/completions")
    .bearer_auth(api_key)
    .json(&req)
    .send()
    .await
    .context("groq request failed")?;

  if !res.status().is_success() {
    let status = res.status();
    let body = res.text().await.unwrap_or_default();
    return Err(anyhow!("groq non-200: {} {}", status, body));
  }

  let parsed: GroqChatResponse = res.json().await.context("invalid groq response")?;
  let out = parsed
    .choices
    .first()
    .and_then(|c| c.message.content.clone())
    .unwrap_or_default();
  Ok(out)
}

