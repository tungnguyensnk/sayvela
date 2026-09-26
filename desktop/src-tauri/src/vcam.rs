// delays the webcam by a few seconds and republishes it as a virtual camera, so
// the far side sees your mouth move while the translated voice plays and not
// before it. the picture runs live whenever there is nothing to wait for
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;

use serde::Serialize;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

// frames older than this are dropped, which also bounds the buffer memory
const MAX_DELAY_MS: u64 = 8_000;
// shipped with the app; installing copies it to a fixed path and registers it
const RESOURCE_DLL: &str = "resources/softcam/softcam.dll";

static DELAY_MS: AtomicU64 = AtomicU64::new(0);
// the webcam is opened at this fraction of the output size and scaled up, so
// a lower value looks softer and hides the mouth not matching the voice
static SCALE_PERCENT: AtomicU32 = AtomicU32::new(100);
static FPS: AtomicU32 = AtomicU32::new(30);
static ENGINE: Mutex<Option<Engine>> = Mutex::new(None);

struct Engine {
    stop: Arc<AtomicBool>,
    joins: Vec<thread::JoinHandle<()>>,
    device: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraDevice {
    pub name: String,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| e.into_inner())
}

fn stop_locked(engine: &mut Option<Engine>) {
    if let Some(old) = engine.take() {
        old.stop.store(true, Ordering::SeqCst);
        for join in old.joins {
            let _ = join.join();
        }
    }
}

#[cfg(windows)]
mod imp {
    use super::{lock, Engine, DELAY_MS, ENGINE, FPS, SCALE_PERCENT};
    use std::collections::VecDeque;
    use std::ffi::c_void;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::{self, Sender};
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::{Duration, Instant};

