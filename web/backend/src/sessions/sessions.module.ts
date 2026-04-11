import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
