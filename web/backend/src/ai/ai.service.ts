import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { AssistDto, ChatDto, ChatMessageDto, GateDto } from './dto/ai.dto';
import {
  ASSIST_TOOLS,
  GATE_SYSTEM_PROMPT,
  assistSystemPrompt,
} from './ai.prompts';

type ChatBody = Record<string, unknown>;

@Injectable()
export class AiService {
  private readonly baseUrl = (
    process.env.AI_BASE_URL ?? 'https://ai.kizunasoft.com/v1'
  ).replace(/\/+$/, '');
  private readonly apiKey = process.env.AI_API_KEY ?? '';
  private readonly model = process.env.AI_MODEL ?? '';
  private readonly gateModel = process.env.AI_GATE_MODEL || this.model;
  // reasoning models spend their budget thinking before they write anything, so
  // a tight cap comes back with an empty answer; raise it for those
  private readonly gateMaxTokens = Number(process.env.AI_GATE_MAX_TOKENS ?? 256);
  private readonly logger = new Logger(AiService.name);

  // posts a chat completion request to the openai-compatible upstream
  private async request(
    body: ChatBody,
    signal: AbortSignal,
  ): Promise<Response> {
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
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      const text = (await res.text().catch(() => '')).slice(0, 500);
      throw new HttpException(
        `ai upstream failed: ${res.status} ${text}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return res;
  }

  // attaches the screenshot to the last user message so the model can see it
  chatMessages(messages: ChatMessageDto[], image?: string): unknown[] {
    if (!image) return messages;
    const lastUser = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUser < 0) return messages;
    return messages.map((message, index) =>
      index === lastUser
        ? {
            role: message.role,
            content: [
              { type: 'text', text: message.content },
              { type: 'image_url', image_url: { url: image } },
            ],
          }
        : message,
    );
  }

  async streamChat(
    dto: ChatDto,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await this.request(
      {
        model: this.model,
        messages: this.chatMessages(dto.messages, dto.image),
        stream: true,
      },
      signal,
    );
    return res.body!;
  }

  // some upstream routes append an sse "data: [DONE]" line to a plain json body,
  // which makes res.json() throw; read the json prefix instead
  private async readJson(res: Response): Promise<Record<string, unknown> | null> {
    const raw = (await res.text().catch(() => '')).trim();
    if (!raw) return null;
    const body = raw.split(/data:\s*\[DONE\]/)[0].trim();
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      const start = body.indexOf('{');
      const end = body.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      try {
        return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }

  // asks the small gate model whether the latest transcript needs assistance
  async gate(dto: GateDto, signal: AbortSignal): Promise<0 | 1> {
    const user = dto.context
      ? `Context: ${dto.context}\n\nTranscript:\n${dto.transcript}`
      : dto.transcript;
    const res = await this.request(
      {
        model: this.gateModel,
        messages: [
          { role: 'system', content: GATE_SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        max_tokens: this.gateMaxTokens,
        temperature: 0,
      },
      signal,
    );
    const json = (await this.readJson(res)) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    } | null;
    const choice = json?.choices?.[0];
    const text = choice?.message?.content?.trim() ?? '';
    if (!text) {
      this.logger.warn(
        `gate model ${this.gateModel} answered nothing (finish_reason=${choice?.finish_reason ?? 'none'}); raise AI_GATE_MAX_TOKENS if it reasons before answering`,
      );
    }
    // the answer is one character, but a chatty model may wrap it in words
    return /[01]/.exec(text)?.[0] === '1' ? 1 : 0;
  }

  // builds the assist request body; extra messages continue a tool round trip
  assistBody(dto: AssistDto, extra: unknown[] = []): ChatBody {
    const parts: unknown[] = [{ type: 'text', text: dto.transcript }];
    if (dto.image)
      parts.push({ type: 'image_url', image_url: { url: dto.image } });
    return {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: assistSystemPrompt({
            language: dto.language,
            speakLanguage: dto.speakLanguage,
            context: dto.context,
            manual: dto.manual,
          }),
        },
        ...(dto.history ?? []),
        { role: 'user', content: parts },
        ...extra,
      ],
      tools: ASSIST_TOOLS,
      tool_choice: 'auto',
      stream: true,
    };
  }

  async streamAssist(
    dto: AssistDto,
    signal: AbortSignal,
    extra: unknown[] = [],
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await this.request(this.assistBody(dto, extra), signal);
    return res.body!;
  }
}