    use nokhwa::pixel_format::RgbFormat;
    use nokhwa::utils::{ApiBackend, CameraFormat, CameraIndex, FrameFormat, RequestedFormat, RequestedFormatType};
    use nokhwa::{Buffer, Camera};
    use windows::core::{IUnknown, GUID};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_MULTITHREADED,
    };

    // class id of the directshow filter inside softcam.dll
    const CLSID: GUID = GUID::from_u128(0xaef3b972_5fa5_4647_9571_358eb472bc9e);

    struct Frame {
        at: Instant,
        buffer: Buffer,
    }
    type Frames = Arc<Mutex<VecDeque<Frame>>>;

    // the registry points at this copy, so it must not move with app updates
    fn dll_path() -> Result<PathBuf, String> {
        let base = std::env::var_os("ProgramData").ok_or("ProgramData is not set")?;
        Ok(Path::new(&base).join("Sayvela").join("softcam").join("softcam.dll"))
    }

    pub fn list() -> Result<Vec<String>, String> {
        let cameras = nokhwa::query(ApiBackend::MediaFoundation).map_err(|e| e.to_string())?;
        Ok(cameras.into_iter().map(|c| c.human_name()).collect())
    }

    // registered means com can create the filter, which is what meeting apps do
    pub fn installed() -> bool {
        unsafe {
            let init = CoInitializeEx(None, COINIT_MULTITHREADED).is_ok();
            let ok = CoCreateInstance::<_, IUnknown>(&CLSID, None, CLSCTX_INPROC_SERVER).is_ok();
            if init {
                CoUninitialize();
            }
            ok
        }
    }

    // the app runs elevated, so copying under programdata and registering
    // needs no extra prompt
    pub fn install(source: &Path) -> Result<(), String> {
        let target = dll_path()?;
        let bytes = std::fs::read(source).map_err(|e| format!("camera driver missing from app: {e}"))?;
        // a copy a meeting app has loaded cannot be overwritten, and need not be
        if std::fs::read(&target).ok().as_deref() != Some(bytes.as_slice()) {
            if let Some(dir) = target.parent() {
                std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
            }
            std::fs::write(&target, &bytes).map_err(|e| e.to_string())?;
        }
        let status = std::process::Command::new("regsvr32")
            .arg("/s")
            .arg(&target)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("camera driver registration failed ({status})"))
        }
    }

    type Create = unsafe extern "C" fn(i32, i32, f32) -> *mut c_void;
    type Delete = unsafe extern "C" fn(*mut c_void);
    type Send = unsafe extern "C" fn(*mut c_void, *const c_void);
    type Connected = unsafe extern "C" fn(*mut c_void) -> bool;

    // the sender half of softcam, loaded from the same dll meeting apps use so
    // both sides always agree on the shared memory layout
    struct Softcam {
        create: Create,
        delete: Delete,
        send: Send,
        connected: Connected,
        _lib: libloading::Library,
    }

    impl Softcam {
        fn load(path: &Path) -> Result<Self, String> {
            unsafe {
                let lib = libloading::Library::new(path).map_err(|e| e.to_string())?;
                let sym = |name: &[u8]| lib.get::<*const c_void>(name).map(|s| *s).map_err(|e| e.to_string());
                let create = std::mem::transmute::<*const c_void, Create>(sym(b"scCreateCamera\0")?);
                let delete = std::mem::transmute::<*const c_void, Delete>(sym(b"scDeleteCamera\0")?);
                let send = std::mem::transmute::<*const c_void, Send>(sym(b"scSendFrame\0")?);
                let connected = std::mem::transmute::<*const c_void, Connected>(sym(b"scIsConnected\0")?);
                Ok(Self { create, delete, send, connected, _lib: lib })
            }
        }
    }

    // the size nearest the wanted fraction of 720p first, then mjpeg because it
    // keeps the delay buffer small, then the rate nearest 30. the virtual
    // camera needs both sides to be multiples of four, and a capture must have
    // the shape of the output or the picture would be stretched
    fn pick(formats: &[CameraFormat], percent: u32, like: Option<&CameraFormat>) -> Option<CameraFormat> {
        let (want_w, want_h) = ((1280 * percent / 100) as i64, (720 * percent / 100) as i64);
        let rank = |f: &CameraFormat| {
            let kind = match f.format() {
                FrameFormat::MJPEG => 0,
                FrameFormat::NV12 => 1,
                FrameFormat::YUYV => 2,
                _ => 3,
            };
            let size = (f.width() as i64 - want_w).abs() + (f.height() as i64 - want_h).abs();
            (size, kind, (f.frame_rate() as i64 - 30).abs())
        };
        let usable: Vec<&CameraFormat> = formats.iter().filter(|f| f.width() % 4 == 0 && f.height() % 4 == 0).collect();
        let same_shape: Vec<&CameraFormat> = usable
            .iter()
            .copied()
            .filter(|f| like.is_none_or(|l| f.width() * l.height() == f.height() * l.width()))
            .collect();
        let pool = if same_shape.is_empty() { usable } else { same_shape };
        pool.into_iter().min_by_key(|f| rank(f)).copied()
    }

    fn find_index(name: &str) -> Result<CameraIndex, String> {
        nokhwa::query(ApiBackend::MediaFoundation)
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|c| c.human_name() == name)
            .map(|c| c.index().clone())
            .ok_or_else(|| format!("camera not found: {name}"))
    }

    fn list_formats(index: &CameraIndex) -> Result<Vec<CameraFormat>, String> {
        let any = RequestedFormat::new::<RgbFormat>(RequestedFormatType::None);
        let mut camera = Camera::new(index.clone(), any).map_err(|e| e.to_string())?;
        camera.compatible_camera_formats().map_err(|e| e.to_string())
    }

    // opens the webcam at the format nearest the wanted fraction of the output
    // size. nokhwa's own "closest" match only works when the exact size exists,
    // so the format is chosen here from what the camera reports; the format the
    // backend reads back is not trusted either, it has reported a frame rate of
    // 1 for a stream that runs at 30
    fn open_camera(index: &CameraIndex, formats: &[CameraFormat], percent: u32, output: &CameraFormat) -> Result<Camera, String> {
        let best = pick(formats, percent, Some(output)).ok_or("camera has no usable format")?;
        let exact = RequestedFormat::new::<RgbFormat>(RequestedFormatType::Exact(best));
        let mut camera = Camera::new(index.clone(), exact).map_err(|e| e.to_string())?;
        camera.open_stream().map_err(|e| e.to_string())?;
        log::info!("[vcam] webcam opened at {best} for {percent}%");
        Ok(camera)
    }

    // reads the webcam into the buffer, which keeps a little more than the
    // current delay: raw formats weigh megabytes a frame, so holding the
    // longest possible delay at all times would cost hundreds of megabytes.
    // the output size reported first is the best the webcam offers; when the
    // wanted fraction changes and holds, the webcam is reopened at that size
    fn capture(name: String, stop: Arc<AtomicBool>, frames: Frames, ready: Sender<Result<CameraFormat, String>>) {
        let prepared = find_index(&name).and_then(|index| {
            let formats = list_formats(&index)?;
            log::debug!("[vcam] {name} offers {formats:?}");
            let output = pick(&formats, 100, None).ok_or("camera has no usable format")?;
            Ok((index, formats, output))
        });
        let (index, formats, output) = match prepared {
            Ok(prepared) => prepared,
            Err(e) => {
                let _ = ready.send(Err(e));
                return;
            }
        };
        let mut ready = Some(ready);
        while !stop.load(Ordering::SeqCst) {
            let percent = SCALE_PERCENT.load(Ordering::SeqCst);
            let mut camera = match open_camera(&index, &formats, percent, &output) {
                Ok(camera) => camera,
                Err(e) => {
                    if let Some(ready) = ready.take() {
                        let _ = ready.send(Err(e));
                        return;
                    }
                    log::warn!("[vcam] reopen failed: {e}");
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };
            if let Some(ready) = ready.take() {
                let _ = ready.send(Ok(output));
            }
            let mut changed_at: Option<Instant> = None;
            while !stop.load(Ordering::SeqCst) {
                // a slider drag passes many values; only one that holds counts
                if SCALE_PERCENT.load(Ordering::SeqCst) == percent {
                    changed_at = None;
                } else if changed_at.get_or_insert_with(Instant::now).elapsed() > Duration::from_millis(500) {
                    break;
                }
                let keep = Duration::from_millis(DELAY_MS.load(Ordering::SeqCst) + 1_000);
                let buffer = match camera.frame() {
                    Ok(buffer) => buffer,
                    Err(e) => {
                        log::warn!("[vcam] capture stopped: {e}");
                        let _ = camera.stop_stream();
                        return;
                    }
                };
                let now = Instant::now();
                let mut queue = lock(&frames);
                queue.push_back(Frame { at: now, buffer });
                while queue.front().is_some_and(|f| now.duration_since(f.at) > keep) {
                    queue.pop_front();
                }
            }
            let _ = camera.stop_stream();
        }
    }

    // leaves the frame in `out` as tightly packed bgr rows, top row first, at
    // the virtual camera size, the layout softcam takes. a smaller capture is
    // scaled up, which is what makes the picture soft. the vec is reused
    fn decode(buffer: &Buffer, width: u32, height: u32, out: &mut Vec<u8>) -> Result<(), String> {
        let res = buffer.resolution();
        let (w, h) = (res.width(), res.height());
        if buffer.source_frame_format() == FrameFormat::MJPEG {
            let image = image::load_from_memory_with_format(buffer.buffer(), image::ImageFormat::Jpeg)
                .map_err(|e| e.to_string())?
                .into_rgb8();
            if image.width() != w || image.height() != h {
                return Err(format!("frame is {}x{}, expected {w}x{h}", image.width(), image.height()));
            }
            *out = image.into_raw();
        } else {
            out.resize((w * h * 3) as usize, 0);
            buffer.decode_image_to_buffer::<RgbFormat>(out).map_err(|e| e.to_string())?;
        }
        // swapped in place with a plain loop, and before scaling so the loop
        // touches the small picture: iterator chains crawl in unoptimized builds
        let len = out.len();
        let mut i = 0;
        while i + 2 < len {
            out.swap(i, i + 2);
            i += 3;
        }
        if (w, h) != (width, height) {
            // resize_exact is not generic, so it runs inside the optimized image
            // crate rather than being instantiated here at opt-level zero
            let small = image::RgbImage::from_raw(w, h, std::mem::take(out)).ok_or("frame size mismatch")?;
            *out = image::DynamicImage::ImageRgb8(small)
                .resize_exact(width, height, image::imageops::FilterType::Triangle)
                .into_rgb8()
                .into_raw();
        }
        Ok(())
    }

    // the frame to show at `target`: the newest one captured at or before it,
    // or the oldest while the buffer has not yet reached that far back. frames
    // before the chosen one are done with and dropped
    fn due(queue: &mut VecDeque<Frame>, target: Instant) -> Option<(Instant, Buffer)> {
        while queue.len() > 1 && queue[1].at <= target {
            queue.pop_front();
        }
        queue.front().map(|f| (f.at, f.buffer.clone()))
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use nokhwa::utils::Resolution;

        fn frames(base: Instant, offsets_ms: &[u64]) -> VecDeque<Frame> {
            offsets_ms
                .iter()
                .map(|ms| Frame {
                    at: base + Duration::from_millis(*ms),
                    buffer: Buffer::new(Resolution::new(4, 4), &[0; 24], FrameFormat::NV12),
                })
                .collect()
        }

        #[test]
        fn shows_the_frame_due_at_the_target_and_drops_older_ones() {
            let base = Instant::now();
            let mut queue = frames(base, &[0, 100, 200]);
            let (at, _) = due(&mut queue, base + Duration::from_millis(150)).unwrap();
            assert_eq!(at, base + Duration::from_millis(100));
            assert_eq!(queue.len(), 2);
        }

        #[test]
        fn holds_the_oldest_frame_while_the_buffer_fills() {
            let base = Instant::now();
            let mut queue = frames(base, &[500, 600]);
            let (at, _) = due(&mut queue, base).unwrap();
            assert_eq!(at, base + Duration::from_millis(500));
            assert_eq!(queue.len(), 2);
        }

        #[test]
        fn skips_to_the_newest_frame_when_the_delay_drops() {
            let base = Instant::now();
            let mut queue = frames(base, &[0, 100, 200]);
            let (at, _) = due(&mut queue, base + Duration::from_secs(5)).unwrap();
            assert_eq!(at, base + Duration::from_millis(200));
            assert_eq!(queue.len(), 1);
        }

        #[test]
        fn picks_the_shape_of_the_output_and_the_nearest_size() {
            let f = |w, h, k| CameraFormat::new(Resolution::new(w, h), k, 30);
            let list = [f(1280, 720, FrameFormat::NV12), f(320, 240, FrameFormat::NV12), f(320, 180, FrameFormat::NV12), f(640, 360, FrameFormat::YUYV)];
            let output = pick(&list, 100, None).unwrap();
            assert_eq!((output.width(), output.height()), (1280, 720));
            let small = pick(&list, 35, Some(&output)).unwrap();
            assert_eq!((small.width(), small.height()), (320, 180));
            let half = pick(&list, 50, Some(&output)).unwrap();
            assert_eq!((half.width(), half.height()), (640, 360));
        }
    }

    // feeds the virtual camera with the frame that is exactly the current delay
    // old. a growing delay holds the picture still until time catches up, a
    // shrinking one skips ahead; while the buffer first fills, the oldest frame
    // stands in
    fn output(dll: PathBuf, format: CameraFormat, stop: Arc<AtomicBool>, frames: Frames, ready: Sender<Result<(), String>>) {
        let softcam = match Softcam::load(&dll) {
            Ok(softcam) => softcam,
            Err(e) => {
                let _ = ready.send(Err(format!("camera driver failed to load: {e}")));
                return;
            }
        };
        let (width, height) = (format.width(), format.height());
        let camera = unsafe { (softcam.create)(width as i32, height as i32, format.frame_rate() as f32) };
        if camera.is_null() {
            let _ = ready.send(Err("virtual camera is already in use".to_string()));
            return;
        }
        let _ = ready.send(Ok(()));

        let mut shown: Option<Instant> = None;
        let mut frame: Vec<u8> = Vec::new();
        let mut next_send = Instant::now();
        while !stop.load(Ordering::SeqCst) {
            // nobody is watching, so decoding would only burn cpu
            if !unsafe { (softcam.connected)(camera) } {
                thread::sleep(Duration::from_millis(50));
                next_send = Instant::now();
                continue;
            }
            // frames go out at the chosen rate; the camera rate is the ceiling.
            // the frame is picked for the moment it will be sent and prepared
            // before that moment, so decoding does not stretch the cadence
            let interval = Duration::from_secs_f32(1.0 / FPS.load(Ordering::SeqCst).clamp(1, 60) as f32);
            let delay = Duration::from_millis(DELAY_MS.load(Ordering::SeqCst));
            let target = next_send.checked_sub(delay).unwrap_or(next_send);
            let picked = due(&mut lock(&frames), target);
            let Some((at, buffer)) = picked else {
                thread::sleep(Duration::from_millis(10));
                continue;
            };
            if shown != Some(at) {
                if let Err(e) = decode(&buffer, width, height, &mut frame) {
                    log::warn!("[vcam] frame dropped: {e}");
                    lock(&frames).pop_front();
                    continue;
                }
                shown = Some(at);
            }
            let now = Instant::now();
            if now < next_send {
                thread::sleep(next_send - now);
            }
            unsafe { (softcam.send)(camera, frame.as_ptr() as *const c_void) };
            // when preparing took longer than the interval, the next frame goes
            // out as soon as it is ready instead of piling up lateness
            next_send = std::cmp::max(next_send + interval, Instant::now());
        }
        unsafe { (softcam.delete)(camera) };
    }

    // opens the webcam and the virtual camera; calling again with the same
    // device while both still run is a no-op
    pub fn start(device: String) -> Result<(), String> {
        let mut engine = lock(&ENGINE);
        if engine
            .as_ref()
            .is_some_and(|e| e.device == device && e.joins.iter().all(|j| !j.is_finished()))
        {
            return Ok(());
        }
        super::stop_locked(&mut engine);
        let dll = dll_path()?;
        if !dll.is_file() {
            return Err("camera driver is not installed".to_string());
        }

        let stop = Arc::new(AtomicBool::new(false));
        let frames = Frames::default();
        let (tx, rx) = mpsc::channel();
        let capture = {
            let (stop, frames, device) = (stop.clone(), frames.clone(), device.clone());
            thread::spawn(move || capture(device, stop, frames, tx))
        };
        let format = match rx.recv() {
            Ok(Ok(format)) => format,
            Ok(Err(e)) => {
                let _ = capture.join();
                return Err(e);
            }
            Err(_) => {
                let _ = capture.join();
                return Err("camera thread ended".to_string());
            }
        };
        let (tx, rx) = mpsc::channel();
        let output = {
            let (stop, frames) = (stop.clone(), frames.clone());
            thread::spawn(move || output(dll, format, stop, frames, tx))
        };
        if let Err(e) = rx.recv().unwrap_or_else(|_| Err("virtual camera thread ended".to_string())) {
            stop.store(true, Ordering::SeqCst);
            let _ = capture.join();
            let _ = output.join();
            return Err(e);
        }
        *engine = Some(Engine { stop, joins: vec![capture, output], device });
        Ok(())
    }
}

