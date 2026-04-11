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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import {
  BulkInsertSegmentsDto,
  CreateSessionDto,
  UpdateSessionDto,
} from './dto/sessions.dto';

type RequestWithUser = Request & { user?: { userId: string; email: string } };

@Controller('backend/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateSessionDto) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.sessions.createSession({ userId, ...body });
  }

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    return this.sessions.listSessions(userId, Number(page), Number(limit));
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const session = await this.sessions.getSession(userId, id);
    if (!session) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    return session;
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateSessionDto,
  ) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const ok = await this.sessions.updateSession(userId, id, body);
    if (!ok) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const ok = await this.sessions.deleteSession(userId, id);
    if (!ok) throw new HttpException('not found', HttpStatus.NOT_FOUND);
  }

  @Post(':id/segments')
  async bulkSegments(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: BulkInsertSegmentsDto,
  ) {
    const userId = req.user?.userId;
    if (!userId)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    const ok = await this.sessions.bulkInsertSegments(
      userId,
      id,
      body.segments,
    );
    if (!ok) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    return { ok: true };
  }
}
