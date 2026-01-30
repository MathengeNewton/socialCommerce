import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  const isProduction = process.env.NODE_ENV === 'production';
  let allowOrigin: boolean | string[] = true;

  if (isProduction) {
    const origins = corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    const allowed = origins.filter((o) => !/localhost|127\.0\.0\.1/i.test(o));
    if (allowed.length === 0) {
      throw new Error(
        'In production, CORS_ORIGIN must be set and must not include localhost. Set it in .env.deploy.',
      );
    }
    allowOrigin = allowed;
  } else {
    // Development: allow all origins so localhost (any port) works
    allowOrigin = true;
  }

  app.enableCors({
    origin: allowOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API server running on port ${port}`);
}

bootstrap();
