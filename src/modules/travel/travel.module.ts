import { Module } from '@nestjs/common';
import { TravelSummaryController } from './travel-summary.controller';
import { TravelSummaryService } from './travel-summary.service';
import { LlmModule } from '../llm/llm.module';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [LlmModule, ItineraryModule],
  controllers: [TravelSummaryController],
  providers: [TravelSummaryService],
  exports: [TravelSummaryService],
})
export class TravelModule {}

