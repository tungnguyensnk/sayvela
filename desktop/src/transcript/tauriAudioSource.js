import { listen } from "@tauri-apps/api/event";

// converts supported tauri payloads into an exact array buffer
function toAudioBuffer(payload) {
  const bytes = payload instanceof Uint8Array
    ? payload
    : payload instanceof ArrayBuffer
      ? new Uint8Array(payload)
      : Array.isArray(payload)
        ? new Uint8Array(payload)
        : null;
  if (!bytes) throw new TypeError("unsupported audio payload");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export class TauriAudioSource {
  constructor(eventName, active = true) {
    this.eventName = eventName;
    this.active = active;
    this.unlisten = null;
  }

  // gates audio delivery during websocket handoff
  setActive(active) {
    this.active = active;
  }

  // subscribes to tauri audio chunks and forwards exact pcm buffers
  async start({ onData, onError }) {
    if (this.unlisten) return;
    this.unlisten = await listen(this.eventName, ({ payload }) => {
      if (!this.active) return;
      try {
        onData(toAudioBuffer(payload));
      } catch (error) {
        onError(error);
      }
    });
  }

  // releases the tauri event subscription safely
  stop() {
    const unlisten = this.unlisten;
    this.unlisten = null;
    unlisten?.();
  }
}
