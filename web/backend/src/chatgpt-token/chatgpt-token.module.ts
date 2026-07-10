import { Module } from '@nestjs/common';
import { ChatgptTokenController } from './chatgpt-token.controller';
import { ChatgptTokenService } from './chatgpt-token.service';

@Module({
  controllers: [ChatgptTokenController],
  providers: [ChatgptTokenService],
})
export class ChatgptTokenModule {}
