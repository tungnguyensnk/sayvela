use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    mpsc, Arc, Mutex,
};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Default)]
pub struct TtsState {
    worker: Mutex<Option<WorkerHandle>>,
}

impl Drop for TtsState {
    // shuts down the owned worker when tauri releases application state
    fn drop(&mut self) {
        if let Ok(worker) = self.worker.get_mut() {
            if let Some(handle) = worker.take() {
                handle.shutdown();
            }
        }
    }
}

struct WorkerHandle {
    shutdown: Arc<AtomicBool>,
    cancel: Arc<AtomicBool>,
    generation: Arc<AtomicU64>,
    tx: mpsc::Sender<WorkerCmd>,
    audio_tx: mpsc::Sender<AudioMsg>,
    join_synth: Option<thread::JoinHandle<()>>,
    join_audio: Option<thread::JoinHandle<()>>,
}

impl WorkerHandle {
    // shuts down tts worker threads and waits for their resources to close
    fn shutdown(mut self) {
        self.shutdown.store(true, Ordering::SeqCst);
        self.cancel.store(true, Ordering::SeqCst);
        drop(self.tx);
        if let Some(j) = self.join_synth.take() {
            let _ = j.join();
        }
        if let Some(j) = self.join_audio.take() {
            let _ = j.join();
        }
    }
}

