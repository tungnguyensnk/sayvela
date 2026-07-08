import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

// in-memory store for desktop auth pending tokens (code → jwt, expires in 5min)
const pendingTokens = new Map<string, { token: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private users: UsersService,
  ) {}

  async register(email: string, password: string) {
    const user = await this.users.create(email, password);
    if (!user) return null;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await this.users.verify(email, password);
    if (!user) return null;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { user, token };
  }

  // generate a long-lived token for desktop app (7d), stored temporarily under a one-time code
  async desktopToken(userId: string, email: string) {
    const token = await this.jwt.signAsync(
      { sub: userId, email, desktop: true },
    );
    return { token };
  }

  // store a desktop auth token under a one-time code (ttl 5 min)
  storePendingToken(code: string, token: string) {
    pendingTokens.set(code, { token, expiresAt: Date.now() + 5 * 60 * 1000 });
  }

  // retrieve and delete a pending token by code — returns null if expired or not found
  consumePendingToken(code: string): string | null {
    const entry = pendingTokens.get(code);
    if (!entry) return null;
    pendingTokens.delete(code);
    if (entry.expiresAt < Date.now()) return null;
    return entry.token;
  }
}