#[cfg(not(windows))]
mod imp {
    const UNSUPPORTED: &str = "only supported on windows";
    pub fn list() -> Result<Vec<String>, String> {
        Err(UNSUPPORTED.to_string())
    }
    pub fn installed() -> bool {
        false
    }
    pub fn install(_source: &std::path::Path) -> Result<(), String> {
        Err(UNSUPPORTED.to_string())
    }
    pub fn start(_device: String) -> Result<(), String> {
        Err(UNSUPPORTED.to_string())
    }
}

// device work blocks, so it stays off the main thread
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn vcam_list_devices() -> Result<Vec<CameraDevice>, String> {
    blocking(|| imp::list().map(|names| names.into_iter().map(|name| CameraDevice { name }).collect())).await
}

#[tauri::command]
pub async fn vcam_installed() -> Result<bool, String> {
    blocking(|| Ok(imp::installed())).await
}

#[tauri::command]
pub async fn vcam_install(app: AppHandle) -> Result<(), String> {
    let source = app
        .path()
        .resolve(RESOURCE_DLL, BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    blocking(move || imp::install(&source)).await
}

#[tauri::command]
pub async fn vcam_start(device_name: String) -> Result<(), String> {
    blocking(move || imp::start(device_name)).await
}

#[tauri::command]
pub async fn vcam_stop() -> Result<(), String> {
    blocking(|| {
        stop_locked(&mut lock(&ENGINE));
        Ok(())
    })
    .await
}

// how far behind live the picture runs, how sharp it is and how often it
// updates; instant, the output thread reads them on every frame
#[tauri::command]
pub fn vcam_set_output(delay_ms: u64, scale_percent: u32, fps: u32) {
    log::debug!("[vcam] output {delay_ms}ms behind, {scale_percent}%, {fps}fps");
    DELAY_MS.store(delay_ms.min(MAX_DELAY_MS), Ordering::SeqCst);
    SCALE_PERCENT.store(scale_percent.clamp(10, 100), Ordering::SeqCst);
    FPS.store(fps.clamp(1, 60), Ordering::SeqCst);
}
