import { createSegmentWsClient } from "./segmentWsClient";

let currentClient = null;

// opens a ws connection and joins the session; resolves when joined or rejects on error/timeout
export function connect(sid, token, apiUrl) {
  currentClient = createSegmentWsClient();
  return currentClient.connect(sid, token, apiUrl);
}

// sends a single transcript segment over the websocket; no-op if not connected
export function sendSegment(segment) {
  currentClient?.send(segment);
}

// sends multiple segments then closes the connection gracefully
export async function flushAndDisconnect(segments = []) {
  if (!currentClient) return;
  await currentClient.flush(segments);
  currentClient.disconnect();
  currentClient = null;
}

// closes the websocket immediately without flushing
export function disconnect() {
  currentClient?.disconnect();
  currentClient = null;
}
