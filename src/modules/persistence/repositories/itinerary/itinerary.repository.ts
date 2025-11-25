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

  /**
   * 获取行程的所有天数
   */
  async findDaysByItineraryId(itineraryId: string): Promise<ItineraryDayEntity[]> {
    const days = await this.dayRepository.find({
      where: { itineraryId },
      relations: ['activities'],
      order: { day: 'ASC' },
    });

    // 排序每个天的活动
    days.forEach((day) => {
      if (day.activities) {
        day.activities.sort((a, b) => a.time.localeCompare(b.time));
      }
    });

    return days;
  }

  /**
   * 为行程添加天数
   */
  async createDay(
    itineraryId: string,
    input: {
      day: number;
      date: Date;
    },
  ): Promise<ItineraryDayEntity> {
    const day = this.dayRepository.create({
      itineraryId,
      day: input.day,
      date: input.date,
    });
    return await this.dayRepository.save(day);
  }

  /**
   * 更新指定天数
   */
  async updateDay(
    dayId: string,
    input: {
      day?: number;
      date?: Date;
    },
  ): Promise<ItineraryDayEntity | null> {
    const updateData: any = {};
    if (input.day !== undefined) updateData.day = input.day;
    if (input.date !== undefined) updateData.date = input.date;

    await this.dayRepository.update(dayId, updateData);
    return await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['activities'],
    });
  }

  /**
   * 删除指定天数（会级联删除 activities）
   */
  async deleteDay(dayId: string): Promise<boolean> {
    const result = await this.dayRepository.delete(dayId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * 检查天数是否属于指定行程
   */
  async checkDayOwnership(dayId: string, itineraryId: string): Promise<boolean> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, itineraryId },
      select: ['id'],
    });
    return !!day;
  }

  /**
   * 获取指定天数的所有活动
   */
  async findActivitiesByDayId(dayId: string): Promise<ItineraryActivityEntity[]> {
    return await this.activityRepository.find({
      where: { dayId },
      order: { time: 'ASC' },
    });
  }

  /**
   * 为指定天数添加活动
   */
  async createActivity(
    dayId: string,
    input: {
      time: string;
      title: string;
      type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration: number;
      location: { lat: number; lng: number };
      notes?: string;
      cost?: number;
    },
  ): Promise<ItineraryActivityEntity> {
    const activity = this.activityRepository.create({
      dayId,
      time: input.time,
      title: input.title,
      type: input.type,
      duration: input.duration,
      location: input.location,
      notes: input.notes,
      cost: input.cost,
    });
    return await this.activityRepository.save(activity);
  }

  /**
   * 更新指定活动
   */
  async updateActivity(
    activityId: string,
    input: {
      time?: string;
      title?: string;
      type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration?: number;
      location?: { lat: number; lng: number };
      notes?: string;
      cost?: number;
    },
  ): Promise<ItineraryActivityEntity | null> {
    const updateData: any = {};
    if (input.time !== undefined) updateData.time = input.time;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.cost !== undefined) updateData.cost = input.cost;

    await this.activityRepository.update(activityId, updateData);
    return await this.activityRepository.findOne({
      where: { id: activityId },
    });
  }

  /**
   * 删除指定活动
   */
  async deleteActivity(activityId: string): Promise<boolean> {
    const result = await this.activityRepository.delete(activityId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * 检查活动是否属于指定天数
   */
  async checkActivityOwnership(activityId: string, dayId: string): Promise<boolean> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, dayId },
      select: ['id'],
    });
    return !!activity;
  }

  /**
   * 重新排序活动（通过更新 time 字段）
   */
  async reorderActivities(
    dayId: string,
    activityIds: string[],
  ): Promise<ItineraryActivityEntity[]> {
    // 获取所有活动
    const activities = await this.findActivitiesByDayId(dayId);
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    // 按照新的顺序更新 time 字段（使用索引作为时间排序）
    for (let i = 0; i < activityIds.length; i++) {
      const activityId = activityIds[i];
      const activity = activityMap.get(activityId);
      if (activity) {
        // 使用索引生成时间字符串，保持原有格式（HH:MM）
        const hours = Math.floor(i / 2);
        const minutes = (i % 2) * 30;
        const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        await this.activityRepository.update(activityId, { time: newTime });
      }
    }

    return await this.findActivitiesByDayId(dayId);
  }

  // ========== 任务管理方法 ==========

  async getTasks(itineraryId: string): Promise<Array<Record<string, unknown>>> {
    const itinerary = await this.itineraryRepository.findOne({
      where: { id: itineraryId },
      select: ['tasks'],
    });

    if (!itinerary) {
      throw new Error('行程不存在');
    }

    return (itinerary.tasks as Array<Record<string, unknown>>) || [];
  }

  async updateTasks(
    itineraryId: string,
    tasks: Array<Record<string, unknown>>,
  ): Promise<void> {
    await this.itineraryRepository.update(itineraryId, { tasks: tasks as any });
  }

  async addTask(
    itineraryId: string,
    task: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    const tasks = await this.getTasks(itineraryId);
    const newTask = {
      ...task,
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: task.createdAt || Date.now(),
      autoGenerated: task.autoGenerated || false,
    };
    tasks.push(newTask);
    await this.updateTasks(itineraryId, tasks);
    return tasks;
  }

  async updateTask(
    itineraryId: string,
    taskId: string,
    updates: Partial<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const tasks = await this.getTasks(itineraryId);
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('任务不存在');
    }
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    await this.updateTasks(itineraryId, tasks);
    return tasks;
  }

  async deleteTask(
    itineraryId: string,
    taskId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const tasks = await this.getTasks(itineraryId);
    const filteredTasks = tasks.filter((t) => t.id !== taskId);
    if (filteredTasks.length === tasks.length) {
      throw new Error('任务不存在');
    }
    await this.updateTasks(itineraryId, filteredTasks);
    return filteredTasks;
  }

  async updateSafetyNotice(
    itineraryId: string,
    safetyNotice: Record<string, unknown>,
  ): Promise<void> {
    await this.itineraryRepository.update(itineraryId, {
      safetyNotice: safetyNotice as any,
    });
  }
}

