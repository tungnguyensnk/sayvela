import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { runMigrations } from './db';

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule, { rawBody: true });
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
