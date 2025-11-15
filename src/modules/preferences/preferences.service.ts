import { Injectable } from '@nestjs/common';
import { UserPreferenceRepository } from '../persistence/repositories/user-preference/user-preference.repository';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly userPreferenceRepository: UserPreferenceRepository,
  ) {}

  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    const existing = await this.userPreferenceRepository.getByUserId(userId);
    return existing?.preferences ?? {};
  }

  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const saved = await this.userPreferenceRepository.savePreferences(
      userId,
      preferences,
    );
    return saved.preferences;
  }
}

