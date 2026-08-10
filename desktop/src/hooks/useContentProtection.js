import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// applies the stored preference to the window; persisting is owned by the
// settings checkbox, so writing back here would save defaults before load
export function useContentProtection(enabled) {
  useEffect(() => {
    invoke("set_main_window_content_protected", { enabled }).catch(() => {});
  }, [enabled]);
}
