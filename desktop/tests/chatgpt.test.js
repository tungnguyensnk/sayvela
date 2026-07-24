import { describe, it, expect, vi } from 'vitest';

describe('chatgpt provider', () => {
  it('should fail fast for web runtime', async () => {
    vi.resetModules();
    vi.doMock('@tauri-apps/api/core', () => ({ isTauri: () => false }));

    const { sendStreamMessage } = await import('../src/providers/chatgpt.js');

    await expect(sendStreamMessage('hello', [], () => {}, { requestId: 'rid' })).rejects.toThrow(
      /requires tauri runtime/i
    );
  });

  it('should stream via tauri bridge', async () => {
    vi.resetModules();
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    });
    localStorage.setItem('sayvela_auth', JSON.stringify({ token: 'jwt' }));
    localStorage.setItem(
      'sayvela_chatgpt_conversation',
      JSON.stringify({ conversationId: 'old-c', parentMessageId: 'old-m' })
    );

    let handler = null;
    const invoke = vi.fn(async (cmd, args) => {
      if (cmd === 'chatgpt_start_stream') {
        handler?.({ payload: { request_id: args.request.requestId, event: 'chunk', data: { delta: 'hi' } } });
        handler?.({
          payload: {
            request_id: args.request.requestId,
            event: 'result',
            data: { response: 'done', conversation_id: 'c1', message_id: 'm1' },
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

    const { sendStreamMessage } = await import('../src/providers/chatgpt.js');
    const events = [];
    await sendStreamMessage('hello', [], (p) => events.push(p), { requestId: 'rid' });

    expect(invoke).toHaveBeenCalledWith('chatgpt_start_stream', {
      request: {
        requestId: 'rid',
        message: 'hello',
        conversationId: null,
        parentMessageId: null,
        apiUrl: 'http://localhost:80/api',
        authToken: 'jwt',
        keepConversation: false,
      },
    });
    expect(events).toEqual([
      { event: 'chunk', data: { delta: 'hi' } },
      { event: 'result', data: { response: 'done', conversation_id: 'c1', message_id: 'm1' } },
    ]);
  });

  it('should pass conversation ids only when keepConversation is enabled', async () => {
    vi.resetModules();
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    });
    localStorage.setItem('sayvela_auth', JSON.stringify({ token: 'jwt' }));
    localStorage.setItem(
      'sayvela_chatgpt_conversation',
      JSON.stringify({ conversationId: 'c1', parentMessageId: 'm1' })
    );

    let handler = null;
    const invoke = vi.fn(async (cmd, args) => {
      if (cmd === 'chatgpt_start_stream') {
        handler?.({ payload: { request_id: args.request.requestId, event: 'result', data: { response: 'done' } } });
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

    const { sendStreamMessage } = await import('../src/providers/chatgpt.js');
    await sendStreamMessage('hello', [], () => {}, { requestId: 'rid', keepConversation: true });

    expect(invoke).toHaveBeenCalledWith('chatgpt_start_stream', {
      request: {
        requestId: 'rid',
        message: 'hello',
        conversationId: 'c1',
        parentMessageId: 'm1',
        apiUrl: 'http://localhost:80/api',
        authToken: 'jwt',
        keepConversation: true,
      },
    });
  });
});
