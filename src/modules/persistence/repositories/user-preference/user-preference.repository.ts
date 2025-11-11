import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferenceEntity } from '../../entities/user-preference.entity';

@Injectable()
export class UserPreferenceRepository {
  constructor(
    @InjectRepository(UserPreferenceEntity)
    private readonly repository: Repository<UserPreferenceEntity>,
  ) {}

  async getByUserId(userId: string): Promise<UserPreferenceEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async savePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<UserPreferenceEntity> {
    const existing = await this.repository.findOne({ where: { userId } });

    if (existing) {
      existing.preferences = preferences;
      return this.repository.save(existing);
    }

    const entity = this.repository.create({ userId, preferences });
    return this.repository.save(entity);
  }
}
