import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// 关键：引入 fs / path 来读取证书
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // 是否启用 HTTPS，可以用环境变量控制，方便以后切换
  const enableHttps = process.env.ENABLE_HTTPS === 'true';

  // 如果启用 HTTPS，则读取本地证书
  const httpsOptions = enableHttps
    ? {
        key: fs.readFileSync(
          path.join(process.cwd(), 'certs', 'localhost-key.pem'),
        ),
        cert: fs.readFileSync(
          path.join(process.cwd(), 'certs', 'localhost-cert.pem'),
        ),
      }
    : undefined;

  // 在 NestFactory.create 里加上 httpsOptions
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions,
  });

  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');
  const appSessionSecret = configService.get<string>('APP_SESSION_SECRET');

  app.enableCors({
    origin: frontendOrigin,
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

  const protocol = enableHttps ? 'https' : 'http';
  // 只是方便你确认现在到底跑的是 http 还是 https
  // eslint-disable-next-line no-console
  console.log(`🚀 API running at ${protocol}://localhost:${port}`);
}

void bootstrap();
