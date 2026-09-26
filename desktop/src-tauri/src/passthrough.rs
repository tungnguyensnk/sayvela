// routes the microphone straight to the tts output device, so the other side
// hears your own voice instead of the translated one. both streams stay open
// while armed and a flag gates the audio, so switching on costs no device setup
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

struct Engine {
    stop: Arc<AtomicBool>,
    join: thread::JoinHandle<()>,
    devices: (String, String),
}

static ENGINE: Mutex<Option<Engine>> = Mutex::new(None);
static OPEN: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
mod imp {
    use super::OPEN;
    use anyhow::{anyhow, Result};
    use std::collections::VecDeque;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::Sender;
    use std::sync::Arc;
    use std::thread;
    use std::time::Duration;
    use wasapi::{Direction, SampleType, StreamMode, WaveFormat};

    const RATE: usize = 48_000;
    // f32 stereo
    const OUT_FRAME_BYTES: usize = 8;
    // the most audio allowed to queue at the output; beyond it the oldest is
    // dropped, so clock drift between the two devices never grows into delay
    const MAX_LAG_FRAMES: usize = RATE * 60 / 1000;
    // a little silence ahead of the first samples, so the output does not
    // starve and crackle while capture catches up
    const PREFILL_FRAMES: usize = RATE * 15 / 1000;

    fn err(e: impl std::fmt::Display) -> anyhow::Error {
        anyhow!(e.to_string())
    }

    pub fn run(mic_id: String, out_id: String, stop: Arc<AtomicBool>, ready: Sender<Result<(), String>>) {
        let opened = (|| -> Result<_> {
            wasapi::initialize_mta().ok().map_err(err)?;
            let mic = crate::audio::resolve_device(&Direction::Capture, &mic_id)?;
            let out = crate::tts_native::resolve_render_device(&out_id).map_err(err)?;

            let mut capture_client = mic.get_iaudioclient().map_err(err)?;
            let capture_mode = StreamMode::PollingShared { autoconvert: true, buffer_duration_hns: 200_000 };
            let mono = WaveFormat::new(32, 32, &SampleType::Float, RATE, 1, None);
            capture_client.initialize_client(&mono, &Direction::Capture, &capture_mode).map_err(err)?;
            let capture = capture_client.get_audiocaptureclient().map_err(err)?;

            let mut render_client = out.get_iaudioclient().map_err(err)?;
            let render_mode = StreamMode::PollingShared { autoconvert: true, buffer_duration_hns: 500_000 };
            let stereo = WaveFormat::new(32, 32, &SampleType::Float, RATE, 2, None);
            render_client.initialize_client(&stereo, &Direction::Render, &render_mode).map_err(err)?;
            let render = render_client.get_audiorenderclient().map_err(err)?;

            capture_client.start_stream().map_err(err)?;
            render_client.start_stream().map_err(err)?;
            Ok((capture_client, capture, render_client, render))
        })();

        let (capture_client, capture, render_client, render) = match opened {
            Ok(streams) => {
                let _ = ready.send(Ok(()));
                streams
            }
            Err(e) => {
                let _ = ready.send(Err(e.to_string()));
                return;
            }
        };

        let mut raw: VecDeque<u8> = VecDeque::new();
        let mut out: VecDeque<u8> = VecDeque::new();
        let mut was_open = false;
        let result = (|| -> Result<()> {
            while !stop.load(Ordering::SeqCst) {
                // capture keeps draining even while closed, so opening never
                // replays audio that piled up in the meantime
                while capture.get_next_packet_size().map_err(err)?.unwrap_or(0) > 0 {
                    capture.read_from_device_to_deque(&mut raw).map_err(err)?;
                }
                let open = OPEN.load(Ordering::SeqCst);
                if !open {
                    raw.clear();
                    out.clear();
                    was_open = false;
                    thread::sleep(Duration::from_millis(5));
                    continue;
                }
                if !was_open {
                    raw.clear();
                    out.extend(std::iter::repeat(0u8).take(PREFILL_FRAMES * OUT_FRAME_BYTES));
                    was_open = true;
                }

                // mono samples go out on both channels
                let whole = raw.len() / 4 * 4;
                let samples: Vec<u8> = raw.drain(..whole).collect();
                for sample in samples.chunks_exact(4) {
                    out.extend(sample);
                    out.extend(sample);
                }

                let queued = render_client.get_current_padding().map_err(err)? as usize;
                let local = out.len() / OUT_FRAME_BYTES;
                let excess = (queued + local).saturating_sub(MAX_LAG_FRAMES).min(local);
                out.drain(..excess * OUT_FRAME_BYTES);

                let space = render_client.get_available_space_in_frames().map_err(err)? as usize;
                let frames = space.min(out.len() / OUT_FRAME_BYTES);
                if frames > 0 {
                    render.write_to_device_from_deque(frames, &mut out, None).map_err(err)?;
                }
                thread::sleep(Duration::from_millis(2));
            }
            Ok(())
        })();
        if let Err(e) = result {
            log::warn!("[passthrough] stopped: {e}");
        }
        let _ = capture_client.stop_stream();
        let _ = render_client.stop_stream();
    }
}

fn disarm_locked(engine: &mut Option<Engine>) {
    if let Some(old) = engine.take() {
        old.stop.store(true, Ordering::SeqCst);
        let _ = old.join.join();
    }
}

fn arm(mic_device_id: String, output_device_id: String) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (mic_device_id, output_device_id);
        return Err("only supported on windows".to_string());
    }
    #[cfg(windows)]
    {
        let devices = (mic_device_id, output_device_id);
        let mut engine = ENGINE.lock().map_err(|_| "state poisoned".to_string())?;
        if engine.as_ref().is_some_and(|e| e.devices == devices && !e.join.is_finished()) {
            return Ok(());
        }
        disarm_locked(&mut engine);

        let stop = Arc::new(AtomicBool::new(false));
        let (tx, rx) = std::sync::mpsc::channel();
        let join = {
            let (mic, out) = devices.clone();
            let stop = stop.clone();
            thread::spawn(move || imp::run(mic, out, stop, tx))
        };
        // the caller learns right away when a device cannot be opened
        rx.recv().map_err(|_| "passthrough thread ended".to_string())??;
        *engine = Some(Engine { stop, join, devices });
        Ok(())
    }
}

fn disarm() -> Result<(), String> {
    OPEN.store(false, Ordering::SeqCst);
    let mut engine = ENGINE.lock().map_err(|_| "state poisoned".to_string())?;
    disarm_locked(&mut engine);
    Ok(())
}

// opening devices blocks, so it stays off the main thread
async fn blocking(f: impl FnOnce() -> Result<(), String> + Send + 'static) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

// opens mic and output ahead of time; calling again with the same devices is a no-op
#[tauri::command]
pub async fn passthrough_arm(mic_device_id: String, output_device_id: String) -> Result<(), String> {
    blocking(move || arm(mic_device_id, output_device_id)).await
}

#[tauri::command]
pub async fn passthrough_disarm() -> Result<(), String> {
    blocking(disarm).await
}

// gates the mic audio onto the output; instant, since the streams are already open
#[tauri::command]
pub fn passthrough_set(enabled: bool) {
    OPEN.store(enabled, Ordering::SeqCst);
}
