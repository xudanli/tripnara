import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_ENTITIES } from '../../config/typeorm.entities';
import { JourneyRepository } from './repositories/journey/journey.repository';
import { UserPreferenceRepository } from './repositories/user-preference/user-preference.repository';

@Module({
  imports: [TypeOrmModule.forFeature(TYPEORM_ENTITIES)],
  providers: [JourneyRepository, UserPreferenceRepository],
  exports: [JourneyRepository, UserPreferenceRepository],
})
export class PersistenceModule {}
