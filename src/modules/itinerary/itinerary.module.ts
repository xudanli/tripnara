import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItineraryV1Controller } from './itinerary-v1.controller';
import { JourneyV1Controller } from './journey-v1.controller';
import { ItineraryService } from './itinerary.service';
import { JourneyAssistantService } from './services/journey-assistant.service';
import { PromptService } from './services/prompt.service';
import { ItineraryMapper } from './services/itinerary.mapper';
import { ItineraryGenerationService } from './services/itinerary-generation.service';
import { JourneyTaskService } from './services/journey-task.service';
import { JourneyExpenseService } from './services/journey-expense.service';
import { CulturalGuideService } from './services/cultural-guide.service';
import { LocalEssentialsService } from './services/local-essentials.service';
import { ItineraryOptimizerService } from './services/itinerary-optimizer.service';
import { LlmModule } from '../llm/llm.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { CurrencyModule } from '../currency/currency.module';
import { InspirationModule } from '../inspiration/inspiration.module';
import { ExternalModule } from '../external/external.module';
import { DestinationModule } from '../destination/destination.module';
import { PreparationProfileEntity } from '../persistence/entities/reference.entity';
import { AiSafetyNoticeCacheEntity } from '../persistence/entities/ai-log.entity';

@Module({
  imports: [
    LlmModule,
    PreferencesModule,
    PersistenceModule,
    CurrencyModule,
    forwardRef(() => InspirationModule),
    ExternalModule,
    forwardRef(() => DestinationModule),
    TypeOrmModule.forFeature([PreparationProfileEntity, AiSafetyNoticeCacheEntity]),
  ],
  controllers: [ItineraryV1Controller, JourneyV1Controller],
  providers: [
    ItineraryService,
    JourneyAssistantService,
    PromptService,
    ItineraryMapper,
    ItineraryGenerationService,
    JourneyTaskService,
    JourneyExpenseService,
    CulturalGuideService,
    LocalEssentialsService,
    ItineraryOptimizerService,
  ],
  exports: [ItineraryService, JourneyAssistantService, PromptService],
})
export class ItineraryModule {}

