// export utilities — converts transcript groups to TXT, SRT, or JSON format

// formats a millisecond value to SRT timestamp (HH:MM:SS,mmm)
function msToSrt(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const millis = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

// converts transcript groups to plain text; includes speaker labels and translations
export function toPlainText(groups) {
  return groups
    .map((g) => {
      const speaker = g.speaker ? `[${g.speaker}] ` : "";
      const lines = [speaker + (g.finalText || g.text || "")];
      if (g.translatedText) lines.push(`  → ${g.translatedText}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

// converts transcript groups to SRT subtitle format with timestamps
export function toSrt(groups) {
  return groups
    .map((g, i) => {
      const start = msToSrt(g.startMs ?? 0);
      const end = msToSrt(g.endMs ?? (g.startMs ?? 0) + 3000);
      const speaker = g.speaker ? `[${g.speaker}] ` : "";
      const text = speaker + (g.finalText || g.text || "");
      return `${i + 1}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n");
}

// converts transcript groups to a JSON array suitable for storage
export function toJson(groups) {
  return JSON.stringify(
    groups.map((g) => ({
      speaker: g.speaker ?? null,
      text: g.finalText || g.text || "",
      translatedText: g.translatedText ?? null,
      startMs: g.startMs ?? 0,
      endMs: g.endMs ?? 0,
      language: g.language ?? null,
    })),
    null,
    2,
  );
}

// maps groups from transcript state into flat segment objects for api upload; includes translation metadata
export function groupsToSegments(groups) {
  return groups
    .filter((g) => g.finalText || g.text)
    .map((g) => ({
      id: g.id || crypto.randomUUID(),
      speaker: g.speaker ?? undefined,
      text: g.finalText || g.text || "",
      startMs: g.startMs ?? 0,
      endMs: g.endMs ?? 0,
      language: g.language ?? undefined,
      translationStatus: g.translationStatus ?? undefined,
      originId: g.originId ?? undefined,
    }));
}
