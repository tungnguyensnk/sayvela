import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('backend/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() body: RegisterDto) {
    const res = await this.auth.register(body.email, body.password);
    if (!res) {
      throw new HttpException('invalid credentials', HttpStatus.BAD_REQUEST);
    }
    return res;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: LoginDto) {
    const res = await this.auth.login(body.email, body.password);
    if (!res) {
      throw new HttpException('invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return res;
  }

  // returns a short-lived token for the desktop app to use after browser login
  @Get('desktop-token')
  @UseGuards(AuthGuard('jwt'))
  async desktopToken(@Request() req: { user: { userId: string; email: string } }) {
    return this.auth.desktopToken(req.user.userId, req.user.email);
  }

  // store a desktop jwt under a one-time code — called by web frontend after login
  @Post('pending-token')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async storePendingToken(
    @Request() req: { user: { userId: string; email: string } },
    @Body('code') code: string,
  ) {
    if (!code || code.length < 8) {
      throw new HttpException('invalid code', HttpStatus.BAD_REQUEST);
    }
    const { token } = await this.auth.desktopToken(req.user.userId, req.user.email);
    this.auth.storePendingToken(code, token);
    return { ok: true };
  }

  // poll endpoint for desktop — returns token once and deletes it
  @Get('pending-token/:code')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async consumePendingToken(@Param('code') code: string) {
    const token = this.auth.consumePendingToken(code);
    if (!token) return { token: null };
    return { token };
  }
}
