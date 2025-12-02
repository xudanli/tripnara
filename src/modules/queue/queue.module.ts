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
            // 🔥 关键修复：BullMQ 需要将 maxRetriesPerRequest 设置为 null
            // 这样在 Redis 瞬时断开时，队列会保持等待状态而不是直接抛出错误
            maxRetriesPerRequest: null, // 允许无限重试，防止 BullMQ 崩溃
            enableReadyCheck: false, // 禁用就绪检查，提高性能
            lazyConnect: true, // 延迟连接，避免启动时阻塞
            // 保持连接活跃
            keepAlive: 1000,
            connectTimeout: 10000, // 连接超时 10 秒
            // 🔥 改进的重试策略：在 Redis 断开时进行指数退避重试
            retryStrategy: (times: number) => {
              // 最多重试 10 次，然后等待更长时间
              if (times > 10) {
                // 超过 10 次后，等待 5 秒再重试
                return 5000;
              }
              // 指数退避：200ms, 400ms, 800ms, 1600ms, 2000ms (最大)
              return Math.min(times * 200, 2000);
            },
            // 🔥 连接错误处理：对更多错误类型进行重连
            reconnectOnError: (err: Error) => {
              const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
              if (targetErrors.some(error => err.message.includes(error))) {
                // 对这些错误进行重连
                return true;
              }
              return false;
            },
            // 命令超时
            commandTimeout: 5000, // 5 秒命令超时
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

