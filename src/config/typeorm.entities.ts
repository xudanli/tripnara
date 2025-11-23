import {
  UserEntity,
  UserProfileEntity,
  UserAuthProviderEntity,
  UserSettingEntity,
} from '../modules/persistence/entities/user.entity';
import { UserPreferenceEntity } from '../modules/persistence/entities/user-preference.entity';
import {
  AiRequestLogEntity,
  AiGenerationJobEntity,
  AiSafetyNoticeCacheEntity,
} from '../modules/persistence/entities/ai-log.entity';
import {
  NotificationEntity,
} from '../modules/persistence/entities/user-interaction.entity';
import {
  DestinationEntity,
  CountryEntity,
  TransportModeEntity,
  HighAltitudeRegionEntity,
  PreparationProfileEntity,
  MediaAssetEntity,
  ExternalApiKeyEntity,
} from '../modules/persistence/entities/reference.entity';
import {
  VisaPolicyEntity,
  VisaUnionEntity,
  VisaUnionCountryEntity,
  VisaPolicyHistoryEntity,
} from '../modules/persistence/entities/visa.entity';
import { EventbriteConnectionEntity } from '../modules/persistence/entities/eventbrite-connection.entity';
import {
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
} from '../modules/persistence/entities/itinerary.entity';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../modules/persistence/entities/journey-template.entity';

export const TYPEORM_ENTITIES = [
  UserEntity,
  UserProfileEntity,
  UserAuthProviderEntity,
  UserSettingEntity,
  UserPreferenceEntity,
  EventbriteConnectionEntity,
  AiRequestLogEntity,
  AiGenerationJobEntity,
  AiSafetyNoticeCacheEntity,
  NotificationEntity,
  DestinationEntity,
  CountryEntity,
  TransportModeEntity,
  HighAltitudeRegionEntity,
  PreparationProfileEntity,
  MediaAssetEntity,
  ExternalApiKeyEntity,
  VisaPolicyEntity,
  VisaUnionEntity,
  VisaUnionCountryEntity,
  VisaPolicyHistoryEntity,
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
];
