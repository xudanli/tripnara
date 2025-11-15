import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { EventbriteController } from './eventbrite.controller';
import { EventbriteService } from './eventbrite.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresInValue =
          configService.get<string>('JWT_EXPIRES_IN') || '7d';
        return {
          secret:
            configService.get<string>('JWT_SECRET') || 'your-secret-key',
          signOptions: {
            expiresIn: expiresInValue as any,
          },
        };
      },
    }),
  ],
  controllers: [EventbriteController],
  providers: [EventbriteService],
  exports: [EventbriteService],
})
export class EventbriteModule {}