#[cfg(windows)]
// creates isolated synthesis and audio workers for one tts session
fn create_worker(app: tauri::AppHandle) -> WorkerHandle {
    let shutdown = Arc::new(AtomicBool::new(false));
    let cancel = Arc::new(AtomicBool::new(false));
    let generation = Arc::new(AtomicU64::new(0));
    let (tx, cmd_rx) = mpsc::channel::<WorkerCmd>();
    let (audio_tx, audio_rx) = mpsc::channel::<AudioMsg>();

    let join_synth = {
        let shutdown = shutdown.clone();
        let cancel = cancel.clone();
        let generation = generation.clone();
        let audio_tx = audio_tx.clone();
        thread::spawn(move || synth_thread_main(shutdown, cancel, generation, cmd_rx, audio_tx))
    };
    let join_audio = {
        let shutdown = shutdown.clone();
        let generation = generation.clone();
        thread::spawn(move || audio_thread_main(shutdown, generation, audio_rx, app))
    };

    WorkerHandle {
        shutdown,
        cancel,
        generation,
        tx,
        audio_tx,
        join_synth: Some(join_synth),
        join_audio: Some(join_audio),
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsVoice {
    pub id: String,
    pub name: String,
    pub language: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsSpeakOptions {
    pub text: String,
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub voice_id: Option<String>,
    #[serde(default)]
    pub output_device_id: Option<String>,
    #[serde(default)]
    pub rate: Option<f32>,
    #[serde(default)]
    pub pitch: Option<f32>,
    #[serde(default)]
    pub speed: Option<f32>,
    #[serde(default)]
    pub volume: Option<f32>,
    #[serde(default)]
    pub queue_mode: Option<String>,
    #[serde(default)]
    pub prewarm: bool,
    #[serde(default)]
    pub stream_end: bool,
    // identifies the transcript segment this text belongs to, so playback
    // progress can be reported back for highlighting
    #[serde(default)]
    pub marker_id: Option<String>,
    #[serde(default)]
    pub marker_offset: u32,
}

// provides backward-compatible provider selection for existing callers
fn default_provider() -> String {
    "builtin".to_string()
}

fn decode_voice_id(id: &str) -> Result<String, String> {
    let bytes = URL_SAFE_NO_PAD
        .decode(id.as_bytes())
        .map_err(|_| "invalid voiceId".to_string())?;
    String::from_utf8(bytes).map_err(|_| "invalid voiceId".to_string())
}

fn encode_voice_id(id: &str) -> String {
    URL_SAFE_NO_PAD.encode(id.as_bytes())
}

// accepts only work from the active lifecycle generation
fn is_current_generation(message_generation: u64, current_generation: u64) -> bool {
    message_generation == current_generation
}

#[derive(Debug)]
enum WorkerCmd {
    Speak(Box<TtsSpeakOptions>, u64),
    Stop,
}

// one character boundary in a speech stream, used to report reading progress
#[derive(Debug, Clone)]
struct SpeechMark {
    end_seconds: f32,
    marker_id: String,
    char_index: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsProgress {
    pub marker_id: String,
    pub char_index: u32,
    // the voice stopped here; the position stays on screen as a marker
    pub done: bool,
}

// audio waiting to be rendered, tagged with the stream it belongs to
#[derive(Debug)]
struct AudioChunk {
    stream_seq: u64,
    pcm: Vec<u8>,
    marks: Vec<SpeechMark>,
}

#[derive(Debug)]
enum AudioMsg {
    SetDevice(String, u64),
    Flush(u64),
    Enqueue {
        generation: u64,
        stream_seq: u64,
        sample_rate: u32,
        channels: u16,
        pcm: Vec<u8>,
        marks: Vec<SpeechMark>,
    },
}

#[cfg(not(windows))]
// return error for unsupported platforms
fn win_only_err() -> Result<(), String> {
    Err("only supported on windows".to_string())
}

#[cfg(windows)]
// escape special characters for ssml xml
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(windows)]
// convert playback rate to ssml percentage string
fn ssml_percent_from_rate(rate: f32) -> String {
    let pct = ((rate.clamp(0.1, 4.0) - 1.0) * 100.0)
        .round()
        .clamp(-90.0, 200.0);
    format!("{pct:+.0}%")
}

#[cfg(windows)]
// convert pitch factor to ssml semitones string
fn ssml_pitch_from_factor(pitch: f32) -> String {
    let st = ((pitch.clamp(0.5, 2.0) - 1.0) * 12.0)
        .round()
        .clamp(-12.0, 12.0);
    format!("{st:+.0}st")
}

#[cfg(windows)]
// convert volume factor to ssml percentage string
fn ssml_volume_from_factor(volume: f32) -> String {
    let pct = (volume.clamp(0.0, 1.0) * 100.0).round();
    format!("{pct:.0}%")
}

// applies saturating gain to little-endian pcm16 samples
fn apply_pcm16_gain(pcm: &mut [u8], gain: f32) {
    let gain = gain.clamp(0.0, 2.0);
    for sample in pcm.chunks_exact_mut(2) {
        let value = i16::from_le_bytes([sample[0], sample[1]]) as f32 * gain;
        sample.copy_from_slice(
            &(value.round().clamp(i16::MIN as f32, i16::MAX as f32) as i16).to_le_bytes(),
        );
    }
}

#[cfg(windows)]
// construct ssml string with voice parameters and escaped text
fn build_ssml(text: &str, lang: &str, rate: f32, pitch: f32, volume: f32) -> String {
    let escaped = escape_xml(text);
    let rate_s = ssml_percent_from_rate(rate);
    let pitch_s = ssml_pitch_from_factor(pitch);
    let volume_s = ssml_volume_from_factor(volume);
    format!(
        r#"<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}"><prosody rate="{rate_s}" pitch="{pitch_s}" volume="{volume_s}">{escaped}</prosody></speak>"#
    )
}

#[cfg(windows)]
fn parse_wav_pcm(wav: &[u8]) -> Result<(u32, u16, Vec<u8>), String> {
    if wav.len() < 12 || &wav[0..4] != b"RIFF" || &wav[8..12] != b"WAVE" {
        return Err("invalid wav".to_string());
    }

    let mut idx = 12usize;
    let mut sample_rate: Option<u32> = None;
    let mut channels: Option<u16> = None;
    let mut data: Option<Vec<u8>> = None;

    while idx + 8 <= wav.len() {
        let chunk_id = &wav[idx..idx + 4];
        let size =
            u32::from_le_bytes([wav[idx + 4], wav[idx + 5], wav[idx + 6], wav[idx + 7]]) as usize;
        idx += 8;
        if idx + size > wav.len() {
            break;
        }
        if chunk_id == b"fmt " && size >= 16 {
            let audio_format = u16::from_le_bytes([wav[idx], wav[idx + 1]]);
            let ch = u16::from_le_bytes([wav[idx + 2], wav[idx + 3]]);
            let sr = u32::from_le_bytes([wav[idx + 4], wav[idx + 5], wav[idx + 6], wav[idx + 7]]);
            let bits_per_sample = u16::from_le_bytes([wav[idx + 14], wav[idx + 15]]);
            if audio_format != 1 || bits_per_sample != 16 {
                return Err("unsupported wav format".to_string());
            }
            sample_rate = Some(sr);
            channels = Some(ch);
        } else if chunk_id == b"data" {
            data = Some(wav[idx..idx + size].to_vec());
        }
        idx += size;
        if idx % 2 == 1 {
            idx += 1;
        }
        if data.is_some() && sample_rate.is_some() && channels.is_some() {
            break;
        }
    }

    let sr = sample_rate.ok_or_else(|| "missing wav fmt".to_string())?;
    let ch = channels.ok_or_else(|| "missing wav fmt".to_string())?;
    let pcm = data.ok_or_else(|| "missing wav data".to_string())?;
    Ok((sr, ch, pcm))
}

#[cfg(windows)]
fn resolve_render_device(device_id: &str) -> Result<wasapi::Device, String> {
    let _ = wasapi::initialize_mta();
    if device_id == "default-loopback" {
        return wasapi::get_default_device(&wasapi::Direction::Render).map_err(|e| e.to_string());
    }
    let collection =
        wasapi::DeviceCollection::new(&wasapi::Direction::Render).map_err(|e| e.to_string())?;
    for dev in &collection {
        let dev = dev.map_err(|e| e.to_string())?;
        let sys_id = dev.get_id().unwrap_or_default();
        if (!sys_id.is_empty() && sys_id == device_id)
            || (device_id.starts_with("friendly:")
                && dev.get_friendlyname().unwrap_or_default() == device_id[9..])
        {
            return Ok(dev);
        }
    }
    Err("device not found".to_string())
}

#[cfg(windows)]
// initialize and start wasapi audio render stream
fn open_render_stream(
    device_id: &str,
    sample_rate: u32,
    channels: u16,
) -> Result<(wasapi::AudioClient, wasapi::AudioRenderClient, usize), String> {
    let device = resolve_render_device(device_id)?;
    let mut client = device.get_iaudioclient().map_err(|e| e.to_string())?;
    let desired = wasapi::WaveFormat::new(
        16,
        16,
        &wasapi::SampleType::Int,
        sample_rate as usize,
        channels as usize,
        None,
    );
    const BUFFER_DURATION_HNS: i64 = 1_000_000;
    let mode = wasapi::StreamMode::PollingShared {
        autoconvert: true,
        buffer_duration_hns: BUFFER_DURATION_HNS,
    };
    client
        .initialize_client(&desired, &wasapi::Direction::Render, &mode)
        .map_err(|e| e.to_string())?;
    let render = client.get_audiorenderclient().map_err(|e| e.to_string())?;
    client.start_stream().map_err(|e| e.to_string())?;
    let frame_bytes = (channels as usize) * 2;
    Ok((client, render, frame_bytes))
}

#[cfg(windows)]
// ensure audio render stream is open and ready
fn ensure_render_stream(
    device_id: &str,
    sample_rate: u32,
    channels: u16,
    audio_client: &mut Option<wasapi::AudioClient>,
    render_client: &mut Option<wasapi::AudioRenderClient>,
    frame_bytes: &mut usize,
) -> Result<(), String> {
    if audio_client.is_some() && render_client.is_some() {
        return Ok(());
    }
    let (c, r, fb) = open_render_stream(device_id, sample_rate, channels)?;
    *audio_client = Some(c);
    *render_client = Some(r);
    *frame_bytes = fb;
    Ok(())
}

#[cfg(windows)]
const SONIOX_PUMP_SLICE_MS: u64 = 20;
#[cfg(windows)]
// fallback stream closure when no explicit stream_end signal arrives; stays
// above the endpoint delay so one utterance is not split into two readings
const SONIOX_LINGER_MS: u64 = 1500;
#[cfg(windows)]
// abandons a stream whose server stopped responding entirely
const SONIOX_STALL_SECS: u64 = 45;
#[cfg(windows)]
// a stream that never produced audio is retried instead of blocking the queue
const SONIOX_FIRST_AUDIO_SECS: u64 = 8;
#[cfg(windows)]
const SONIOX_KEEPALIVE_TICK_SECS: u64 = 10;
#[cfg(windows)]
const SONIOX_CANCEL_DRAIN_MS: u64 = 2000;

#[cfg(windows)]
struct SonioxStreamParams {
    language: String,
    voice: String,
    speed: Option<f32>,
}

// one chunk of text written to a stream, kept so character timings coming back
// can be mapped to the transcript segment the text came from
#[cfg(windows)]
struct SpokenSpan {
    char_start: u32,
    char_len: u32,
    marker_id: String,
    marker_offset: u32,
}

#[cfg(windows)]
// labels each synthesis stream so the audio thread knows where its timeline starts
fn next_stream_seq() -> u64 {
    static STREAM_SEQ: AtomicU64 = AtomicU64::new(0);
    STREAM_SEQ.fetch_add(1, Ordering::SeqCst) + 1
}

#[cfg(windows)]
// resolves the stream-wide character position back to a transcript position
fn mark_for(spans: &[SpokenSpan], char_position: u32, end_seconds: f32) -> Option<SpeechMark> {
    let span = spans
        .iter()
        .find(|s| char_position >= s.char_start && char_position < s.char_start + s.char_len)?;
    Some(SpeechMark {
        end_seconds,
        marker_id: span.marker_id.clone(),
        // characters finished so far inside this transcript segment
        char_index: span.marker_offset + (char_position - span.char_start) + 1,
    })
}

#[cfg(windows)]
fn soniox_language(opts: &TtsSpeakOptions) -> String {
    opts.language
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or("en")
        .to_string()
}

#[cfg(windows)]
// accepts follow-up deltas that can join the currently open synthesis stream
fn joins_stream(opts: &TtsSpeakOptions, params: &SonioxStreamParams) -> bool {
    opts.provider == "soniox"
        && !opts.prewarm
        && opts.queue_mode.as_deref().is_none_or(|mode| mode == "add")
        && soniox_language(opts) == params.language
        && opts.voice_id.as_deref().unwrap_or_default() == params.voice
        && (crate::tts_soniox::clamp_speed(opts.speed)
            - crate::tts_soniox::clamp_speed(params.speed))
        .abs()
            < f32::EPSILON
}

#[cfg(windows)]
// establishes a session if needed and starts a stream with the first text chunk;
// retries on a fresh connection so a socket the server already closed never
// swallows an utterance
fn open_soniox_stream(
    runtime: &tokio::runtime::Runtime,
    session_slot: &mut Option<crate::tts_soniox::SonioxSession>,
    params: &SonioxStreamParams,
    text: &str,
    text_end: bool,
) -> Option<String> {
    for _ in 0..2 {
        if session_slot
            .as_ref()
            .is_some_and(|session| session.needs_reconnect())
        {
            *session_slot = None;
        }
        if session_slot.is_none() {
            let Ok(api_key) = crate::secure_store::get_api_key() else {
                return None;
            };
            match runtime.block_on(crate::tts_soniox::SonioxSession::connect(api_key)) {
                Ok(session) => *session_slot = Some(session),
                Err(_) => continue,
            }
        }
        let Some(session) = session_slot.as_mut() else {
            continue;
        };
        let opened = runtime.block_on(async {
            // a closed socket only reveals itself on a read, so check before writing
            session.poll_idle().await?;
            let stream_id = session
                .open_stream(&params.language, &params.voice, params.speed)
                .await?;
            session.send_text(&stream_id, text, text_end).await?;
            Ok::<String, String>(stream_id)
        });
        match opened {
            Ok(stream_id) => return Some(stream_id),
            Err(_) => *session_slot = None,
        }
    }
    None
}

#[cfg(windows)]
// cancels the active stream and drains the socket so the next stream starts clean
fn cancel_and_drain(
    runtime: &tokio::runtime::Runtime,
    session_slot: &mut Option<crate::tts_soniox::SonioxSession>,
    stream_id: &str,
) {
    let Some(session) = session_slot.as_mut() else {
        return;
    };
    if runtime.block_on(session.cancel_stream(stream_id)).is_err() {
        *session_slot = None;
        return;
    }
    let drained = runtime.block_on(session.pump(
        Duration::from_millis(SONIOX_CANCEL_DRAIN_MS),
        |_pcm| Ok(()),
    ));
    if !matches!(drained, Ok(crate::tts_soniox::PumpEvent::Terminated)) {
        *session_slot = None;
    }
}

#[cfg(windows)]
// drives one utterance stream: forwards audio while accepting queued text deltas,
// closing on an explicit stream_end signal or after a linger fallback
#[allow(clippy::too_many_arguments)]
fn run_soniox_stream(
    runtime: &tokio::runtime::Runtime,
    session_slot: &mut Option<crate::tts_soniox::SonioxSession>,
    first: &TtsSpeakOptions,
    first_text: &str,
    generation: u64,
    rx: &mpsc::Receiver<WorkerCmd>,
    audio_tx: &mpsc::Sender<AudioMsg>,
    cancel: &Arc<AtomicBool>,
    current_generation: &Arc<AtomicU64>,
    shutdown: &Arc<AtomicBool>,
) -> Option<WorkerCmd> {
    let params = SonioxStreamParams {
        language: soniox_language(first),
        voice: first.voice_id.clone().unwrap_or_default(),
        speed: first.speed,
    };
    let mut volume = first.volume.unwrap_or(1.0);
    let mut text_ended = first.stream_end;
    // everything written to the current stream, replayed if the socket dies
    // before any audio comes back
    let mut written = first_text.to_string();
    let mut spans = vec![SpokenSpan {
        char_start: 0,
        char_len: first_text.chars().count() as u32,
        marker_id: first.marker_id.clone().unwrap_or_default(),
        marker_offset: first.marker_offset,
    }];
    let mut carry: Option<WorkerCmd> = None;
    let mut attempts = 0u32;

    'attempt: loop {
        attempts += 1;
        let stream_seq = next_stream_seq();
        let stream_id =
            open_soniox_stream(runtime, session_slot, &params, &written, text_ended)?;
        let mut heard_audio = false;
        let mut chars_voiced = 0u32;
        let mut last_text = Instant::now();
        let mut last_activity = Instant::now();

        loop {
            if shutdown.load(Ordering::SeqCst) {
                cancel_and_drain(runtime, session_slot, &stream_id);
                return carry;
            }

            let Some(session) = session_slot.as_mut() else {
                return carry;
            };
            let got_audio = std::cell::Cell::new(false);
            let voiced = std::cell::Cell::new(chars_voiced);
            let pumped = runtime.block_on(session.pump(
                Duration::from_millis(SONIOX_PUMP_SLICE_MS),
                |mut frame| {
                    got_audio.set(true);
                    let mut position = voiced.get();
                    let marks = frame
                        .character_end_times
                        .iter()
                        .filter_map(|end| {
                            let mark = mark_for(&spans, position, *end);
                            position += 1;
                            mark
                        })
                        .collect();
                    voiced.set(position);
                    apply_pcm16_gain(&mut frame.pcm, volume);
                    audio_tx
                        .send(AudioMsg::Enqueue {
                            generation,
                            stream_seq,
                            sample_rate: 24000,
                            channels: 1,
                            pcm: frame.pcm,
                            marks,
                        })
                        .map_err(|_| "TTS audio worker closed".to_string())
                },
            ));
            chars_voiced = voiced.get();
            if got_audio.get() {
                heard_audio = true;
                last_activity = Instant::now();
            }
            match pumped {
                Ok(crate::tts_soniox::PumpEvent::Terminated) => return carry,
                Ok(crate::tts_soniox::PumpEvent::Timeout) => {}
                Err(_) => {
                    *session_slot = None;
                    // nothing was heard yet, so the text can be replayed intact
                    if !heard_audio && attempts < 2 && !written.trim().is_empty() {
                        continue 'attempt;
                    }
                    return carry;
                }
            }

            if cancel.load(Ordering::SeqCst)
                || current_generation.load(Ordering::SeqCst) != generation
            {
                cancel_and_drain(runtime, session_slot, &stream_id);
                return carry;
            }

            if carry.is_none() {
                while let Ok(next) = rx.try_recv() {
                    match next {
                        WorkerCmd::Stop => {
                            cancel_and_drain(runtime, session_slot, &stream_id);
                            return carry;
                        }
                        WorkerCmd::Speak(next_opts, next_generation) => {
                            if !is_current_generation(
                                next_generation,
                                current_generation.load(Ordering::SeqCst),
                            ) {
                                continue;
                            }
                            // a prewarm must reach the outer handler so its device
                            // and flush messages are not lost
                            if next_opts.prewarm {
                                carry = Some(WorkerCmd::Speak(next_opts, next_generation));
                                break;
                            }
                            let next_text = next_opts.text.trim().to_string();
                            let ends_stream = next_opts.provider == "soniox"
                                && next_text.is_empty()
                                && next_opts.stream_end;
                            if ends_stream || (!text_ended && joins_stream(&next_opts, &params)) {
                                volume = next_opts.volume.unwrap_or(volume);
                                if !text_ended && (ends_stream || !next_text.is_empty()) {
                                    let close = ends_stream || next_opts.stream_end;
                                    let Some(session) = session_slot.as_mut() else {
                                        return Some(WorkerCmd::Speak(next_opts, next_generation));
                                    };
                                    if runtime
                                        .block_on(session.send_text(&stream_id, &next_text, close))
                                        .is_err()
                                    {
                                        *session_slot = None;
                                        if ends_stream {
                                            return None;
                                        }
                                        return Some(WorkerCmd::Speak(next_opts, next_generation));
                                    }
                                    spans.push(SpokenSpan {
                                        char_start: written.chars().count() as u32,
                                        char_len: next_text.chars().count() as u32,
                                        marker_id: next_opts.marker_id.clone().unwrap_or_default(),
                                        marker_offset: next_opts.marker_offset,
                                    });
                                    written.push_str(&next_text);
                                    text_ended = close;
                                    last_text = Instant::now();
                                }
                                continue;
                            }
                            // incompatible request: close this stream, replay it afterwards
                            carry = Some(WorkerCmd::Speak(next_opts, next_generation));
                            break;
                        }
                    }
                }
            }

            if !text_ended
                && (carry.is_some()
                    || last_text.elapsed().as_millis() as u64 >= SONIOX_LINGER_MS)
            {
                let Some(session) = session_slot.as_mut() else {
                    return carry;
                };
                if runtime
                    .block_on(session.send_text(&stream_id, "", true))
                    .is_err()
                {
                    *session_slot = None;
                    if !heard_audio && attempts < 2 {
                        continue 'attempt;
                    }
                    return carry;
                }
                text_ended = true;
            }

            let idle = last_activity.elapsed().as_secs();
            let stalled = if heard_audio {
                idle >= SONIOX_STALL_SECS
            } else {
                idle >= SONIOX_FIRST_AUDIO_SECS
            };
            if stalled {
                cancel_and_drain(runtime, session_slot, &stream_id);
                *session_slot = None;
                if !heard_audio && attempts < 2 && !written.trim().is_empty() {
                    continue 'attempt;
                }
                return carry;
            }
        }
    }
}

#[cfg(windows)]
fn synth_thread_main(
    shutdown: Arc<AtomicBool>,
    cancel: Arc<AtomicBool>,
    current_generation: Arc<AtomicU64>,
    rx: mpsc::Receiver<WorkerCmd>,
    audio_tx: mpsc::Sender<AudioMsg>,
) {
    let _ = wasapi::initialize_mta();

    // the builtin voice is optional; soniox playback must survive its absence
    let synthesizer = windows::Media::SpeechSynthesis::SpeechSynthesizer::new().ok();
    let runtime = tokio::runtime::Runtime::new().ok();
    let mut soniox_session: Option<crate::tts_soniox::SonioxSession> = None;
    let mut carry: Option<WorkerCmd> = None;

    while !shutdown.load(Ordering::SeqCst) {
        let cmd = if let Some(cmd) = carry.take() {
            cmd
        } else {
            match rx.recv_timeout(Duration::from_secs(SONIOX_KEEPALIVE_TICK_SECS)) {
                Ok(cmd) => cmd,
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    if let (Some(runtime), Some(session)) =
                        (runtime.as_ref(), soniox_session.as_mut())
                    {
                        // reading is what answers server pings and surfaces a
                        // close frame, so an idle socket is polled as well
                        let alive = runtime.block_on(async {
                            if session.is_authenticated() {
                                session.keep_alive().await?;
                            }
                            session.poll_idle().await
                        });
                        if alive.is_err() {
                            soniox_session = None;
                        }
                    }
                    continue;
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        };
        match cmd {
            // tts_stop already flushed the renderer directly; re-flushing here
            // would wipe audio from a speak that raced ahead of this command
            WorkerCmd::Stop => {}
            WorkerCmd::Speak(mut opts, generation) => {
                if !is_current_generation(generation, current_generation.load(Ordering::SeqCst)) {
                    continue;
                }
                cancel.store(false, Ordering::SeqCst);
                let text = opts.text.trim().to_string();
                // control-only requests carry no device and produce no audio, so
                // they must not retarget or clear the renderer
                let control_only = opts.prewarm
                    || (opts.provider == "soniox" && text.is_empty() && opts.stream_end);
                if !control_only {
                    let new_device_id = opts
                        .output_device_id
                        .take()
                        .unwrap_or_else(|| "default-loopback".to_string());
                    let _ = audio_tx.send(AudioMsg::SetDevice(new_device_id, generation));
                    if opts.queue_mode.as_deref() != Some("add") {
                        let _ = audio_tx.send(AudioMsg::Flush(generation));
                    }
                }

                if opts.provider == "soniox" {
                    // a stream_end with no open stream has nothing left to close
                    if text.is_empty() && opts.stream_end && !opts.prewarm {
                        continue;
                    }
                    if opts.prewarm {
                        if soniox_session
                            .as_ref()
                            .is_some_and(|session| session.needs_reconnect())
                        {
                            soniox_session = None;
                        }
                        if let Some(runtime) = runtime.as_ref() {
                            if soniox_session.is_none() {
                                if let Ok(api_key) = crate::secure_store::get_api_key() {
                                    soniox_session = runtime
                                        .block_on(crate::tts_soniox::SonioxSession::connect(
                                            api_key,
                                        ))
                                        .ok();
                                }
                            }
                        }
                        continue;
                    }
                    if text.is_empty()
                        || opts
                            .voice_id
                            .as_deref()
                            .filter(|value| !value.is_empty())
                            .is_none()
                    {
                        continue;
                    }
                    if let Some(runtime) = runtime.as_ref() {
                        carry = run_soniox_stream(
                            runtime,
                            &mut soniox_session,
                            &opts,
                            &text,
                            generation,
                            &rx,
                            &audio_tx,
                            &cancel,
                            &current_generation,
                            &shutdown,
                        );
                    }
                    continue;
                }

                let Some(synthesizer) = synthesizer.as_ref() else {
                    continue;
                };
                if text.is_empty() {
                    continue;
                }

                if let Some(voice_id) = opts.voice_id.as_deref().filter(|s| !s.is_empty()) {
                    if let Ok(native_id) = decode_voice_id(voice_id) {
                        if let Ok(voices) =
                            windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices()
                        {
                            for v in voices {
                                if v.Id().map(|id| id.to_string()).unwrap_or_default() == native_id
                                {
                                    let _ = synthesizer.SetVoice(&v);
                                    break;
                                }
                            }
                        }
                    }
                }

                let lang = opts
                    .language
                    .as_deref()
                    .filter(|s| !s.is_empty())
                    .unwrap_or("en-US");
                let rate = opts.rate.unwrap_or(1.0);
                let pitch = opts.pitch.unwrap_or(1.0);
                let volume = opts.volume.unwrap_or(1.0);
                let ssml = build_ssml(&text, lang, rate, pitch, volume);

                let stream = match synthesizer
                    .SynthesizeSsmlToStreamAsync(&windows::core::HSTRING::from(ssml))
                {
                    Ok(op) => match op.get() {
                        Ok(s) => s,
                        Err(_) => continue,
                    },
                    Err(_) => continue,
                };

                let size = match stream.Size() {
                    Ok(sz) => sz as usize,
                    Err(_) => continue,
                };
                if size == 0 {
                    continue;
                }
                let input = match stream.GetInputStreamAt(0) {
                    Ok(i) => i,
                    Err(_) => continue,
                };
                let reader = match windows::Storage::Streams::DataReader::CreateDataReader(&input) {
                    Ok(r) => r,
                    Err(_) => continue,
                };
                let to_load = (size as u64).min(u32::MAX as u64) as u32;
                if reader.LoadAsync(to_load).and_then(|op| op.get()).is_err() {
                    continue;
                }
                let mut wav = vec![0u8; to_load as usize];
                if reader.ReadBytes(&mut wav).is_err() {
                    continue;
                }
                let (sr, ch, pcm) = match parse_wav_pcm(&wav) {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                // the builtin voice reports no character timings, so it plays
                // as one untracked utterance
                let _ = audio_tx.send(AudioMsg::Enqueue {
                    generation,
                    stream_seq: next_stream_seq(),
                    sample_rate: sr,
                    channels: ch,
                    pcm,
                    marks: Vec::new(),
                });
            }
        }
    }
}

#[cfg(windows)]
fn audio_thread_main(
    shutdown: Arc<AtomicBool>,
    current_generation: Arc<AtomicU64>,
    rx: mpsc::Receiver<AudioMsg>,
    app: tauri::AppHandle,
) {
    use tauri::Emitter;
    let _ = wasapi::initialize_mta();

    let mut current_device_id = "default-loopback".to_string();
    let mut current_sr: u32 = 0;
    let mut current_ch: u16 = 0;
    let mut pending_sr: u32 = 0;
    let mut pending_ch: u16 = 0;

    let mut audio_client: Option<wasapi::AudioClient> = None;
    let mut render_client: Option<wasapi::AudioRenderClient> = None;
    let mut frame_bytes: usize = 2;

    let mut queue: VecDeque<AudioChunk> = VecDeque::new();
    let mut current: VecDeque<u8> = VecDeque::new();
    let mut pending_queue: VecDeque<AudioChunk> = VecDeque::new();
    let mut idle_since: Option<Instant> = None;

    let mut written_frames: u64 = 0;
    let mut stream_start_frames: u64 = 0;
    let mut playing_seq: u64 = 0;
    let mut marks: Vec<SpeechMark> = Vec::new();
    let mut reported: Option<TtsProgress> = None;

    while !shutdown.load(Ordering::SeqCst) {
        let has_data = !current.is_empty() || !queue.is_empty() || !pending_queue.is_empty();
        let wait = if has_data {
            Duration::from_millis(2)
        } else if audio_client.is_some() {
            Duration::from_millis(10)
        } else {
            Duration::from_millis(50)
        };

        let first = rx.recv_timeout(wait);
        let mut msgs = Vec::new();
        match first {
            Ok(m) => msgs.push(m),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
        while let Ok(m) = rx.try_recv() {
            msgs.push(m);
        }

        for msg in msgs {
            match msg {
                AudioMsg::SetDevice(id, message_generation) => {
                    if !is_current_generation(
                        message_generation,
                        current_generation.load(Ordering::SeqCst),
                    ) {
                        continue;
                    }
                    if id != current_device_id {
                        if let Some(c) = audio_client.take() {
                            let _ = c.stop_stream();
                        }
                        audio_client = None;
                        render_client = None;
                        current_device_id = id;
                        current_sr = 0;
                        current_ch = 0;
                        pending_sr = 0;
                        pending_ch = 0;
                        queue.clear();
                        current.clear();
                        pending_queue.clear();
                        idle_since = None;
                    }
                }
                AudioMsg::Flush(message_generation) => {
                    if !is_current_generation(
                        message_generation,
                        current_generation.load(Ordering::SeqCst),
                    ) {
                        continue;
                    }
                    if let Some(client) = audio_client.take() {
                        let _ = client.stop_stream();
                    }
                    render_client = None;
                    queue.clear();
                    current.clear();
                    pending_queue.clear();
                    pending_sr = 0;
                    pending_ch = 0;
                    idle_since = None;
                    marks.clear();
                    // a flush discards the audio, so the marker goes with it
                    if reported.take().is_some() {
                        let _ = app.emit(
                            "tts_progress",
                            TtsProgress {
                                marker_id: String::new(),
                                char_index: 0,
                                done: true,
                            },
                        );
                    }
                }
                AudioMsg::Enqueue {
                    generation: message_generation,
                    stream_seq,
                    sample_rate,
                    channels,
                    pcm,
                    marks,
                } => {
                    if !is_current_generation(
                        message_generation,
                        current_generation.load(Ordering::SeqCst),
                    ) {
                        continue;
                    }
                    let chunk = AudioChunk {
                        stream_seq,
                        pcm,
                        marks,
                    };
                    if current_sr == 0 {
                        current_sr = sample_rate;
                        current_ch = channels;
                        queue.push_back(chunk);
                    } else if current_sr == sample_rate && current_ch == channels {
                        queue.push_back(chunk);
                    } else {
                        if pending_sr != 0 && (pending_sr != sample_rate || pending_ch != channels)
                        {
                            pending_queue.clear();
                        }
                        pending_sr = sample_rate;
                        pending_ch = channels;
                        pending_queue.push_back(chunk);
                    }
                }
            }
        }

        if current.is_empty() && queue.is_empty() && !pending_queue.is_empty() {
            if let Some(c) = audio_client.take() {
                let _ = c.stop_stream();
            }
            audio_client = None;
            render_client = None;
            current_sr = pending_sr;
            current_ch = pending_ch;
            pending_sr = 0;
            pending_ch = 0;
            queue = std::mem::take(&mut pending_queue);
        }

        if current.is_empty() {
            if let Some(next) = queue.pop_front() {
                if next.stream_seq != playing_seq {
                    // a new utterance begins here, so its timeline restarts
                    playing_seq = next.stream_seq;
                    stream_start_frames = written_frames;
                    marks.clear();
                    reported = None;
                }
                marks.extend(next.marks);
                current = VecDeque::from(next.pcm);
            }
        }

        if audio_client.is_none() && current_sr != 0 && (!current.is_empty() || !queue.is_empty()) {
            let _ = ensure_render_stream(
                &current_device_id,
                current_sr,
                current_ch,
                &mut audio_client,
                &mut render_client,
                &mut frame_bytes,
            );
        }

        let mut render_failed = false;
        if let (Some(ref client), Some(ref render)) = (&audio_client, &render_client) {
            match client.get_available_space_in_frames() {
                Ok(space) => {
                    let remaining = space as usize;
                    if !current.is_empty() && remaining > 0 {
                        let frames = std::cmp::min(remaining, current.len() / frame_bytes);
                        if frames > 0 {
                            if render
                                .write_to_device_from_deque(frames, &mut current, None)
                                .is_err()
                            {
                                render_failed = true;
                            } else {
                                written_frames += frames as u64;
                            }
                        }
                    }
                    // what the listener has actually heard is what left the buffer
                    if !marks.is_empty() && current_sr != 0 {
                        let pending = client.get_current_padding().unwrap_or(0) as u64;
                        let played = written_frames.saturating_sub(pending);
                        let elapsed = played.saturating_sub(stream_start_frames) as f32
                            / current_sr as f32;
                        // marks are ordered by time, so the last one already
                        // reached is where the voice currently is
                        let spoken = marks.partition_point(|mark| mark.end_seconds <= elapsed);
                        let progress = spoken.checked_sub(1).map(|i| TtsProgress {
                            marker_id: marks[i].marker_id.clone(),
                            char_index: marks[i].char_index,
                            done: false,
                        });
                        if let Some(progress) = progress {
                            let changed = reported.as_ref().is_none_or(|last| {
                                last.marker_id != progress.marker_id
                                    || last.char_index != progress.char_index
                            });
                            if changed {
                                let _ = app.emit("tts_progress", progress.clone());
                                reported = Some(progress);
                            }
                        }
                    }
                }
                // the device was invalidated (default device changed, unplugged);
                // drop it so the next iteration reopens instead of going silent
                Err(_) => render_failed = true,
            }
        }
        if render_failed {
            if let Some(c) = audio_client.take() {
                let _ = c.stop_stream();
            }
            render_client = None;
        }

        if current.is_empty() && queue.is_empty() && pending_queue.is_empty() {
            // the voice has finished, so the highlight is cleared
            let drained = audio_client
                .as_ref()
                .and_then(|c| c.get_current_padding().ok())
                .unwrap_or(0)
                == 0;
            // the reading position stays visible so it is clear where it stopped
            if drained {
                if let Some(last) = reported.take() {
                    marks.clear();
                    let _ = app.emit("tts_progress", TtsProgress { done: true, ..last });
                }
            }
            let idle_start = idle_since.get_or_insert_with(Instant::now);
            // keeps the render device warm between utterances to avoid reopen latency
            if idle_start.elapsed() >= Duration::from_millis(15_000) {
                if let Some(c) = audio_client.take() {
                    let _ = c.stop_stream();
                }
                render_client = None;
                current_sr = 0;
                current_ch = 0;
            }
        } else {
            idle_since = None;
        }
    }

    if let Some(c) = audio_client.take() {
        let _ = c.stop_stream();
    }
}

#[tauri::command]
// get list of available tts voices from windows speech synthesis
pub fn tts_list_voices(
    state: tauri::State<TtsState>,
    language: Option<String>,
) -> Result<Vec<TtsVoice>, String> {
    #[cfg(not(windows))]
    {
        let _ = (state, language);
        return Err("only supported on windows".to_string());
    }
    #[cfg(windows)]
    {
        let _ = state;
        let _ = wasapi::initialize_mta();
        let lang_filter = language.map(|s| s.to_lowercase());
        let voices = windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices()
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for v in voices {
            let id = v.Id().map(|s| s.to_string()).unwrap_or_default();
            let name = v.DisplayName().map(|s| s.to_string()).unwrap_or_default();
            let lang = v.Language().map(|s| s.to_string()).unwrap_or_default();
            if let Some(ref f) = lang_filter {
                if !lang.to_lowercase().contains(f) {
                    continue;
                }
            }
            out.push(TtsVoice {
                id: encode_voice_id(&id),
                name,
                language: lang,
            });
        }
        Ok(out)
    }
}

#[tauri::command]
// cancels current synthesis and discards queued text and audio without rebuilding workers
pub fn tts_stop(state: tauri::State<TtsState>) -> Result<(), String> {
    let guard = state
        .worker
        .lock()
        .map_err(|_| "state poisoned".to_string())?;
    if let Some(handle) = guard.as_ref() {
        let generation = handle.generation.fetch_add(1, Ordering::SeqCst) + 1;
        handle.cancel.store(true, Ordering::SeqCst);
        handle
            .audio_tx
            .send(AudioMsg::Flush(generation))
            .map_err(|_| "tts audio worker closed".to_string())?;
        handle
            .tx
            .send(WorkerCmd::Stop)
            .map_err(|_| "tts worker closed".to_string())?;
    }
    Ok(())
}

#[tauri::command]
// replaces the tts session to discard its socket, input queue, and audio queue
pub fn tts_start(app: tauri::AppHandle, state: tauri::State<TtsState>) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (state, app);
        return Err("only supported on windows".to_string());
    }
    #[cfg(windows)]
    {
        // the lock is held across the swap so a concurrent speak cannot build an
        // orphan worker while the previous one is still shutting down
        let mut guard = state
            .worker
            .lock()
            .map_err(|_| "state poisoned".to_string())?;
        if let Some(handle) = guard.take() {
            handle.shutdown();
        }
        *guard = Some(create_worker(app.clone()));
        Ok(())
    }
}

#[tauri::command]
// send text and voice options to tts worker thread for playback
pub fn tts_speak(
    app: tauri::AppHandle,
    state: tauri::State<TtsState>,
    options: TtsSpeakOptions,
) -> Result<(), String> {
    let text = options.text.trim().to_string();
    if text.is_empty() && !options.prewarm && !options.stream_end {
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = (state, options, app);
        return Err("only supported on windows".to_string());
    }
    #[cfg(windows)]
    {
        let mut opts = options;
        opts.text = text;
        let (tx, generation) = {
            let mut guard = state
                .worker
                .lock()
                .map_err(|_| "state poisoned".to_string())?;
            if guard.is_none() {
                *guard = Some(create_worker(app.clone()));
            }
            let handle = guard
                .as_ref()
                .ok_or_else(|| "tts worker missing".to_string())?;
            (handle.tx.clone(), handle.generation.clone())
        };

        // a prewarm only warms the connection, so it must never advance the
        // lifecycle generation or cancel audio that is already playing
        let generation = if opts.prewarm || opts.queue_mode.as_deref() == Some("add") {
            generation.load(Ordering::SeqCst)
        } else {
            let next = generation.fetch_add(1, Ordering::SeqCst) + 1;
            let guard = state
                .worker
                .lock()
                .map_err(|_| "state poisoned".to_string())?;
            if let Some(handle) = guard.as_ref() {
                handle.cancel.store(true, Ordering::SeqCst);
            }
            next
        };
        tx.send(WorkerCmd::Speak(Box::new(opts), generation))
            .map_err(|_| "tts worker closed".to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    // verifies stop and flush generations reject delayed synthesis and audio work
    fn filters_stale_lifecycle_work() {
        assert!(is_current_generation(4, 4));
        assert!(!is_current_generation(3, 4));
        assert!(!is_current_generation(5, 4));
    }

    #[test]
    // verifies soniox pcm gain boosts and saturates signed samples
    fn applies_saturating_pcm16_gain() {
        let mut pcm = [0x10, 0x27, 0xf0, 0xd8, 0xff, 0x7f];
        apply_pcm16_gain(&mut pcm, 2.0);
        assert_eq!(i16::from_le_bytes([pcm[0], pcm[1]]), 20_000);
        assert_eq!(i16::from_le_bytes([pcm[2], pcm[3]]), -20_000);
        assert_eq!(i16::from_le_bytes([pcm[4], pcm[5]]), i16::MAX);
    }
}
