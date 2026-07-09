const WS_PROTOCOL = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";

export function createSegmentWsClient({ connectTimeoutMs = 8000, flushTimeoutMs = 1500 } = {}) {
  let ws = null;
  let sessionId = null;
  let status = "idle";
  const queue = [];
  const pendingIds = new Set();
  const sentIds = new Set();

  const sendNow = (segment) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      queue.push(segment);
      return false;
    }
    pendingIds.add(segment.id);
    sentIds.add(segment.id);
    ws.send(JSON.stringify({ event: "segment", data: segment }));
    return true;
  };

  const drainQueue = () => {
    while (queue.length && ws?.readyState === WebSocket.OPEN) sendNow(queue.shift());
  };

  const waitForPending = () => new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (!pendingIds.size || Date.now() - started >= flushTimeoutMs) { resolve(); return; }
      setTimeout(tick, 50);
    };
    tick();
  });

  return {
    connect(sid, token, apiUrl) {
      sessionId = sid;
      status = "connecting";
      return new Promise((resolve, reject) => {
        const base = apiUrl.replace(/^https?/, WS_PROTOCOL).replace(/\/$/, "");
        ws = new WebSocket(`${base}/ws/sessions?token=${encodeURIComponent(token)}`);
        const timeout = setTimeout(() => {
          status = "failed";
          reject(new Error("ws connect timeout"));
          ws?.close();
        }, connectTimeoutMs);

        ws.onopen = () => ws.send(JSON.stringify({ event: "join", data: { sessionId: sid } }));
        ws.onmessage = (ev) => {
          const msg = safeJson(ev.data);
          if (!msg) return;
          if (msg.event === "joined") {
            clearTimeout(timeout);
            status = "open";
            drainQueue();
            resolve();
          } else if (msg.event === "error") {
            clearTimeout(timeout);
            status = "failed";
            reject(new Error(msg.data?.message ?? "ws error"));
          } else if (msg.event === "ack") {
            pendingIds.delete(msg.data?.id);
          }
        };
        ws.onerror = () => {
          clearTimeout(timeout);
          status = "failed";
          reject(new Error("ws error"));
        };
        ws.onclose = () => {
          status = status === "closing" ? "closed" : status;
        };
      });
    },
    send(segment) {
      return sendNow(segment);
    },
    async flush(segments = []) {
      segments.forEach((segment) => sendNow(segment));
      drainQueue();
      await waitForPending();
    },
    disconnect() {
      status = "closing";
      if (ws) ws.close(1000, "session ended");
      ws = null;
      sessionId = null;
      queue.length = 0;
      pendingIds.clear();
    },
    getSentIds() {
      return new Set(sentIds);
    },
    getStatus() {
      return status;
    },
    getSessionId() {
      return sessionId;
    },
  };
}

function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
