import { invoke } from "@tauri-apps/api/core";

let cached = null;

// installed apps the window can pass for, each { id, title, icon (base64 png) };
// icons come out of the shell once per run, so the list is shared
export function listDisguises() {
  cached ??= invoke("disguise_list").catch(() => {
    cached = null;
    return [];
  });
  return cached;
}

export function iconBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
