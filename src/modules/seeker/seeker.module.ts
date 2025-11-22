import { Module } from '@nestjs/common';
import { SeekerController } from './seeker.controller';
import { SeekerService } from './seeker.service';
import { LlmModule } from '../llm/llm.module';
import { InspirationModule } from '../inspiration/inspiration.module';

@Module({
  imports: [LlmModule, InspirationModule],
  controllers: [SeekerController],
  providers: [SeekerService],
  exports: [SeekerService],
})
export class SeekerModule {}

