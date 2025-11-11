import {
  JourneyEntity,
  JourneyDayEntity,
  JourneyTimeSlotEntity,
} from '../modules/persistence/entities/journey.entity';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../modules/persistence/entities/journey-template.entity';
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
  JourneyEditEntity,
  JourneyShareEntity,
  JourneyFeedbackEntity,
  JourneyCollectionEntity,
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

export const TYPEORM_ENTITIES = [
  JourneyEntity,
  JourneyDayEntity,
  JourneyTimeSlotEntity,
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
  UserEntity,
  UserProfileEntity,
  UserAuthProviderEntity,
  UserSettingEntity,
  UserPreferenceEntity,
  AiRequestLogEntity,
  AiGenerationJobEntity,
  AiSafetyNoticeCacheEntity,
  JourneyEditEntity,
  JourneyShareEntity,
  JourneyFeedbackEntity,
  JourneyCollectionEntity,
  NotificationEntity,
  DestinationEntity,
  CountryEntity,
  TransportModeEntity,
  HighAltitudeRegionEntity,
  PreparationProfileEntity,
  MediaAssetEntity,
  ExternalApiKeyEntity,
];
