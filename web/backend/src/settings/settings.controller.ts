import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('me')
  async get(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.settings.get(userId);
  }

  @Put('me')
  async update(@Req() req: RequestWithUser, @Body() body: UpdateSettingsDto) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.settings.update(userId, body.settingsJson);
  }
}
