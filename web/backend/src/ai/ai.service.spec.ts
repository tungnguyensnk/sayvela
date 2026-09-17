import { AiService } from './ai.service';
import type { AssistDto } from './dto/ai.dto';

describe('AiService', () => {
  const signal = new AbortController().signal;
  let service: AiService;
  let fetchMock: jest.Mock<Promise<unknown>, [string, { body: string }]>;

  beforeEach(() => {
    process.env.AI_API_KEY = 'key';
    process.env.AI_MODEL = 'main-model';
    process.env.AI_GATE_MODEL = 'gate-model';
    service = new AiService();
    fetchMock = jest.fn<Promise<unknown>, [string, { body: string }]>();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  // the upstream gateway sometimes appends an sse done marker to plain json
  const gateResponse = (content: string, suffix = '\ndata: [DONE]') => ({
    ok: true,
    body: {},
    text: () =>
      Promise.resolve(
        JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }) + suffix,
      ),
  });

  it('reads the gate answer from the first character', async () => {
    fetchMock.mockResolvedValue(gateResponse('1\n'));
    await expect(service.gate({ transcript: 't' }, signal)).resolves.toBe(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body) as {
      model: string;
      max_tokens: number;
    };
    expect(body.model).toBe('gate-model');
    expect(body.max_tokens).toBe(256);
  });

  it('treats anything else as no help needed', async () => {
    fetchMock.mockResolvedValue(gateResponse('sure, maybe'));
    await expect(service.gate({ transcript: 't' }, signal)).resolves.toBe(0);
  });

  it('finds the verdict even when the model wraps it in words', async () => {
    fetchMock.mockResolvedValue(gateResponse('Answer: 1'));
    await expect(service.gate({ transcript: 't' }, signal)).resolves.toBe(1);
  });

  it('falls back to no help when a reasoning model runs out of tokens', async () => {
    fetchMock.mockResolvedValue(gateResponse(''));
    await expect(service.gate({ transcript: 't' }, signal)).resolves.toBe(0);
  });

  it('reads a body that carries no done marker', async () => {
    fetchMock.mockResolvedValue(gateResponse('1', ''));
    await expect(service.gate({ transcript: 't' }, signal)).resolves.toBe(1);
  });

  it('builds an assist body with tools and the screenshot part', () => {
    const dto: AssistDto = {
      transcript: 'line',
      image: 'data:image/jpeg;base64,AAA',
      language: 'vi',
      speakLanguage: 'ja',
      history: [{ role: 'assistant', content: 'prev' }],
    };
    const body = service.assistBody(dto) as {
      model: string;
      messages: { role: string; content: unknown }[];
      tools: { function: { name: string } }[];
    };

    expect(body.model).toBe('main-model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'prev' });
    expect(body.messages[2].content).toEqual([
      { type: 'text', text: 'line' },
      { type: 'image_url', image_url: { url: dto.image } },
    ]);
    expect(body.tools.map((t) => t.function.name)).toContain('list_frames');
  });
});
