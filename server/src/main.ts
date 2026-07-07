import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files from the uploads/ directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // CORS — configurable per environment
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const origins = corsOrigin.split(',').map((o) => o.trim());
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🏓 TableTennisPro Server running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS Origin: ${corsOrigin}`);
}
bootstrap().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });
