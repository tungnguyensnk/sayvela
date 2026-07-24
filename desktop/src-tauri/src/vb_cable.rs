use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

const DOWNLOAD_URL: &str = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip";
const ARCHIVE_NAME: &str = "VBCABLE_Driver_Pack45.zip";
const ARCHIVE_SIZE: u64 = 1_318_877;
const ARCHIVE_SHA256: &str = "b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb";
const SETUP_X86: &str = "VBCABLE_Setup.exe";
const SETUP_X64: &str = "VBCABLE_Setup_x64.exe";

// selects the official setup matching the current windows process architecture
fn setup_name() -> &'static str {
    if cfg!(target_arch = "x86") {
        SETUP_X86
    } else {
        SETUP_X64
    }
}

// validates the exact official package size and digest before extraction
fn validate_archive(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() as u64 != ARCHIVE_SIZE {
        return Err("VB-CABLE package size mismatch".to_string());
    }
    let digest = format!("{:x}", Sha256::digest(bytes));
    if digest != ARCHIVE_SHA256 {
        return Err("VB-CABLE package checksum mismatch".to_string());
    }
    Ok(())
}

// extracts archive entries safely under the assigned temporary directory
fn extract_archive(archive_path: &Path, output_dir: &Path) -> Result<(), String> {
    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let relative = entry
            .enclosed_name()
            .ok_or("unsafe VB-CABLE archive path")?;
        let output = output_dir.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&output).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut target = File::create(output).map_err(|e| e.to_string())?;
        io::copy(&mut entry, &mut target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(windows)]
// starts the verified architecture-specific setup through the windows uac prompt
fn run_elevated(setup_path: &Path) -> Result<(), String> {
    let escaped = setup_path
        .to_string_lossy()
        .replace('’', "’’")
        .replace('\'', "''");
    let script = format!(
        "$p = Start-Process -FilePath '{}' -Verb RunAs -Wait -PassThru; exit $p.ExitCode",
        escaped
    );
    let status = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("VB-CABLE setup was cancelled or failed".to_string())
    }
}

#[cfg(not(windows))]
// rejects driver installation outside windows
fn run_elevated(_setup_path: &Path) -> Result<(), String> {
    Err("VB-CABLE installation is only supported on windows".to_string())
}

// downloads the fixed official pack45 archive with a strict response size limit
async fn download_archive() -> Result<Vec<u8>, String> {
    let response = reqwest::Client::new()
        .get(DOWNLOAD_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    if response.content_length() != Some(ARCHIVE_SIZE) {
        return Err("VB-CABLE package content length mismatch".to_string());
    }
    let mut bytes = Vec::with_capacity(ARCHIVE_SIZE as usize);
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        if bytes.len() + chunk.len() > ARCHIVE_SIZE as usize {
            return Err("VB-CABLE package exceeds expected size".to_string());
        }
        bytes.extend_from_slice(&chunk);
    }
    validate_archive(&bytes)?;
    Ok(bytes)
}

#[tauri::command]
// downloads, validates, extracts and runs the official vb-cable setup with uac
pub async fn install_vb_cable() -> Result<(), String> {
    let bytes = download_archive().await?;
    let temp_dir: PathBuf =
        std::env::temp_dir().join(format!("sayvela-vb-cable-{}", Uuid::new_v4()));
    fs::create_dir(&temp_dir).map_err(|e| e.to_string())?;
    let result = (|| {
        let archive_path = temp_dir.join(ARCHIVE_NAME);
        let mut archive = File::create(&archive_path).map_err(|e| e.to_string())?;
        archive.write_all(&bytes).map_err(|e| e.to_string())?;
        drop(archive);
        extract_archive(&archive_path, &temp_dir)?;
        let setup_path = temp_dir.join(setup_name());
        if !setup_path.is_file() {
            return Err("VB-CABLE setup not found in package".to_string());
        }
        run_elevated(&setup_path)
    })();
    let _ = fs::remove_dir_all(temp_dir);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pins_official_pack45_metadata() {
        assert_eq!(
            DOWNLOAD_URL,
            "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip"
        );
        assert_eq!(ARCHIVE_NAME, "VBCABLE_Driver_Pack45.zip");
        assert_eq!(ARCHIVE_SIZE, 1_318_877);
        assert_eq!(
            setup_name(),
            if cfg!(target_arch = "x86") {
                SETUP_X86
            } else {
                SETUP_X64
            }
        );
    }

    #[test]
    fn rejects_invalid_archive_size() {
        assert_eq!(
            validate_archive(&[]).unwrap_err(),
            "VB-CABLE package size mismatch"
        );
    }
}
