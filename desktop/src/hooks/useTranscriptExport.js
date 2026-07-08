import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toPlainText, toSrt, toJson } from "../transcript/exportUtils";

export function useTranscriptExport(loopbackGroups, micGroups) {
  return useCallback(async (format) => {
    const allGroups = [...loopbackGroups, ...micGroups].sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    if (allGroups.length === 0) return;
    let content, ext;
    if (format === "srt") { content = toSrt(allGroups); ext = "srt"; }
    else if (format === "json") { content = toJson(allGroups); ext = "json"; }
    else { content = toPlainText(allGroups); ext = "txt"; }
    try { await invoke("save_file_dialog", { defaultName: `transcript.${ext}`, content }); } catch {}
  }, [loopbackGroups, micGroups]);
}
