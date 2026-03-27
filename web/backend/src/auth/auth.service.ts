import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

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
}
