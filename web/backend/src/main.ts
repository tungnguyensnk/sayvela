import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { runMigrations } from './db';

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({
    origin: '*',
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
