use anyhow::{anyhow, Context, Result};
use tauri::{AppHandle, Emitter};

use crate::types::{AudioDevice, CaptureState};

#[cfg(windows)]
use wasapi::{Device, DeviceCollection, Direction, SampleType, StreamMode, WaveFormat};

#[cfg(windows)]
use std::collections::VecDeque;

#[cfg(windows)]
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

#[cfg(windows)]
use std::thread;

#[cfg(windows)]
use std::time::{Duration, Instant};

// list both loopback (render) and microphone (capture) audio devices
pub fn list_audio_devices() -> Result<Vec<AudioDevice>> {
    #[cfg(not(windows))]
    {
        let _ = ();
        return Err(anyhow!("audio capture is only supported on windows"));
    }

    #[cfg(windows)]
    {
        let _ = wasapi::initialize_mta().ok();
        let mut out = Vec::new();

        // Loopback devices (Render)
        out.push(AudioDevice {
            id: "default-loopback".to_string(),
            name: "Default Output Device".to_string(),
            kind: "loopback".to_string(),
        });

        if let Ok(collection) = DeviceCollection::new(&Direction::Render) {
            for dev in (&collection).into_iter().flatten() {
                let name = dev
                    .get_friendlyname()
                    .unwrap_or_else(|_| "unknown".to_string());
                let id = dev.get_id().unwrap_or_else(|_| "".to_string());
                let id = if id.trim().is_empty() {
                    format!("friendly:loopback:{name}")
                } else {
                    id
                };
                out.push(AudioDevice {
                    id,
                    name,
                    kind: "loopback".to_string(),
                });
            }
        }

        // Microphone devices (Capture)
        out.push(AudioDevice {
            id: "default-mic".to_string(),
            name: "Default Microphone".to_string(),
            kind: "microphone".to_string(),
        });

        if let Ok(collection) = DeviceCollection::new(&Direction::Capture) {
            for dev in (&collection).into_iter().flatten() {
                let name = dev
                    .get_friendlyname()
                    .unwrap_or_else(|_| "unknown".to_string());
                let id = dev.get_id().unwrap_or_else(|_| "".to_string());
                let id = if id.trim().is_empty() {
                    format!("friendly:mic:{name}")
                } else {
                    id
                };
                out.push(AudioDevice {
                    id,
                    name,
                    kind: "microphone".to_string(),
                });
            }
        }

        Ok(out)
    }
}

#[cfg(windows)]
const CAPTURE_RATE_ENV: &str = "SAYVELA_CAPTURE_RATE";

#[cfg(windows)]
const DEFAULT_CAPTURE_RATE: u32 = 16_000;

#[cfg(windows)]
// picks the rate requested from wasapi; "native" keeps the device mix format so
// both paths can be compared, and an unusable value falls back to it as well
fn parse_capture_rate(value: Option<&str>) -> Option<u32> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Some(DEFAULT_CAPTURE_RATE);
    };
    if value.eq_ignore_ascii_case("native") {
        return None;
    }
    value.parse().ok().filter(|rate| *rate > 0)
}

#[cfg(windows)]
pub struct CaptureHandle {
    stop: Arc<AtomicBool>,
    join: Option<thread::JoinHandle<()>>,
}

#[cfg(windows)]
impl CaptureHandle {
    pub fn stop(mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(j) = self.join.take() {
            let deadline = Instant::now() + Duration::from_secs(3);
            while !j.is_finished() && Instant::now() < deadline {
                thread::sleep(Duration::from_millis(10));
            }
            if j.is_finished() {
                let _ = j.join();
            }
        }
    }
}

#[cfg(windows)]
pub fn start_audio_capture(
    app: AppHandle,
    device_id: String,
    kind: String,
) -> Result<CaptureHandle> {
    let stop = Arc::new(AtomicBool::new(false));
    let stop2 = stop.clone();

    // Determine event names based on kind
    let (event_data, event_state) = if kind == "microphone" {
        ("audio_chunk_mic", "capture_state_mic")
    } else {
        ("audio_chunk_loopback", "capture_state_loopback")
    };

    // Clone for thread
    let event_data = event_data.to_string();
    let event_state = event_state.to_string();

    let join = thread::spawn(move || {
        let _ = app.emit(
            &event_state,
            CaptureState {
                state: "starting".to_string(),
                message: None,
                sample_rate: None,
            },
        );
        match capture_thread(
            app.clone(),
            device_id,
            kind,
            stop2,
            event_data.clone(),
            event_state.clone(),
        ) {
            Ok(()) => {
                let _ = app.emit(
                    &event_state,
                    CaptureState {
                        state: "stopped".to_string(),
                        message: None,
                        sample_rate: None,
                    },
                );
            }
            Err(e) => {
                let _ = app.emit(
                    &event_state,
                    CaptureState {
                        state: "error".to_string(),
                        message: Some(e.to_string()),
                        sample_rate: None,
                    },
                );
            }
        }
    });

    Ok(CaptureHandle {
        stop,
        join: Some(join),
    })
}

