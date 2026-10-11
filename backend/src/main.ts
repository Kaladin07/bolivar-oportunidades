import { NestFactory } from '@nestjs/core';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use((request: { method: string; headers: { origin?: string } }, _response: unknown, next: (error?: Error) => void) => {
    const origin = request.headers.origin;
    if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && origin !== (process.env.FRONTEND_URL ?? 'http://localhost:3000')) {
      next(new ForbiddenException('Invalid origin'));
      return;
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true });
  await app.listen(Number(process.env.PORT ?? 3001));
}
await bootstrap();
