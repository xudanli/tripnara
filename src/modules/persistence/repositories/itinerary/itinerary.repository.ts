import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
} from '../../entities/itinerary.entity';

type CreateItineraryInput = {
  userId?: string;
  destination: string;
  startDate: Date;
  daysCount: number;
  summary?: string;
  totalCost?: number;
  preferences?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'archived';
  daysData: Array<{
    day: number;
    date: Date;
    activities: Array<{
      time: string;
      title: string;
      type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration: number;
      location: { lat: number; lng: number };
      notes?: string;
      cost?: number;
    }>;
  }>;
};

type UpdateItineraryInput = Partial<
  Pick<
    ItineraryEntity,
    | 'destination'
    | 'startDate'
    | 'daysCount'
    | 'summary'
    | 'totalCost'
    | 'preferences'
    | 'status'
  >
>;

@Injectable()
export class ItineraryRepository {
  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(ItineraryDayEntity)
    private readonly dayRepository: Repository<ItineraryDayEntity>,
    @InjectRepository(ItineraryActivityEntity)
    private readonly activityRepository: Repository<ItineraryActivityEntity>,
  ) {}

  async createItinerary(input: CreateItineraryInput): Promise<ItineraryEntity> {
    const itinerary = this.itineraryRepository.create({
      userId: input.userId,
      destination: input.destination,
      startDate: input.startDate,
      daysCount: input.daysCount,
      summary: input.summary,
      totalCost: input.totalCost,
      preferences: input.preferences,
      status: input.status || 'draft',
    });

    const savedItinerary = await this.itineraryRepository.save(itinerary);

    // 创建天数
    for (const dayData of input.daysData) {
      const day = this.dayRepository.create({
        itineraryId: savedItinerary.id,
        day: dayData.day,
        date: dayData.date,
      });
      const savedDay = await this.dayRepository.save(day);

      // 创建活动
      for (const activityData of dayData.activities) {
        const activity = this.activityRepository.create({
          dayId: savedDay.id,
          time: activityData.time,
          title: activityData.title,
          type: activityData.type,
          duration: activityData.duration,
          location: activityData.location,
          notes: activityData.notes,
          cost: activityData.cost,
        });
        await this.activityRepository.save(activity);
      }
    }

    // 重新查询以获取完整关联数据
    const result = await this.findById(savedItinerary.id);
    if (!result) {
      throw new Error('Failed to create itinerary');
    }
    return result;
  }

  async findById(id: string): Promise<ItineraryEntity | null> {
    const itinerary = await this.itineraryRepository.findOne({
      where: { id },
      relations: ['days', 'days.activities'],
    });

    if (!itinerary) {
      return null;
    }

    // 手动排序天数
    if (itinerary.days) {
      itinerary.days.sort((a, b) => a.day - b.day);
      // 排序每个天的活动
      itinerary.days.forEach((day) => {
        if (day.activities) {
          day.activities.sort((a, b) => a.time.localeCompare(b.time));
        }
      });
    }

    return itinerary;
  }

  async findByUserId(
    userId: string,
    options?: {
      status?: 'draft' | 'published' | 'archived';
      limit?: number;
      offset?: number;
    },
  ): Promise<[ItineraryEntity[], number]> {
    const queryBuilder = this.itineraryRepository
      .createQueryBuilder('itinerary')
      .leftJoinAndSelect('itinerary.days', 'days')
      .leftJoinAndSelect('days.activities', 'activities')
      .where('itinerary.userId = :userId', { userId })
      .orderBy('itinerary.createdAt', 'DESC')
      .addOrderBy('days.day', 'ASC');

    if (options?.status) {
      queryBuilder.andWhere('itinerary.status = :status', {
        status: options.status,
      });
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async findAll(
    options?: {
      status?: 'draft' | 'published' | 'archived';
      limit?: number;
      offset?: number;
    },
  ): Promise<[ItineraryEntity[], number]> {
    const queryBuilder = this.itineraryRepository
      .createQueryBuilder('itinerary')
      .leftJoinAndSelect('itinerary.days', 'days')
      .leftJoinAndSelect('days.activities', 'activities')
      .orderBy('itinerary.createdAt', 'DESC')
      .addOrderBy('days.day', 'ASC');

    if (options?.status) {
      queryBuilder.andWhere('itinerary.status = :status', {
        status: options.status,
      });
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async updateItinerary(
    id: string,
    input: UpdateItineraryInput,
  ): Promise<ItineraryEntity | null> {
    // 构建更新对象，处理 JSONB 字段
    const updateData: any = {};
    
    if (input.destination !== undefined) {
      updateData.destination = input.destination;
    }
    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate;
    }
    if (input.daysCount !== undefined) {
      updateData.daysCount = input.daysCount;
    }
    if (input.summary !== undefined) {
      updateData.summary = input.summary;
    }
    if (input.totalCost !== undefined) {
      updateData.totalCost = input.totalCost;
    }
    if (input.preferences !== undefined) {
      updateData.preferences = input.preferences;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    await this.itineraryRepository.update(id, updateData);
    return this.findById(id);
  }

  async deleteItinerary(id: string): Promise<boolean> {
    const result = await this.itineraryRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async checkOwnership(
    id: string,
    userId: string,
  ): Promise<boolean> {
    const itinerary = await this.itineraryRepository.findOne({
      where: { id, userId },
      select: ['id'],
    });
    return !!itinerary;
  }

  /**
   * 更新行程的完整数据，包括 days 和 activities
   */
  async updateItineraryWithDays(
    id: string,
    input: {
      destination?: string;
      startDate?: Date;
      daysCount?: number;
      summary?: string;
      totalCost?: number;
      preferences?: Record<string, unknown>;
      status?: 'draft' | 'published' | 'archived';
      daysData?: Array<{
        day: number;
        date: Date;
        activities: Array<{
          time: string;
          title: string;
          type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
          duration: number;
          location: { lat: number; lng: number };
          notes?: string;
          cost?: number;
        }>;
      }>;
    },
  ): Promise<ItineraryEntity | null> {
    // 更新主表字段
    const updateData: any = {};
    if (input.destination !== undefined) updateData.destination = input.destination;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.daysCount !== undefined) updateData.daysCount = input.daysCount;
    if (input.summary !== undefined) updateData.summary = input.summary;
    if (input.totalCost !== undefined) updateData.totalCost = input.totalCost;
    if (input.preferences !== undefined) updateData.preferences = input.preferences;
    if (input.status !== undefined) updateData.status = input.status;

    if (Object.keys(updateData).length > 0) {
      await this.itineraryRepository.update(id, updateData);
    }

    // 如果提供了 daysData，更新 days 和 activities
    if (input.daysData && input.daysData.length > 0) {
      // 先删除现有的 days（级联删除 activities）
      await this.dayRepository.delete({ itineraryId: id });

      // 创建新的 days 和 activities
      for (const dayData of input.daysData) {
        const day = this.dayRepository.create({
          itineraryId: id,
          day: dayData.day,
          date: dayData.date,
        });
        const savedDay = await this.dayRepository.save(day);

        // 创建活动
        for (const activityData of dayData.activities) {
          const activity = this.activityRepository.create({
            dayId: savedDay.id,
            time: activityData.time,
            title: activityData.title,
            type: activityData.type,
            duration: activityData.duration,
            location: activityData.location,
            notes: activityData.notes,
            cost: activityData.cost,
          });
          await this.activityRepository.save(activity);
        }
      }
    }

    return this.findById(id);
  }
}

