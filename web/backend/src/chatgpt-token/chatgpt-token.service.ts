import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { chatgptAccessTokens } from '../schema/chatgpt-access-tokens';

@Injectable()
export class ChatgptTokenService {
  async getAccessToken(userId: string) {
    const rows = await db
      .select({ accessToken: chatgptAccessTokens.accessToken })
      .from(chatgptAccessTokens)
      .where(eq(chatgptAccessTokens.userId, userId))
      .limit(1);
    return rows[0]?.accessToken ?? null;
  }
}
