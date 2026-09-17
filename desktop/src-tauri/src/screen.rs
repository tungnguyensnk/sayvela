use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::codecs::jpeg::JpegEncoder;
use image::{imageops::FilterType, ExtendedColorType, RgbImage};
use serde::Serialize;
use tauri::Manager;
use xcap::Monitor;

const JPEG_QUALITY: u8 = 60;

#[derive(Debug, Serialize, Clone)]
pub struct MonitorInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub is_primary: bool,
}

const OVERLAY_LABEL: &str = "monitor-overlay";

#[derive(Debug, Serialize, Clone)]
pub struct Capture {
    pub data_url: String,
    pub hash: String,
    pub width: u32,
    pub height: u32,
}

// fnv-1a over the downscaled pixels so identical screens can be skipped
fn fnv1a(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in bytes {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x100_0000_01b3);
    }
    format!("{:016x}", hash)
}

fn monitor_info(m: &Monitor) -> Option<MonitorInfo> {
    Some(MonitorInfo {
        id: m.id().ok()?.to_string(),
        name: m.name().ok()?,
        width: m.width().ok()?,
        height: m.height().ok()?,
        x: m.x().ok()?,
        y: m.y().ok()?,
        is_primary: m.is_primary().unwrap_or(false),
    })
}

fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    Ok(monitors.iter().filter_map(monitor_info).collect())
}

// encodes rgb pixels as a base64 jpeg data url plus a content hash
fn encode_jpeg(image: &RgbImage) -> Result<Capture, String> {
    let mut jpeg: Vec<u8> = Vec::new();
    JpegEncoder::new_with_quality(&mut jpeg, JPEG_QUALITY)
        .encode(
            image.as_raw(),
            image.width(),
            image.height(),
            ExtendedColorType::Rgb8,
        )
        .map_err(|e| e.to_string())?;
    Ok(Capture {
        data_url: format!("data:image/jpeg;base64,{}", STANDARD.encode(&jpeg)),
        hash: fnv1a(image.as_raw()),
        width: image.width(),
        height: image.height(),
    })
}

fn capture(monitor_id: Option<String>, max_width: u32) -> Result<Capture, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("no monitor found".to_string());
    }
    let wanted = monitor_id.unwrap_or_default();
    let monitor = monitors
        .iter()
        .find(|m| !wanted.is_empty() && m.id().map(|id| id.to_string()).ok() == Some(wanted.clone()))
        .or_else(|| monitors.iter().find(|m| m.is_primary().unwrap_or(false)))
        .unwrap_or(&monitors[0]);

    let shot = monitor.capture_image().map_err(|e| e.to_string())?;
    let (width, height) = (shot.width(), shot.height());
    let rgba = image::RgbaImage::from_raw(width, height, shot.into_raw())
        .ok_or_else(|| "invalid capture buffer".to_string())?;
    let rgb = image::DynamicImage::ImageRgba8(rgba).to_rgb8();
    let scaled = if width > max_width && max_width > 0 {
        let height = (height as f64 * max_width as f64 / width as f64).round() as u32;
        image::imageops::resize(&rgb, max_width, height.max(1), FilterType::Triangle)
    } else {
        rgb
    };
    encode_jpeg(&scaled)
}

#[tauri::command]
pub async fn screen_list_monitors() -> Result<Vec<MonitorInfo>, String> {
    tauri::async_runtime::spawn_blocking(list_monitors)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn screen_capture(
    monitor_id: Option<String>,
    max_width: Option<u32>,
) -> Result<Capture, String> {
    let max_width = max_width.unwrap_or(1280);
    tauri::async_runtime::spawn_blocking(move || capture(monitor_id, max_width))
        .await
        .map_err(|e| e.to_string())?
}

// draws a red frame over one monitor so the user can tell which is which;
// passing no id takes the frame away
#[tauri::command]
pub async fn screen_highlight(app: tauri::AppHandle, monitor_id: Option<String>) -> Result<(), String> {
    use tauri::{PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

    let wanted = monitor_id.unwrap_or_default();
    if wanted.is_empty() {
        // hiding keeps the window around so the next hover shows up instantly
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            let _ = window.hide();
        }
        return Ok(());
    }

    let monitors = tauri::async_runtime::spawn_blocking(list_monitors)
        .await
        .map_err(|e| e.to_string())??;
    let target = monitors
        .into_iter()
        .find(|m| m.id == wanted)
        .ok_or_else(|| "monitor not found".to_string())?;

    let window = match app.get_webview_window(OVERLAY_LABEL) {
        Some(window) => window,
        None => WebviewWindowBuilder::new(
            &app,
            OVERLAY_LABEL,
            WebviewUrl::App("monitor-overlay.html".into()),
        )
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .resizable(false)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?,
    };

    let _ = window.set_ignore_cursor_events(true);
    window
        .set_position(PhysicalPosition::new(target.x, target.y))
        .map_err(|e| e.to_string())?;
    window
        .set_size(PhysicalSize::new(target.width, target.height))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    let _ = window.set_always_on_top(true);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_jpeg_data_url() {
        let image = RgbImage::from_pixel(8, 4, image::Rgb([10, 20, 30]));
        let out = encode_jpeg(&image).unwrap();
        assert!(out.data_url.starts_with("data:image/jpeg;base64,"));
        assert_eq!((out.width, out.height), (8, 4));
        assert_eq!(out.hash.len(), 16);
    }

    #[test]
    fn hash_changes_with_pixels() {
        let a = encode_jpeg(&RgbImage::from_pixel(4, 4, image::Rgb([0, 0, 0]))).unwrap();
        let b = encode_jpeg(&RgbImage::from_pixel(4, 4, image::Rgb([1, 0, 0]))).unwrap();
        assert_ne!(a.hash, b.hash);
    }
}
