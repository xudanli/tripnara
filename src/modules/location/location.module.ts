import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LlmModule } from '../llm/llm.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [LlmModule, QueueModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}

