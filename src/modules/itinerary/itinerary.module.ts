import { Module } from '@nestjs/common';
import { ItineraryController } from './itinerary.controller';
import { ItineraryV1Controller } from './itinerary-v1.controller';
import { JourneyV1Controller } from './journey-v1.controller';
import { ItineraryService } from './itinerary.service';
import { LlmModule } from '../llm/llm.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [LlmModule, PreferencesModule, PersistenceModule],
  controllers: [ItineraryController, ItineraryV1Controller, JourneyV1Controller],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}

