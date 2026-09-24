// lets the window pass for another app: the icon is pulled from that app's own
// exe (or its store package) at runtime, so nothing branded ships with sayvela
use serde::Serialize;
use tauri::image::Image;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Clone)]
pub struct DisguiseOption {
    pub id: &'static str,
    pub title: &'static str,
    // base64 png
    pub icon: String,
}

enum Source {
    // env var holding the base folder, then the path under it
    File(&'static str, &'static str),
    // app user model id of a packaged (store) app
    App(&'static str),
}

use Source::{App, File};

const PRESETS: &[(&str, &str, &[Source])] = &[
    ("explorer", "File Explorer", &[File("WINDIR", "explorer.exe")]),
    ("chrome", "Google Chrome", &[
        File("ProgramFiles", r"Google\Chrome\Application\chrome.exe"),
        File("ProgramFiles(x86)", r"Google\Chrome\Application\chrome.exe"),
        File("LOCALAPPDATA", r"Google\Chrome\Application\chrome.exe"),
    ]),
    ("edge", "Microsoft Edge", &[
        File("ProgramFiles(x86)", r"Microsoft\Edge\Application\msedge.exe"),
        File("ProgramFiles", r"Microsoft\Edge\Application\msedge.exe"),
    ]),
    ("firefox", "Mozilla Firefox", &[
        File("ProgramFiles", r"Mozilla Firefox\firefox.exe"),
        File("ProgramFiles(x86)", r"Mozilla Firefox\firefox.exe"),
    ]),
    ("terminal", "Windows Terminal", &[App("Microsoft.WindowsTerminal_8wekyb3d8bbwe!App")]),
    ("powershell", "Windows PowerShell", &[File("WINDIR", r"System32\WindowsPowerShell\v1.0\powershell.exe")]),
    ("cmd", "Command Prompt", &[File("WINDIR", r"System32\cmd.exe")]),
    ("notepad", "Notepad", &[
        App("Microsoft.WindowsNotepad_8wekyb3d8bbwe!App"),
        File("WINDIR", r"System32\notepad.exe"),
    ]),
    ("calculator", "Calculator", &[
        App("Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"),
        File("WINDIR", r"System32\calc.exe"),
    ]),
    ("settings", "Settings", &[
        App("windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel"),
        File("WINDIR", r"ImmersiveControlPanel\SystemSettings.exe"),
    ]),
    ("taskmgr", "Task Manager", &[File("WINDIR", r"System32\Taskmgr.exe")]),
    ("vscode", "Visual Studio Code", &[
        File("LOCALAPPDATA", r"Programs\Microsoft VS Code\Code.exe"),
        File("ProgramFiles", r"Microsoft VS Code\Code.exe"),
    ]),
    ("slack", "Slack", &[
        File("LOCALAPPDATA", r"slack\slack.exe"),
        App("91750D7E.Slack_8she8kybcnzg4!Slack"),
    ]),
    ("teams", "Microsoft Teams", &[App("MSTeams_8wekyb3d8bbwe!MSTeams")]),
    ("outlook", "Outlook", &[
        File("ProgramFiles", r"Microsoft Office\root\Office16\OUTLOOK.EXE"),
        App("Microsoft.OutlookForWindows_8wekyb3d8bbwe!Microsoft.OutlookforWindows"),
    ]),
    ("word", "Word", &[File("ProgramFiles", r"Microsoft Office\root\Office16\WINWORD.EXE")]),
    ("excel", "Excel", &[File("ProgramFiles", r"Microsoft Office\root\Office16\EXCEL.EXE")]),
    ("zoom", "Zoom Workplace", &[File("APPDATA", r"Zoom\bin\Zoom.exe")]),
];

const ICON_SIZE: i32 = 128;

// turns a source into a shell parsing name, or none when the app is not on this machine
fn parsing_name(source: &Source) -> Option<String> {
    match source {
        File(var, rel) => {
            let path = std::path::Path::new(&std::env::var(var).ok()?).join(rel);
            path.is_file().then(|| path.to_string_lossy().into_owned())
        }
        App(aumid) => Some(format!(r"shell:AppsFolder\{aumid}")),
    }
}

// straight rgba, ICON_SIZE square, as the shell draws it for that app
#[cfg(windows)]
fn shell_icon(name: &str) -> Option<Vec<u8>> {
    use windows::core::HSTRING;
    use windows::Win32::Foundation::{HWND, SIZE};
    use windows::Win32::Graphics::Gdi::{
        DeleteObject, GetDC, GetDIBits, ReleaseDC, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
        DIB_RGB_COLORS,
    };
    use windows::Win32::UI::Shell::{IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_ICONONLY};

    let size = ICON_SIZE;
    let mut bgra = vec![0u8; (size * size * 4) as usize];
    unsafe {
        let factory: IShellItemImageFactory =
            SHCreateItemFromParsingName(&HSTRING::from(name), None).ok()?;
        let bitmap = factory.GetImage(SIZE { cx: size, cy: size }, SIIGBF_ICONONLY).ok()?;
        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: size,
                // negative height asks for top-down rows
                biHeight: -size,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let dc = GetDC(HWND::default());
        let rows = GetDIBits(dc, bitmap, 0, size as u32, Some(bgra.as_mut_ptr().cast()), &mut info, DIB_RGB_COLORS);
        ReleaseDC(HWND::default(), dc);
        let _ = DeleteObject(bitmap);
        if rows == 0 {
            return None;
        }
    }

    // the shell hands back premultiplied bgra
    let opaque = bgra.chunks_exact(4).all(|px| px[3] == 0);
    for px in bgra.chunks_exact_mut(4) {
        px.swap(0, 2);
        if opaque {
            px[3] = 255;
        } else if px[3] > 0 && px[3] < 255 {
            let a = px[3] as u32;
            for c in &mut px[..3] {
                *c = ((*c as u32 * 255 + a / 2) / a).min(255) as u8;
            }
        }
    }
    Some(bgra)
}

#[cfg(not(windows))]
fn shell_icon(_name: &str) -> Option<Vec<u8>> {
    None
}

// the shell wants com on the calling thread
fn with_com<T>(f: impl FnOnce() -> T) -> T {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let out = f();
        CoUninitialize();
        out
    }
    #[cfg(not(windows))]
    f()
}

