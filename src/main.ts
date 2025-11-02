/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.setGlobalPrefix('api', { exclude: [''] });

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().then((r) => r);
