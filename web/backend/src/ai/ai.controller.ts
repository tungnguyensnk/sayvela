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
import { ChatDto } from './dto/ai.dto';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

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
    const upstream = await this.ai.streamChat(body.messages, controller.signal);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    Readable.fromWeb(upstream as unknown as NodeReadableStream<Uint8Array>)
      .on('error', () => res.end())
      .pipe(res);
  }
}
