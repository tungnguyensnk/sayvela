const COMPLETE_MARKER_RE = /^[\s\S]*?/u;
const INCOMPLETE_MARKER_RE = /^[^\s]*/u;
const MARKER_RE = /[\s\S]*?|[^\s]*/gu;

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function cleanUrl(url) {
  try {
    const out = new URL(url);
    out.searchParams.delete("utm_source");
    return out.toString();
  } catch {
    return url || "";
  }
}

function uniqItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = cleanUrl(item.url) || `${item.title}:${item.attribution}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeItem(item) {
  const url = cleanUrl(item?.url || "");
  const attribution = item?.attribution || domainFromUrl(url);
  return {
    title: item?.title || attribution,
    url,
    attribution,
    snippet: item?.snippet || "",
  };
}

function normalizeRef(ref) {
  const items = Array.isArray(ref?.items) ? ref.items : [];
  const supporting = items.flatMap((item) => Array.isArray(item?.supporting_websites) ? item.supporting_websites : []);
  const normalizedItems = uniqItems([...items, ...supporting].map(normalizeItem));
  const first = normalizedItems[0];
  const extra = normalizedItems.slice(1).filter((item) => item.attribution !== first?.attribution).length;
  return {
    matchedText: ref?.matched_text || "",
    label: first?.attribution || ref?.alt || "source",
    count: extra + 1,
    items: normalizedItems,
  };
}

function validRefs(contentReferences) {
  return (Array.isArray(contentReferences) ? contentReferences : [])
    .filter((ref) => ref?.matched_text && !ref?.invalid && ["grouped_webpages", "webpage"].includes(ref?.type))
    .map(normalizeRef)
    .filter((ref) => ref.items.length);
}

function pushMarkdown(segments, text) {
  const cleanText = stripCitationMarkers(text);
  if (!cleanText) return;
  const last = segments[segments.length - 1];
  if (last?.type === "markdown") last.text += cleanText;
  else segments.push({ type: "markdown", text: cleanText });
}

function readInternalMarkerAt(text, index) {
  const rest = text.slice(index);
  return rest.match(COMPLETE_MARKER_RE)?.[0] || rest.match(INCOMPLETE_MARKER_RE)?.[0] || "";
}

export function stripCitationMarkers(text) {
  return String(text || "").replace(MARKER_RE, "");
}

export function parseCitations(text, contentReferences = []) {
  const raw = String(text || "");
  const refs = validRefs(contentReferences);
  if (!raw) return [];
  if (!refs.length) return [{ type: "markdown", text: stripCitationMarkers(raw) }].filter((s) => s.text);

  const segments = [];
  let i = 0;
  while (i < raw.length) {
    let found = null;
    for (const ref of refs) {
      if (ref.matchedText && raw.startsWith(ref.matchedText, i)) {
        found = ref;
        break;
      }
    }
    if (found) {
      const { matchedText, ...refData } = found;
      segments.push({ type: "citation", ref: refData });
      i += found.matchedText.length;
      continue;
    }
    const char = raw[i];
    if (char === "") {
      const marker = readInternalMarkerAt(raw, i);
      if (marker) {
        i += marker.length;
        continue;
      }
    }
    pushMarkdown(segments, char);
    i += char.length;
  }
  return segments.filter((s) => s.type !== "markdown" || s.text);
}
