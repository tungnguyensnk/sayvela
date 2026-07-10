import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatgptTokenService } from './chatgpt-token.service';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/chatgpt-token')
@UseGuards(JwtAuthGuard)
export class ChatgptTokenController {
  constructor(private readonly tokens: ChatgptTokenService) {}

  @Get('access-token')
  async getMine(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const accessToken = await this.tokens.getAccessToken(userId);
    if (!accessToken)
      throw new HttpException('chatgpt token not found', HttpStatus.NOT_FOUND);
    return { accessToken };
  }
}
