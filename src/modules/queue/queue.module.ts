import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { LocationGenerationProcessor } from './processors/location-generation.processor';
import { QueueAdminController } from './queue-admin.controller';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (!redisUrl) {
          throw new Error('REDIS_URL must be configured for queue module');
        }

        // 解析 Redis URL
        // 格式: redis://default:password@host:port
        const url = new URL(redisUrl);
        const password = url.password || undefined;
        const host = url.hostname;
        const port = parseInt(url.port || '6379', 10);

        return {
          connection: {
            host,
            port,
            password,
            ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
            // 修复 Redis 连接崩溃问题
            keepAlive: 1000, // 保持连接活跃
            connectTimeout: 10000, // 连接超时 10 秒
            maxRetriesPerRequest: null, // 🔥 对于 BullMQ，必须设为 null，让 Bull 自己处理重试
            enableReadyCheck: false, // 禁用就绪检查，提高性能
            lazyConnect: false, // 立即连接
            retryStrategy: (times: number) => {
              // 重试策略：最多重试 3 次
              if (times > 3) {
                return null; // 停止重试
              }
              return Math.min(times * 200, 2000);
            },
          },
        } as any; // BullModule 配置类型
      },
    }),
    BullModule.registerQueue({
      name: 'location-generation',
    }),
    forwardRef(() => LocationModule),
  ],
  controllers: [QueueAdminController],
  providers: [QueueService, LocationGenerationProcessor],
  exports: [QueueService],
})
export class QueueModule {}

