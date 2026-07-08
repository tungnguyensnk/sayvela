// manages a websocket connection to the backend for streaming transcript segments in real-time
const WS_PROTOCOL = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";

let ws = null;
let sessionId = null;
const pendingIds = new Set();

const log = (...args) => console.log("[segmentWs]", ...args);
const warn = (...args) => console.warn("[segmentWs]", ...args);

// opens a ws connection and joins the session; resolves when joined or rejects on error/timeout
export function connect(sid, token, apiUrl) {
  sessionId = sid;
  pendingIds.clear();
  return new Promise((resolve, reject) => {
    const base = apiUrl.replace(/^https?/, WS_PROTOCOL).replace(/\/$/, "");
    const url = `${base}/ws/sessions?token=${encodeURIComponent(token)}`;
    log(`connecting to ${url.replace(/token=[^&]+/, "token=***")}`);
    ws = new WebSocket(url);

    const timeout = setTimeout(() => {
      warn("connect timeout");
      reject(new Error("ws connect timeout"));
      ws?.close();
    }, 8000);

    ws.onopen = () => {
      log("opened, sending join for session", sid);
      ws.send(JSON.stringify({ event: "join", data: { sessionId: sid } }));
    };

    ws.onmessage = (ev) => {
      const msg = safeJson(ev.data);
      log("message received:", msg?.event, msg?.data);
      if (!msg) return;
      if (msg.event === "joined") {
        clearTimeout(timeout);
        log("joined session", sid);
        resolve();
      } else if (msg.event === "error") {
        clearTimeout(timeout);
        warn("server error:", msg.data?.message);
        reject(new Error(msg.data?.message ?? "ws error"));
      } else if (msg.event === "ack") {
        pendingIds.delete(msg.data?.id);
      }
    };

    ws.onerror = (err) => {
      warn("ws error:", err);
      clearTimeout(timeout);
      reject(new Error("ws error"));
    };

    ws.onclose = (ev) => {
      log(`ws closed: code=${ev.code} reason=${ev.reason}`);
    };
  });
}

// sends a single transcript segment over the websocket; no-op if not connected
export function sendSegment(segment) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    warn(`sendSegment skipped (readyState=${ws?.readyState}): id=${segment?.id}`);
    return;
  }
  log(`sending segment id=${segment.id} source=${segment.source} text="${String(segment.text || "").slice(0, 30)}"`);
  pendingIds.add(segment.id);
  ws.send(JSON.stringify({ event: "segment", data: segment }));
}

// sends multiple segments then closes the connection gracefully
export async function flushAndDisconnect(segments = []) {
  log(`flushAndDisconnect: ${segments.length} segments`);
  if (!ws) { warn("flushAndDisconnect: no ws"); return; }
  for (const seg of segments) {
    sendSegment(seg);
  }
  // wait briefly for acks before closing
  await new Promise((r) => setTimeout(r, 600));
  ws.close(1000, "session ended");
  ws = null;
  sessionId = null;
}

// closes the websocket immediately without flushing
export function disconnect() {
  log("disconnect called");
  if (ws) {
    ws.close(1000, "session ended");
    ws = null;
  }
  sessionId = null;
}

function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
