import { Module, forwardRef } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LlmModule } from '../llm/llm.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [LlmModule, forwardRef(() => QueueModule)],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}

