import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = app.get<ConfigService<Env, true>>(ConfigService);
  const swagger = cfg.get('SWAGGER_ENABLED') && cfg.get('NODE_ENV') !== 'production';

  app.set('trust proxy', 1); // atrás do Nginx/Cloudflare: IP real para limites e auditoria
  app.use(helmet({ contentSecurityPolicy: swagger ? false : undefined, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());

  const origens = [cfg.get('APP_URL'), ...cfg.get('CORS_ORIGINS').split(',')].map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: [...new Set(origens)],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());

  const uploads = resolve(cfg.get('UPLOAD_DIR'));
  mkdirSync(uploads, { recursive: true });
  app.useStaticAssets(uploads, {
    prefix: '/uploads/',
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  if (swagger) {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Lumen Livraria API').setVersion('1.0').addBearerAuth().build());
    SwaggerModule.setup('api/docs', app, doc);
  }

  app.enableShutdownHooks();
  const porta = cfg.get('PORT');
  await app.listen(porta, '0.0.0.0');
  new Logger('Bootstrap').log(`API em http://localhost:${porta}/api/v1${swagger ? ' (docs em /api/docs)' : ''}`);
}
bootstrap();
