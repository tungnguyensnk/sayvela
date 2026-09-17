import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { AssistDto, ChatDto, GateDto } from './dto/ai.dto';
import { relayRound, type AssistEvent, type ToolCall } from './ai.relay';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

const LIST_FRAMES = 'list_frames';

@Controller('backend/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  private openSse(req: Request, res: Response) {
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    return controller.signal;
  }

  // proxies the upstream sse stream to the client so the api key stays server-side
  @Post('chat')
  async chat(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() body: ChatDto,
  ) {
    if (!req.user?.userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const upstream = await this.ai.streamChat(body, controller.signal);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    Readable.fromWeb(upstream as unknown as NodeReadableStream<Uint8Array>)
      .on('error', () => res.end())
      .pipe(res);
  }

  @Post('gate')
  async gate(@Req() req: RequestWithUser, @Body() body: GateDto) {
    if (!req.user?.userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const needHelp = await this.ai.gate(body, controller.signal);
    return { needHelp };
  }

  // streams assist tool calls; answers list_frames locally and runs a second round
  @Post('assist')
  async assist(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() body: AssistDto,
  ) {
    if (!req.user?.userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const signal = this.openSse(req, res);
    const emit = (event: AssistEvent) =>
      res.write(`data: ${JSON.stringify(event)}\n\n`);

    let extra: unknown[] = [];
    try {
      for (let round = 0; round < 2; round += 1) {
        const stream = await this.ai.streamAssist(body, signal, extra);
        const calls = await relayRound(
          stream,
          emit,
          (name) => name === LIST_FRAMES,
        );
        if (!calls.some((c) => c.name === LIST_FRAMES)) break;
        extra = this.toolRoundMessages(calls, body);
      }
    } catch (e) {
      emit({ type: 'text', delta: '' });
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`,
      );
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  // replays the model tool calls plus local results so the next round has context
  private toolRoundMessages(calls: ToolCall[], body: AssistDto): unknown[] {
    return [
      {
        role: 'assistant',
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.args || '{}' },
        })),
      },
      ...calls.map((c) => ({
        role: 'tool',
        tool_call_id: c.id,
        content:
          c.name === LIST_FRAMES
            ? JSON.stringify({ frames: body.openFrames ?? [] })
            : 'ok',
      })),
    ];
  }
}
