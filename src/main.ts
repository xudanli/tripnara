import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // 禁用默认的 body parser，我们将手动配置
    bodyParser: false,
  });

  // 手动配置 body parser，增加请求体大小限制到 50MB
  // 这对于包含大量 details 信息的行程数据是必要的
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');
  const extraOrigins =
    configService
      .get<string>('FRONTEND_EXTRA_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? [];
  const allowedOrigins =
    extraOrigins.length > 0 ? [frontendOrigin, ...extraOrigins] : frontendOrigin;
  const appSessionSecret = configService.get<string>('APP_SESSION_SECRET');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.use(cookieParser(appSessionSecret));
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TripMind API')
    .setDescription('TripMind backend service API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`🚀 API running at http://localhost:${port}`);
}

void bootstrap();