#[cfg(windows)]
// capture audio data from device, resample it, and emit to frontend
fn capture_thread(
    app: AppHandle,
    device_id: String,
    kind: String,
    stop: Arc<AtomicBool>,
    event_data: String,
    event_state: String,
) -> Result<()> {
    wasapi::initialize_mta()
        .ok()
        .map_err(|e| anyhow!(e.to_string()))
        .context("initialize com mta")?;

    let direction = if kind == "microphone" {
        Direction::Capture
    } else {
        Direction::Render
    };

    let device = if device_id == "default-loopback" || device_id == "default-mic" {
        wasapi::get_default_device(&direction)
            .map_err(|e| anyhow!(e.to_string()))
            .context("get default device")?
    } else {
        let collection = DeviceCollection::new(&direction)
            .map_err(|e| anyhow!(e.to_string()))
            .context("get devices")?;

        let mut selected: Option<Device> = None;
        for dev in &collection {
            let dev = dev.map_err(|e| anyhow!(e.to_string()))?;
            let sys_id = dev.get_id().unwrap_or_default();
            if (!sys_id.is_empty() && sys_id == device_id)
                || (device_id.starts_with("friendly:")
                    && dev.get_friendlyname().unwrap_or_default() == device_id[9..])
            // Simplified matching
            {
                selected = Some(dev);
                break;
            }
        }
        selected.ok_or_else(|| anyhow!("device not found"))?
    };

    let client = device
        .get_iaudioclient()
        .map_err(|e| anyhow!(e.to_string()))
        .context("get iaudioclient")?;

    let mix = client
        .get_mixformat()
        .map_err(|e| anyhow!(e.to_string()))
        .context("get mixformat")?;

    let mode = StreamMode::PollingShared {
        autoconvert: true,
        buffer_duration_hns: 200_000,
    };

    // wasapi converts with its own anti-aliased resampler, so speech recognition
    // can be fed 16 khz mono without a hand written one; a device that rejects
    // the format falls back to its mix format
    let mut formats = Vec::new();
    if let Some(rate) = parse_capture_rate(std::env::var(CAPTURE_RATE_ENV).ok().as_deref()) {
        formats.push(WaveFormat::new(
            32,
            32,
            &SampleType::Float,
            rate as usize,
            1,
            None,
        ));
    }
    formats.push(WaveFormat::new(
        32,
        32,
        &SampleType::Float,
        mix.get_samplespersec() as usize,
        mix.get_nchannels() as usize,
        None,
    ));

    // a failed initialize leaves the client unusable, so each attempt gets its own
    let mut pending = Some(client);
    let mut selected = None;
    let mut last_error = None;
    for format in &formats {
        let mut attempt = match pending.take() {
            Some(existing) => existing,
            None => device
                .get_iaudioclient()
                .map_err(|e| anyhow!(e.to_string()))
                .context("get iaudioclient")?,
        };
        match attempt.initialize_client(format, &Direction::Capture, &mode) {
            Ok(()) => {
                selected = Some((attempt, format));
                break;
            }
            Err(e) => last_error = Some(e.to_string()),
        }
    }
    let (client, desired) = selected.ok_or_else(|| {
        anyhow!(last_error.unwrap_or_else(|| "no capture format available".to_string()))
    })
    .context("initialize client")?;
    // makes it visible whether the requested rate was accepted or fell back
    log::info!(
        "capture {kind}: {} Hz {} ch (device {} Hz {} ch)",
        desired.get_samplespersec(),
        desired.get_nchannels(),
        mix.get_samplespersec(),
        mix.get_nchannels()
    );

    let capture = client
        .get_audiocaptureclient()
        .map_err(|e| anyhow!(e.to_string()))
        .context("capture client")?;
    client
        .start_stream()
        .map_err(|e| anyhow!(e.to_string()))
        .context("start stream")?;

    let in_rate = desired.get_samplespersec() as u32;
    let in_ch = desired.get_nchannels() as usize;
    // Use input rate as output rate to avoid resampling artifacts
    let out_rate = in_rate;

    let _ = app.emit(
        &event_state,
        CaptureState {
            state: "running".to_string(),
            message: Some(format!(
                "inRate={} inCh={} outRate={} deviceRate={} deviceCh={}",
                in_rate,
                in_ch,
                out_rate,
                mix.get_samplespersec(),
                mix.get_nchannels()
            )),
            sample_rate: Some(out_rate),
        },
    );

    let mut raw_bytes: VecDeque<u8> = VecDeque::new();
    let mut in_f32: Vec<f32> = Vec::new();
    let mut mono: Vec<f32> = Vec::new();
    let mut resampled: Vec<f32> = Vec::new();
    let mut out_i16_bytes: Vec<u8> = Vec::new();
    let mut pcm_buf: VecDeque<u8> = VecDeque::new();

    let mut carry: Vec<f32> = Vec::new();
    let mut carry_idx_f: f32 = 0.0;
    let ratio = out_rate as f32 / in_rate as f32;
    let chunk_ms = if kind == "microphone" { 50 } else { 100 };
    let chunk_bytes = out_rate as usize * 2 * chunk_ms / 1000;

    while !stop.load(Ordering::SeqCst) {
        let frames = capture
            .get_next_packet_size()
            .map_err(|e| anyhow!(e.to_string()))?;
        if let Some(frames) = frames {
            if frames == 0 {
                thread::sleep(Duration::from_millis(2));
                continue;
            }

            let _ = capture
                .read_from_device_to_deque(&mut raw_bytes)
                .map_err(|e| anyhow!(e.to_string()))
                .context("read buffer")?;

            let frame_bytes = (in_ch * 4) as usize;
            let total_frames = raw_bytes.len() / frame_bytes;
            if total_frames == 0 {
                continue;
            }

            in_f32.clear();
            in_f32.reserve(total_frames * in_ch);
            let contiguous: Vec<u8> = raw_bytes.drain(..total_frames * frame_bytes).collect();
            for chunk in contiguous.chunks_exact(4) {
                in_f32.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
            }

            mono.clear();
            mono.reserve(total_frames);
            for f in 0..total_frames {
                let base = f * in_ch;
                let mut sum = 0.0f32;
                for c in 0..in_ch {
                    sum += in_f32[base + c];
                }
                mono.push(sum / in_ch as f32);
            }

            resampled.clear();
            linear_resample_append(&mono, ratio, &mut carry, &mut carry_idx_f, &mut resampled);

            out_i16_bytes.clear();
            out_i16_bytes.reserve(resampled.len() * 2);
            for s in &resampled {
                let v = (s * 32767.0).clamp(-32768.0, 32767.0) as i16;
                out_i16_bytes.extend_from_slice(&v.to_le_bytes());
            }

            pcm_buf.extend(out_i16_bytes.drain(..));
            while pcm_buf.len() >= chunk_bytes {
                let chunk: Vec<u8> = pcm_buf.drain(..chunk_bytes).collect();
                let _ = app.emit(&event_data, chunk);
            }
        }

        thread::sleep(Duration::from_millis(2));
    }

    let _ = client.stop_stream();
    Ok(())
}