fn preset_icon(sources: &[Source]) -> Option<Vec<u8>> {
    sources.iter().filter_map(parsing_name).find_map(|n| shell_icon(&n))
}

fn encode_png(rgba: &[u8]) -> Option<String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let image = image::RgbaImage::from_raw(ICON_SIZE as u32, ICON_SIZE as u32, rgba.to_vec())?;
    let mut png = std::io::Cursor::new(Vec::new());
    image.write_to(&mut png, image::ImageFormat::Png).ok()?;
    Some(STANDARD.encode(png.into_inner()))
}

// tauri's set_icon only fills ICON_SMALL; the taskbar and alt+tab read ICON_BIG
// and fall back to the exe's own icon, so that slot is set here. none clears it
#[cfg(windows)]
fn set_big_icon(win: &tauri::WebviewWindow, rgba: Option<&[u8]>) {
    use std::sync::atomic::{AtomicIsize, Ordering};
    use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateIcon, DestroyIcon, SendMessageW, HICON, ICON_BIG, WM_SETICON,
    };
    // the icon set last, destroyed once replaced
    static CURRENT: AtomicIsize = AtomicIsize::new(0);

    let Ok(hwnd) = win.hwnd() else { return };
    let icon = rgba.and_then(|rgba| {
        let mut bgra = rgba.to_vec();
        bgra.chunks_exact_mut(4).for_each(|px| px.swap(0, 2));
        // the alpha channel carries the shape, so the and mask stays empty
        let mask = vec![0u8; (ICON_SIZE * ICON_SIZE / 8) as usize];
        unsafe { CreateIcon(HINSTANCE::default(), ICON_SIZE, ICON_SIZE, 1, 32, mask.as_ptr(), bgra.as_ptr()).ok() }
    });
    let raw = icon.map_or(0, |i| i.0 as isize);
    unsafe {
        SendMessageW(HWND(hwnd.0 as _), WM_SETICON, WPARAM(ICON_BIG as usize), LPARAM(raw));
        let old = CURRENT.swap(raw, Ordering::SeqCst);
        if old != 0 {
            let _ = DestroyIcon(HICON(old as _));
        }
    }
}

#[cfg(not(windows))]
fn set_big_icon(_win: &tauri::WebviewWindow, _rgba: Option<&[u8]>) {}

// presets whose app is installed here, each with its real icon
#[tauri::command]
pub async fn disguise_list() -> Result<Vec<DisguiseOption>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        with_com(|| {
            PRESETS
                .iter()
                .filter_map(|(id, title, sources)| {
                    let icon = encode_png(&preset_icon(sources)?)?;
                    Some(DisguiseOption { id, title, icon })
                })
                .collect()
        })
    })
    .await
    .map_err(|e| e.to_string())
}

// puts the chosen app's icon and title on the main window, or sayvela's own for
// none / an app missing here; returns what was applied so the tray can match
#[tauri::command]
pub async fn disguise_apply(app: AppHandle, id: Option<String>) -> Result<Option<DisguiseOption>, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    // calls can finish out of order; only the latest one touches the window
    static LATEST: AtomicU64 = AtomicU64::new(0);
    let ticket = LATEST.fetch_add(1, Ordering::SeqCst) + 1;

    let found = tauri::async_runtime::spawn_blocking(move || {
        let (id, title, sources) = PRESETS.iter().find(|(pid, _, _)| Some(*pid) == id.as_deref())?;
        with_com(|| preset_icon(sources)).map(|rgba| (*id, *title, rgba))
    })
    .await
    .map_err(|e| e.to_string())?;
    if LATEST.load(Ordering::SeqCst) != ticket {
        return Ok(None);
    }

    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    let Some((id, title, rgba)) = found else {
        win.set_title("Sayvela").map_err(|e| e.to_string())?;
        if let Some(icon) = app.default_window_icon() {
            win.set_icon(icon.clone()).map_err(|e| e.to_string())?;
        }
        set_big_icon(&win, None);
        return Ok(None);
    };

    win.set_title(title).map_err(|e| e.to_string())?;
    win.set_icon(Image::new_owned(rgba.clone(), ICON_SIZE as u32, ICON_SIZE as u32))
        .map_err(|e| e.to_string())?;
    set_big_icon(&win, Some(&rgba));
    Ok(encode_png(&rgba).map(|icon| DisguiseOption { id, title, icon }))
}
