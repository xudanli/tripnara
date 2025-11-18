import { Module } from '@nestjs/common';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { LlmModule } from '../llm/llm.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [LlmModule, PreferencesModule, PersistenceModule],
  controllers: [ItineraryController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}

