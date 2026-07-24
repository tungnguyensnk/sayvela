const SERVICE: &str = "com.sayvela.app";
const ACCOUNT: &str = "soniox-api-key";

// creates the platform credential entry used by soniox tts
fn entry() -> keyring::Result<keyring::Entry> {
    keyring::Entry::new(SERVICE, ACCOUNT)
}

// stores a non-empty api key in the platform credential manager
pub fn set_api_key(api_key: &str) -> Result<(), String> {
    let value = api_key.trim();
    if value.is_empty() {
        return Err("API key is required".to_string());
    }
    entry()
        .map_err(|_| "credential store unavailable".to_string())?
        .set_password(value)
        .map_err(|_| "failed to store API key".to_string())
}

// reads the api key only for internal native requests
pub(crate) fn get_api_key() -> Result<String, String> {
    entry()
        .map_err(|_| "credential store unavailable".to_string())?
        .get_password()
        .map_err(|_| "Soniox API key is not configured".to_string())
}

// checks whether an api key exists without returning it
pub fn has_api_key() -> Result<bool, String> {
    match entry()
        .map_err(|_| "credential store unavailable".to_string())?
        .get_password()
    {
        Ok(value) => Ok(!value.is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("failed to access API key".to_string()),
    }
}

// deletes the api key and treats an absent entry as success
pub fn delete_api_key() -> Result<(), String> {
    match entry() {
        Ok(entry) => match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("failed to delete API key".to_string()),
        },
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("failed to delete API key".to_string()),
    }
}

#[tauri::command]
pub fn soniox_set_api_key(api_key: String) -> Result<(), String> {
    set_api_key(&api_key)
}

#[tauri::command]
pub fn soniox_has_api_key() -> Result<bool, String> {
    has_api_key()
}

#[tauri::command]
pub fn soniox_delete_api_key() -> Result<(), String> {
    delete_api_key()
}
