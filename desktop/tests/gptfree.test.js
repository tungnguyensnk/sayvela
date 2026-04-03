import { describe, it, expect, vi } from 'vitest';

describe('gptfree provider', () => {
  it('should fail fast for web runtime', async () => {
    vi.resetModules();
    vi.doMock('@tauri-apps/api/core', () => ({ isTauri: () => false }));

    const { getValidToken, sendStreamMessage } = await import('../src/providers/gptfree.js');

    await expect(getValidToken()).rejects.toThrow(/tauri-only/i);
    await expect(sendStreamMessage('hello', [], () => {}, { requestId: 'rid' })).rejects.toThrow(
      /requires tauri runtime/i
    );
  });

  it('should stream via tauri bridge', async () => {
    vi.resetModules();

    let handler = null;
    const invoke = vi.fn(async (cmd, args) => {
      if (cmd === 'gptfree_start_stream') {
        handler?.({
          payload: {
            request_id: args.requestId,
            event: 'chunk',
            data: { delta: 'hi' },
          },
        });
        handler?.({
          payload: {
            request_id: args.requestId,
            event: 'result',
            data: { response: 'done' },
          },
        });
      }
      return null;
    });

    const listen = vi.fn(async (_eventName, cb) => {
      handler = cb;
      return () => {
        handler = null;
      };
    });

    vi.doMock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke }));
    vi.doMock('@tauri-apps/api/event', () => ({ listen }));

    const { sendStreamMessage } = await import('../src/providers/gptfree.js');
    const events = [];
    await sendStreamMessage('hello', [], (p) => events.push(p), { requestId: 'rid' });

    expect(invoke).toHaveBeenCalledWith('gptfree_start_stream', {
      requestId: 'rid',
      message: 'hello',
      history: [],
    });
    expect(events).toEqual([
      { event: 'chunk', data: { delta: 'hi' } },
      { event: 'result', data: { response: 'done' } },
    ]);
  });
});
