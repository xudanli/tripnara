import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalController } from './external.controller';
import { TravelGuidesController } from './travel-guides.controller';
import { ExternalService } from './external.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [ExternalController, TravelGuidesController],
  providers: [ExternalService],
  exports: [ExternalService],
})
export class ExternalModule {}

