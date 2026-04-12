import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContextsService } from './contexts.service';
import { CreateContextDto, UpdateContextDto } from './dto/contexts.dto';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/contexts')
@UseGuards(JwtAuthGuard)
export class ContextsController {
  constructor(private contexts: ContextsService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.contexts.list(userId);
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateContextDto) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.contexts.create(userId, body);
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.contexts.getOne(userId, id);
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateContextDto,
  ) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.contexts.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    await this.contexts.remove(userId, id);
  }
}
