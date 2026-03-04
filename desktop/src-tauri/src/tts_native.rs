use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc, Mutex,
};
use std::thread;
use std::time::Duration;

#[derive(Default)]
pub struct TtsState {
    worker: Mutex<Option<WorkerHandle>>,
}

struct WorkerHandle {
    stop: Arc<AtomicBool>,
    tx: mpsc::Sender<WorkerCmd>,
    join_synth: Option<thread::JoinHandle<()>>,
    join_audio: Option<thread::JoinHandle<()>>,
}

impl WorkerHandle {
    fn stop(mut self) {
        self.stop.store(true, Ordering::SeqCst);
        drop(self.tx);
        if let Some(j) = self.join_synth.take() {
            let _ = j.join();
        }
        if let Some(j) = self.join_audio.take() {
            let _ = j.join();
        }
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
    pub volume: Option<f32>,
    #[serde(default)]
    pub queue_mode: Option<String>,
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

#[derive(Debug)]
enum WorkerCmd {
    Speak(TtsSpeakOptions),
}

#[derive(Debug)]
enum AudioMsg {
    SetDevice(String),
    Flush,
    Enqueue { sample_rate: u32, channels: u16, pcm: Vec<u8> },
}

#[cfg(not(windows))]
fn win_only_err() -> Result<(), String> {
    Err("only supported on windows".to_string())
}

#[cfg(windows)]
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(windows)]
fn ssml_percent_from_rate(rate: f32) -> String {
    let pct = ((rate.clamp(0.1, 4.0) - 1.0) * 100.0).round().clamp(-90.0, 200.0);
    format!("{pct:+.0}%")
}

#[cfg(windows)]
fn ssml_pitch_from_factor(pitch: f32) -> String {
    let st = ((pitch.clamp(0.5, 2.0) - 1.0) * 12.0).round().clamp(-12.0, 12.0);
    format!("{st:+.0}st")
}

#[cfg(windows)]
fn ssml_volume_from_factor(volume: f32) -> String {
    let pct = (volume.clamp(0.0, 1.0) * 100.0).round();
    format!("{pct:.0}%")
}

#[cfg(windows)]
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
        let size = u32::from_le_bytes([wav[idx + 4], wav[idx + 5], wav[idx + 6], wav[idx + 7]]) as usize;
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
    let collection = wasapi::DeviceCollection::new(&wasapi::Direction::Render).map_err(|e| e.to_string())?;
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
fn open_render_stream(device_id: &str, sample_rate: u32, channels: u16) -> Result<(wasapi::AudioClient, wasapi::AudioRenderClient, usize), String> {
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
fn synth_thread_main(stop: Arc<AtomicBool>, rx: mpsc::Receiver<WorkerCmd>, audio_tx: mpsc::Sender<AudioMsg>) {
    let _ = wasapi::initialize_mta();

    let synthesizer = match windows::Media::SpeechSynthesis::SpeechSynthesizer::new() {
        Ok(s) => s,
        Err(_) => return,
    };

    while !stop.load(Ordering::SeqCst) {
        match rx.recv() {
            Ok(WorkerCmd::Speak(mut opts)) => {
                let text = opts.text.trim().to_string();
                if text.is_empty() {
                    continue;
                }
                let new_device_id = opts
                    .output_device_id
                    .take()
                    .unwrap_or_else(|| "default-loopback".to_string());
                let _ = audio_tx.send(AudioMsg::SetDevice(new_device_id));

                let flush = opts.queue_mode.as_deref() != Some("add");
                if flush {
                    let _ = audio_tx.send(AudioMsg::Flush);
                }

                if let Some(voice_id) = opts.voice_id.as_deref().filter(|s| !s.is_empty()) {
                    if let Ok(native_id) = decode_voice_id(voice_id) {
                        if let Ok(voices) = windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices() {
                            for v in voices {
                                if v.Id().map(|id| id.to_string()).unwrap_or_default() == native_id {
                                    let _ = synthesizer.SetVoice(&v);
                                    break;
                                }
                            }
                        }
                    }
                }

                let lang = opts.language.as_deref().filter(|s| !s.is_empty()).unwrap_or("en-US");
                let rate = opts.rate.unwrap_or(1.0);
                let pitch = opts.pitch.unwrap_or(1.0);
                let volume = opts.volume.unwrap_or(1.0);
                let ssml = build_ssml(&text, lang, rate, pitch, volume);

                let stream = match synthesizer.SynthesizeSsmlToStreamAsync(&windows::core::HSTRING::from(ssml)) {
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
                let _ = audio_tx.send(AudioMsg::Enqueue {
                    sample_rate: sr,
                    channels: ch,
                    pcm,
                });
            }
            Err(_) => break,
        }
    }
}

#[cfg(windows)]
fn audio_thread_main(stop: Arc<AtomicBool>, rx: mpsc::Receiver<AudioMsg>) {
    let _ = wasapi::initialize_mta();

    let mut current_device_id = "default-loopback".to_string();
    let mut current_sr: u32 = 0;
    let mut current_ch: u16 = 0;
    let mut pending_sr: u32 = 0;
    let mut pending_ch: u16 = 0;

    let mut audio_client: Option<wasapi::AudioClient> = None;
    let mut render_client: Option<wasapi::AudioRenderClient> = None;
    let mut frame_bytes: usize = 2;

    let mut queue: VecDeque<Vec<u8>> = VecDeque::new();
    let mut current: VecDeque<u8> = VecDeque::new();
    let mut pending_queue: VecDeque<Vec<u8>> = VecDeque::new();

    while !stop.load(Ordering::SeqCst) {
        let busy = audio_client.is_some() || !current.is_empty() || !queue.is_empty() || !pending_queue.is_empty();
        let wait = if busy {
            Duration::from_millis(2)
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
                AudioMsg::SetDevice(id) => {
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
                    }
                }
                AudioMsg::Flush => {
                    queue.clear();
                    current.clear();
                    pending_queue.clear();
                    pending_sr = 0;
                    pending_ch = 0;
                }
                AudioMsg::Enqueue {
                    sample_rate,
                    channels,
                    pcm,
                } => {
                    if current_sr == 0 {
                        current_sr = sample_rate;
                        current_ch = channels;
                        queue.push_back(pcm);
                    } else if current_sr == sample_rate && current_ch == channels {
                        queue.push_back(pcm);
                    } else {
                        if pending_sr != 0 && (pending_sr != sample_rate || pending_ch != channels) {
                            pending_queue.clear();
                        }
                        pending_sr = sample_rate;
                        pending_ch = channels;
                        pending_queue.push_back(pcm);
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
                current = VecDeque::from(next);
            }
        }

        if audio_client.is_none() && current_sr != 0 && (current.len() > 0 || queue.len() > 0) {
            let _ = ensure_render_stream(
                &current_device_id,
                current_sr,
                current_ch,
                &mut audio_client,
                &mut render_client,
                &mut frame_bytes,
            );
        }

        if let (Some(ref client), Some(ref render)) = (&audio_client, &render_client) {
            if let Ok(space) = client.get_available_space_in_frames() {
                let remaining = space as usize;
                if !current.is_empty() && remaining > 0 {
                    let frames = std::cmp::min(remaining, current.len() / frame_bytes);
                    if frames > 0 {
                        let _ = render.write_to_device_from_deque(frames, &mut current, None);
                    }
                }
            }
        }

        if current.is_empty() && queue.is_empty() && pending_queue.is_empty() {
            if let Some(c) = audio_client.take() {
                let _ = c.stop_stream();
            }
            audio_client = None;
            render_client = None;
            current_sr = 0;
            current_ch = 0;
        }
    }

    if let Some(c) = audio_client.take() {
        let _ = c.stop_stream();
    }
}

#[tauri::command]
pub fn tts_list_voices(state: tauri::State<TtsState>, language: Option<String>) -> Result<Vec<TtsVoice>, String> {
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
        let voices = windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices().map_err(|e| e.to_string())?;
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
pub fn tts_stop(state: tauri::State<TtsState>) -> Result<(), String> {
    let handle = {
        let mut guard = state.worker.lock().map_err(|_| "state poisoned".to_string())?;
        guard.take()
    };
    if let Some(h) = handle {
        h.stop();
    }
    Ok(())
}

#[tauri::command]
pub fn tts_speak(state: tauri::State<TtsState>, options: TtsSpeakOptions) -> Result<(), String> {
    let text = options.text.trim().to_string();
    if text.is_empty() {
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = (state, options);
        return Err("only supported on windows".to_string());
    }
    #[cfg(windows)]
    {
        let mut opts = options;
        opts.text = text;
        let tx = {
            let mut guard = state.worker.lock().map_err(|_| "state poisoned".to_string())?;
            if guard.is_none() {
                let stop = Arc::new(AtomicBool::new(false));
                let (cmd_tx, cmd_rx) = mpsc::channel::<WorkerCmd>();
                let (audio_tx, audio_rx) = mpsc::channel::<AudioMsg>();

                let stop_synth = stop.clone();
                let audio_tx_synth = audio_tx.clone();
                let join_synth = thread::spawn(move || synth_thread_main(stop_synth, cmd_rx, audio_tx_synth));

                let stop_audio = stop.clone();
                let join_audio = thread::spawn(move || audio_thread_main(stop_audio, audio_rx));

                *guard = Some(WorkerHandle {
                    stop,
                    tx: cmd_tx.clone(),
                    join_synth: Some(join_synth),
                    join_audio: Some(join_audio),
                });
                cmd_tx
            } else {
                guard.as_ref().unwrap().tx.clone()
            }
        };

        tx.send(WorkerCmd::Speak(opts))
            .map_err(|_| "tts worker closed".to_string())?;
        Ok(())
    }
}
