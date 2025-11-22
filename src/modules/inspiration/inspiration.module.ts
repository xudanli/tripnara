import { Module } from '@nestjs/common';
import { InspirationController } from './inspiration.controller';
import { InspirationService } from './inspiration.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [InspirationController],
  providers: [InspirationService],
  exports: [InspirationService],
})
export class InspirationModule {}

