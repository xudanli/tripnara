import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_ENTITIES } from '../../config/typeorm.entities';
import { UserPreferenceRepository } from './repositories/user-preference/user-preference.repository';
import { EventbriteConnectionRepository } from './repositories/eventbrite-connection/eventbrite-connection.repository';
import { ItineraryRepository } from './repositories/itinerary/itinerary.repository';

@Module({
  imports: [TypeOrmModule.forFeature(TYPEORM_ENTITIES)],
  providers: [
    UserPreferenceRepository,
    EventbriteConnectionRepository,
    ItineraryRepository,
  ],
  exports: [
    UserPreferenceRepository,
    EventbriteConnectionRepository,
    ItineraryRepository,
  ],
})
export class PersistenceModule {}
