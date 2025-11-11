import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { JourneyEntity } from '../persistence/entities/journey.entity';
import { UserPreferenceEntity } from '../persistence/entities/user-preference.entity';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([JourneyEntity, UserPreferenceEntity]),
  ],
  controllers: [MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MonitoringModule {}
