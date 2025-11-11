import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JourneyEntity } from '../../entities/journey.entity';

type CreateJourneyInput = Partial<JourneyEntity>;
type UpdateJourneyInput = Partial<JourneyEntity>;

@Injectable()
export class JourneyRepository {
  constructor(
    @InjectRepository(JourneyEntity)
    private readonly repository: Repository<JourneyEntity>,
  ) {}

  async createJourney(input: CreateJourneyInput): Promise<JourneyEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<JourneyEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<JourneyEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateJourney(
    id: string,
    input: UpdateJourneyInput,
  ): Promise<JourneyEntity | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    Object.assign(entity, input);
    return this.repository.save(entity);
  }

  async deleteJourney(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
