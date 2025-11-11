import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AiGenerationJobEntity,
  AiRequestLogEntity,
} from '../persistence/entities/ai-log.entity';
import { JourneyGenerationService } from './journey-generation.service';
import { JourneyGenerationController } from './journey-generation.controller';
import { PersistenceModule } from '../persistence/persistence.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    PersistenceModule,
    LlmModule,
    TypeOrmModule.forFeature([AiGenerationJobEntity, AiRequestLogEntity]),
  ],
  controllers: [JourneyGenerationController],
  providers: [JourneyGenerationService],
})
export class JourneyGenerationModule {}
