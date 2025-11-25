import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItineraryV1Controller } from './itinerary-v1.controller';
import { JourneyV1Controller } from './journey-v1.controller';
import { ItineraryService } from './itinerary.service';
import { LlmModule } from '../llm/llm.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { PreparationProfileEntity } from '../persistence/entities/reference.entity';
import { AiSafetyNoticeCacheEntity } from '../persistence/entities/ai-log.entity';

@Module({
  imports: [
    LlmModule,
    PreferencesModule,
    PersistenceModule,
    TypeOrmModule.forFeature([PreparationProfileEntity, AiSafetyNoticeCacheEntity]),
  ],
  controllers: [ItineraryV1Controller, JourneyV1Controller],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}

