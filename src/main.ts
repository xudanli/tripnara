import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

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
