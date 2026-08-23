import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // `NestExpressApplication` deb generic beramiz — shu bo'lmasa
  // `app.set(...)` kabi Express'ga xos metodlar TypeScript'da
  // ko'rinmaydi (`INestApplication`ning umumiy turi ularni bilmaydi),
  // garchi ishga tushirilganda platforma haqiqatan Express bo'lsa ham.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Production'da Nginx orqasida ishlaydi (bitta reverse-proxy hop).
  // Buni o'rnatmasak, Express har bir so'rovni Nginx'ning o'z IP'i
  // (127.0.0.1) dan kelgan deb hisoblaydi — natijada @nestjs/throttler
  // barcha foydalanuvchilarni BITTA IP sifatida hisoblab, bittasi
  // limitga tegsa hammani bloklab qo'yadi. Nginx config'da
  // `X-Forwarded-For` yuborilishi shart (deploy/nginx-*.conf'da bor).
  if (process.env.TRUST_PROXY !== 'false') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(express.json({ limit: '256kb' })); // script matnlari kichik, katta payload = DoS urinishi
  app.use(express.urlencoded({ limit: '256kb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da yo'q maydonlarni avtomatik tashlaydi
      forbidNonWhitelisted: true, // whitelist qilinmagan maydon kelsa 400 qaytaradi
      transform: true,
    }),
  );

  // Autentifikatsiya endi to'liq DB-backed: userlar uchun JWT
  // (AuthModule — access/refresh token, `auth.controller.ts`),
  // agent/device'lar uchun esa DB'da hash'langan, rotatsiya
  // qilinadigan registration token (AppsService.authenticateAgent,
  // AgentsGateway). Umumiy statik `X-API-Key` endi ishlatilmaydi —
  // har bir route o'ziga mos guard'ni (`JwtAuthGuard` yoki
  // gateway ichidagi token tekshiruvi) o'zi belgilaydi.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Key')
    .setDescription('salom')
    .setVersion('1.0')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, documentFactory);
  const port = Number(process.env.PORT) || 3000;
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
