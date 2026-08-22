import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { AuthModule } from './auth/auth.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalGuards(new ApiKeyGuard());

  if (!process.env.API_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      '[security] API_KEY .env da o\'rnatilmagan — barcha endpointlar hech qanday autentifikatsiyasiz ochiq.',
    );
  }

    const swaggerConfig = new DocumentBuilder()
        .setTitle('API Key')
        .setDescription('salom')
        .setVersion('1.0')
        .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, documentFactory);
  const port = Number(process.env.PORT) || 3000;
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  });

  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
