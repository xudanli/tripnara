import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_ENTITIES } from '../../config/typeorm.entities';
import { UserPreferenceRepository } from './repositories/user-preference/user-preference.repository';
import { EventbriteConnectionRepository } from './repositories/eventbrite-connection/eventbrite-connection.repository';
import { ItineraryRepository } from './repositories/itinerary/itinerary.repository';
import { JourneyTemplateRepository } from './repositories/journey-template/journey-template.repository';

@Module({
  imports: [TypeOrmModule.forFeature(TYPEORM_ENTITIES)],
  providers: [
    UserPreferenceRepository,
    EventbriteConnectionRepository,
    ItineraryRepository,
    JourneyTemplateRepository,
  ],
  exports: [
    UserPreferenceRepository,
    EventbriteConnectionRepository,
    ItineraryRepository,
    JourneyTemplateRepository,
  ],
})
export class PersistenceModule {}
