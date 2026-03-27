import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
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
      throw new HttpException('email already exists', HttpStatus.BAD_REQUEST);
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
}