#[cfg(windows)]
// linearly resample audio data to match output sample rate
fn linear_resample_append(
    input: &[f32],
    ratio: f32,
    carry: &mut Vec<f32>,
    carry_idx_f: &mut f32,
    out: &mut Vec<f32>,
) {
    carry.extend_from_slice(input);

    let step = 1.0 / ratio;
    let mut idx = *carry_idx_f;
    let max_idx = (carry.len() as f32) - 1.0;
    while idx < max_idx {
        let i0 = idx.floor() as usize;
        let i1 = (i0 + 1).min(carry.len() - 1);
        let frac = idx - (i0 as f32);
        let s = carry[i0] * (1.0 - frac) + carry[i1] * frac;
        out.push(s);
        idx += step;
    }

    let consumed = idx.floor() as usize;
    if consumed > 0 {
        carry.drain(0..consumed);
        idx -= consumed as f32;
    }
    *carry_idx_f = idx;
}

#[cfg(windows)]
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    // verifies the a/b flag defaults to 16 khz and only opts out explicitly
    fn reads_capture_rate_flag() {
        assert_eq!(parse_capture_rate(None), Some(DEFAULT_CAPTURE_RATE));
        assert_eq!(parse_capture_rate(Some("  ")), Some(DEFAULT_CAPTURE_RATE));
        assert_eq!(parse_capture_rate(Some(" 24000 ")), Some(24_000));
        assert_eq!(parse_capture_rate(Some("Native")), None);
        assert_eq!(parse_capture_rate(Some("0")), None);
        assert_eq!(parse_capture_rate(Some("abc")), None);
    }
}
