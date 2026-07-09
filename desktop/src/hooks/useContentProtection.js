import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useContentProtection(enabled, updateSetting) {
  useEffect(() => {
    updateSetting({ contentProtectionEnabled: enabled });
    invoke("set_main_window_content_protected", { enabled }).catch(() => {});
  }, [enabled, updateSetting]);
}
