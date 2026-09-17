import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { runMigrations } from './db';

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // screenshots sent to the assist endpoint exceed the default 100kb json limit
  app.useBodyParser('json', { limit: '5mb' });
  app.useWebSocketAdapter(new WsAdapter(app));
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : process.env.NEXTAUTH_URL
      ? [process.env.NEXTAUTH_URL]
      : ['*'];
  app.enableCors({
    origin:
      allowedOrigins.length === 1 && allowedOrigins[0] === '*'
        ? '*'
        : allowedOrigins,
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
