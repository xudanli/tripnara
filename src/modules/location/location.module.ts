import { Module, forwardRef } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LlmModule } from '../llm/llm.module';
import { QueueModule } from '../queue/queue.module';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [LlmModule, forwardRef(() => QueueModule), ItineraryModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}

