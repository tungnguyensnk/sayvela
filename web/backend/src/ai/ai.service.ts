import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ChatMessageDto } from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly baseUrl = (
    process.env.AI_BASE_URL ?? 'https://ai.kizunasoft.com/v1'
  ).replace(/\/+$/, '');
  private readonly apiKey = process.env.AI_API_KEY ?? '';
  private readonly model = process.env.AI_MODEL ?? '';

  // opens a streaming chat completion against the openai-compatible upstream
  async streamChat(
    messages: ChatMessageDto[],
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.apiKey || !this.model)
      throw new HttpException(
        'ai not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
      signal,
    });
    if (!res.ok || !res.body) {
      const body = (await res.text().catch(() => '')).slice(0, 500);
      throw new HttpException(
        `ai upstream failed: ${res.status} ${body}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return res.body;
  }
}
