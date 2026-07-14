import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const WEAK_JWT_SECRETS = new Set([
  'change-me-to-a-strong-random-secret',
  'tt-pro-jwt-dev-only',
  'secret',
  'jwt-secret',
]);

function assertSafeRuntimeConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const devAuth = process.env.ENABLE_DEV_AUTH === 'true';
  const jwtSecret = process.env.JWT_SECRET || '';

  if (isProd && devAuth) {
    throw new Error('ENABLE_DEV_AUTH=true is forbidden when NODE_ENV=production');
  }
  if (isProd && (!jwtSecret || WEAK_JWT_SECRETS.has(jwtSecret) || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be a strong random value (>=32 chars) in production');
  }
  if (!isProd && WEAK_JWT_SECRETS.has(jwtSecret || 'tt-pro-jwt-dev-only')) {
    console.warn('[WARN] Using a weak JWT_SECRET — do not deploy this configuration');
  }
  if (!isProd && process.env.CORS_ORIGIN === '*') {
    console.warn('[WARN] CORS_ORIGIN=* is insecure for credentialed browsers; prefer explicit origins');
  }
}

async function bootstrap() {
  assertSafeRuntimeConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files from the uploads/ directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  // CORS — configurable per environment
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174,http://127.0.0.1:5174';
  const origins = corsOrigin === '*'
    ? true
    : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
  const publicUrl = process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  console.log(`🏓 TableTennisPro Server running on http://0.0.0.0:${port}`);
  console.log(`   Public URL: ${publicUrl}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS Origin: ${corsOrigin}`);
}
bootstrap().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });
