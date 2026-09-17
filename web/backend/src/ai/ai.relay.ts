export type ToolCall = { id: string; name: string; args: string };
export type AssistEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; args: Record<string, unknown> };

type DeltaToolCall = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};

// merges streamed tool_call fragments into the accumulator keyed by index
export function mergeToolCalls(
  acc: Map<number, ToolCall>,
  deltas: DeltaToolCall[],
) {
  deltas.forEach((delta, i) => {
    const index = delta.index ?? i;
    const current = acc.get(index) ?? { id: '', name: '', args: '' };
    acc.set(index, {
      id: delta.id || current.id,
      name: delta.function?.name || current.name,
      args: current.args + (delta.function?.arguments ?? ''),
    });
  });
}

export function parseToolArgs(call: ToolCall): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(call.args || '{}');
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

type Chunk = {
  choices?: {
    delta?: { content?: string; tool_calls?: DeltaToolCall[] };
  }[];
};

// consumes one upstream sse stream, emitting text deltas and completed tool calls
export async function relayRound(
  stream: ReadableStream<Uint8Array>,
  emit: (event: AssistEvent) => void,
  skip: (name: string) => boolean,
): Promise<ToolCall[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const acc = new Map<number, ToolCall>();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    for (; nl >= 0; nl = buffer.indexOf('\n')) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      if (json === '[DONE]') continue;
      let chunk: Chunk;
      try {
        chunk = JSON.parse(json) as Chunk;
      } catch {
        continue;
      }
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) emit({ type: 'text', delta: delta.content });
      if (delta?.tool_calls?.length) mergeToolCalls(acc, delta.tool_calls);
    }
  }
  const calls = [...acc.values()].filter((c) => c.name);
  for (const call of calls) {
    if (skip(call.name)) continue;
    const args = parseToolArgs(call);
    if (args) emit({ type: 'tool', name: call.name, args });
  }
  return calls;
}
