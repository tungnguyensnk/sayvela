import { Module } from '@nestjs/common';
import { ContextsController } from './contexts.controller';
import { ContextsService } from './contexts.service';
import { ContextsRepository } from './contexts.repository';

@Module({
  controllers: [ContextsController],
  providers: [ContextsService, ContextsRepository],
  exports: [ContextsService],
})
export class ContextsModule {}
