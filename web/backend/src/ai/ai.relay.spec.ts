import { mergeToolCalls, parseToolArgs, relayRound } from './ai.relay';
import type { AssistEvent, ToolCall } from './ai.relay';

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // split payloads across chunk boundaries to exercise the line buffer
      const raw = lines.map((l) => `data: ${l}\n\n`).join('');
      for (let i = 0; i < raw.length; i += 7)
        controller.enqueue(encoder.encode(raw.slice(i, i + 7)));
      controller.close();
    },
  });
}

describe('ai relay', () => {
  it('emits text deltas and completed tool calls', async () => {
    const stream = sseStream([
      JSON.stringify({ choices: [{ delta: { content: 'hi' } }] }),
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'c1',
                  function: { name: 'show_code', arguments: '{"title":"a"' },
                },
              ],
            },
          },
        ],
      }),
      JSON.stringify({
        choices: [
          {
            delta: { tool_calls: [{ index: 0, function: { arguments: '}' } }] },
          },
        ],
      }),
      '[DONE]',
    ]);
    const events: AssistEvent[] = [];
    const calls = await relayRound(
      stream,
      (e) => events.push(e),
      () => false,
    );

    expect(events).toEqual([
      { type: 'text', delta: 'hi' },
      { type: 'tool', name: 'show_code', args: { title: 'a' } },
    ]);
    expect(calls).toEqual([
      { id: 'c1', name: 'show_code', args: '{"title":"a"}' },
    ]);
  });

  it('skips tools the caller handles locally', async () => {
    const stream = sseStream([
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'c9',
                  function: { name: 'list_frames', arguments: '{}' },
                },
              ],
            },
          },
        ],
      }),
    ]);
    const events: AssistEvent[] = [];
    const calls = await relayRound(
      stream,
      (e) => events.push(e),
      (name) => name === 'list_frames',
    );

    expect(events).toEqual([]);
    expect(calls.map((c) => c.name)).toEqual(['list_frames']);
  });

  it('merges fragments by index and rejects invalid args', () => {
    const acc = new Map<number, ToolCall>();
    mergeToolCalls(acc, [
      {
        index: 1,
        id: 'b',
        function: { name: 'guide_steps', arguments: '{"goal"' },
      },
    ]);
    mergeToolCalls(acc, [{ index: 1, function: { arguments: ':"x"}' } }]);
    const call = acc.get(1)!;

    expect(call).toEqual({
      id: 'b',
      name: 'guide_steps',
      args: '{"goal":"x"}',
    });
    expect(parseToolArgs(call)).toEqual({ goal: 'x' });
    expect(parseToolArgs({ id: 'c', name: 'n', args: '{bad' })).toBeNull();
  });
});
