import { Module } from '@nestjs/common';
import { TravelSummaryController } from './travel-summary.controller';
import { TravelSummaryService } from './travel-summary.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [TravelSummaryController],
  providers: [TravelSummaryService],
  exports: [TravelSummaryService],
})
export class TravelModule {}

