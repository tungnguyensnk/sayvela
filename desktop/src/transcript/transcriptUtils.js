// calculates the byte size of an audio chunk or buffer
export function byteSize(chunk) {
  if (!chunk) return 0;
  if (typeof chunk.length === "number") return chunk.length;
  if (typeof chunk.byteLength === "number") return chunk.byteLength;
  return 0;
}
