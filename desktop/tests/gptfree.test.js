import { describe, it, expect } from 'vitest';
import { getValidToken, sendStreamMessage } from '../src/providers/gptfree.js';

describe('gptfree provider', () => {
  it('should fetch a valid token', async () => {
    const token = await getValidToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  }, 10000); // 10s timeout cho mạng

  it('should stream message and receive result', async () => {
    let resultCount = 0;
    
    await sendStreamMessage('hello', [], (payload) => {
      const { event, data } = payload;
      if (event === 'result') {
        resultCount++;
        expect(data.response).toBeDefined();
        expect(typeof data.response).toBe('string');
      }
    });

    expect(resultCount).toBeGreaterThan(0);
  }, 30000); // 30s timeout
});
