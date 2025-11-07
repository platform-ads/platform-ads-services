/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie Parser Middleware
  app.use(cookieParser());

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Enable CORS with credentials
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api', { exclude: [''] });

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().then((r) => r);
