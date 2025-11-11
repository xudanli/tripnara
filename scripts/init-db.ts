import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation';
import { TYPEORM_ENTITIES } from '../src/config/typeorm.entities';

async function main() {
  ConfigModule.forRoot({
    isGlobal: true,
    cache: false,
    validate: validateEnv,
  });

  const configService = new ConfigService();
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isTest = nodeEnv === 'test';

  const dataSource = new DataSource(
    isTest
      ? {
          type: 'sqljs',
          autoSave: false,
          synchronize: true,
          logging: true,
          entities: TYPEORM_ENTITIES,
        }
      : {
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          synchronize: true,
          logging: true,
          entities: TYPEORM_ENTITIES,
        },
  );

  try {
    await dataSource.initialize();
    console.log('数据库连接成功，模式已同步');
  } catch (error) {
    console.error('数据库初始化失败', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main();
