import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventbriteConnectionEntity } from '../../entities/eventbrite-connection.entity';

@Injectable()
export class EventbriteConnectionRepository {
  constructor(
    @InjectRepository(EventbriteConnectionEntity)
    private readonly repository: Repository<EventbriteConnectionEntity>,
  ) {}

  async findByUserId(
    userId: string,
  ): Promise<EventbriteConnectionEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async upsertConnection(
    userId: string,
    payload: Partial<EventbriteConnectionEntity>,
  ): Promise<EventbriteConnectionEntity> {
    const existing = await this.repository.findOne({ where: { userId } });
    if (existing) {
      Object.assign(existing, payload);
      return this.repository.save(existing);
    }
    const entity = this.repository.create({ userId, ...payload });
    return this.repository.save(entity);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}

