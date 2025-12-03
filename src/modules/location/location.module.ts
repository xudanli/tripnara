import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LlmModule } from '../llm/llm.module';
import { QueueModule } from '../queue/queue.module';
import { ItineraryModule } from '../itinerary/itinerary.module';
import { LocationEntity } from '../persistence/entities/location.entity';

@Module({
  imports: [
    LlmModule,
    forwardRef(() => QueueModule),
    ItineraryModule,
    TypeOrmModule.forFeature([LocationEntity]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}

