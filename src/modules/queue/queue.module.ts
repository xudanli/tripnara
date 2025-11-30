import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { LocationGenerationProcessor } from './processors/location-generation.processor';
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
          },
        } as any; // BullModule 配置类型
      },
    }),
    BullModule.registerQueue({
      name: 'location-generation',
    }),
    LocationModule,
  ],
  providers: [QueueService, LocationGenerationProcessor],
  exports: [QueueService],
})
export class QueueModule {}

