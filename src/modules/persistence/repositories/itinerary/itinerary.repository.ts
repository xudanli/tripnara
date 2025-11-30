import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import {
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
} from '../../entities/itinerary.entity';
import {
  ExpenseEntity,
  ExpenseCategory,
  ExpenseSplitType,
} from '../../entities/expense.entity';
import { ConversationMessageEntity } from '../../entities/conversation.entity';

type CreateItineraryInput = {
  userId?: string;
  destination: string;
  startDate: Date;
  daysCount: number;
  summary?: string;
  totalCost?: number;
  currency?: string;
  currencyInfo?: {
    code: string;
    symbol: string;
    name: string;
  };
  preferences?: Record<string, unknown>;
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };
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
      details?: Record<string, unknown>;
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
    | 'currency'
    | 'currencyInfo'
    | 'preferences'
    | 'practicalInfo'
    | 'status'
  >
>;

@Injectable()
export class ItineraryRepository {
  private readonly logger = new Logger(ItineraryRepository.name);

  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(ItineraryDayEntity)
    private readonly dayRepository: Repository<ItineraryDayEntity>,
    @InjectRepository(ItineraryActivityEntity)
    private readonly activityRepository: Repository<ItineraryActivityEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
    @InjectRepository(ConversationMessageEntity)
    private readonly conversationMessageRepository: Repository<ConversationMessageEntity>,
  ) {}

  async createItinerary(input: CreateItineraryInput): Promise<ItineraryEntity> {
    const itinerary = this.itineraryRepository.create({
      userId: input.userId,
      destination: input.destination,
      startDate: input.startDate,
      daysCount: input.daysCount,
      summary: input.summary,
      totalCost: input.totalCost,
      currency: input.currency,
      currencyInfo: input.currencyInfo,
      preferences: input.preferences,
      practicalInfo: input.practicalInfo,
      status: input.status || 'draft',
    });

    const savedItinerary = await this.itineraryRepository.save(itinerary);

    // 创建天数
    console.log(`[ItineraryRepository] Creating ${input.daysData?.length || 0} days for itinerary ${savedItinerary.id}`);
    
    if (!input.daysData || input.daysData.length === 0) {
      console.warn(`[ItineraryRepository] WARNING: No days data provided for itinerary ${savedItinerary.id}`);
      const result = await this.findById(savedItinerary.id);
      if (!result) {
        throw new Error('Failed to create itinerary');
      }
      return result;
    }
    
    // 批量创建活动（性能优化：减少数据库往返次数）
    const allActivities: Array<{
      dayId: string;
      time: string;
      title: string;
      type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration: number;
      location: { lat: number; lng: number };
      notes?: string;
      cost?: number;
      details?: Record<string, unknown>;
    }> = [];

    for (const dayData of input.daysData) {
      if (!dayData.activities) {
        dayData.activities = [];
      }
      
      const day = this.dayRepository.create({
        itineraryId: savedItinerary.id,
        day: dayData.day,
        date: dayData.date,
      });
      const savedDay = await this.dayRepository.save(day);
      console.log(`[ItineraryRepository] Created day ${savedDay.day} (id: ${savedDay.id}) with ${dayData.activities.length} activities`);

      // 收集活动数据（不立即保存）
      for (const activityData of dayData.activities) {
        allActivities.push({
          dayId: savedDay.id,
          time: activityData.time,
          title: activityData.title,
          type: activityData.type,
          duration: activityData.duration,
          location: activityData.location,
          notes: activityData.notes,
          cost: activityData.cost,
          details: activityData.details,
        });
      }
    }

    // 批量保存所有活动（性能优化）
    if (allActivities.length > 0) {
      const activityEntities = allActivities.map((activityData) =>
        this.activityRepository.create(activityData),
      );
      await this.activityRepository.save(activityEntities);
      console.log(`[ItineraryRepository] Batch saved ${activityEntities.length} activities`);
    }

    // 重新查询以获取完整关联数据
    const result = await this.findById(savedItinerary.id);
    if (!result) {
      throw new Error('Failed to create itinerary');
    }
    
    console.log(`[ItineraryRepository] Created itinerary ${result.id} with ${result.days?.length || 0} days`);
    return result;
  }

  /**
   * 查找行程（带关联数据）
   * 使用 QueryBuilder 确保数据正确加载，并包含备用查询机制以提高稳定性
   */
  async findById(id: string): Promise<ItineraryEntity | null> {
    // 方法1：使用 QueryBuilder 加载关联数据（推荐，性能更好）
    let itinerary = await this.itineraryRepository
      .createQueryBuilder('itinerary')
      .where('itinerary.id = :id', { id })
      .leftJoinAndSelect('itinerary.days', 'day')
      .leftJoinAndSelect('day.activities', 'activity')
      .orderBy('day.day', 'ASC')
      .addOrderBy('activity.time', 'ASC')
      .getOne();

    if (!itinerary) {
      return null;
    }

    // 验证数据完整性
    const hasDays = itinerary.days && Array.isArray(itinerary.days) && itinerary.days.length > 0;
    const daysCount = itinerary.daysCount || 0;

    // 如果关联数据为空但 daysCount > 0，说明数据不一致，尝试备用查询
    if (!hasDays && daysCount > 0) {
      // 方法2：直接查询 days（备用方案）
      const daysFromDb = await this.findDaysByItineraryId(id);
      if (daysFromDb.length > 0) {
        // 手动设置关联数据
        (itinerary as any).days = daysFromDb;
      }
    }

    // 确保每个 day 的 activities 都已正确加载
    if (itinerary.days && Array.isArray(itinerary.days)) {
      for (const day of itinerary.days) {
        if (!day.activities || day.activities.length === 0) {
          // 如果某个 day 的 activities 为空，尝试直接查询
          const activities = await this.activityRepository.find({
            where: { dayId: day.id },
            order: { time: 'ASC' },
          });
          if (activities.length > 0) {
            (day as any).activities = activities;
          }
        }
      }
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
    if (input.currency !== undefined) {
      updateData.currency = input.currency;
    }
    if (input.currencyInfo !== undefined) {
      updateData.currencyInfo = input.currencyInfo;
    }
    if (input.preferences !== undefined) {
      updateData.preferences = input.preferences;
    }
    if (input.practicalInfo !== undefined) {
      updateData.practicalInfo = input.practicalInfo;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    await this.itineraryRepository.update(id, updateData);
    return this.findById(id);
  }

  async deleteItinerary(id: string): Promise<boolean> {
    const result = await this.itineraryRepository.delete({ id });
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
      currency?: string;
      currencyInfo?: {
        code: string;
        symbol: string;
        name: string;
      };
      preferences?: Record<string, unknown>;
      practicalInfo?: {
        weather?: string;
        safety?: string;
        plugType?: string;
        currency?: string;
        culturalTaboos?: string;
        packingList?: string;
        [key: string]: unknown;
      };
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
          details?: Record<string, unknown>;
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
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.currencyInfo !== undefined) updateData.currencyInfo = input.currencyInfo;
    if (input.preferences !== undefined) updateData.preferences = input.preferences;
    if (input.practicalInfo !== undefined) updateData.practicalInfo = input.practicalInfo;
    if (input.status !== undefined) updateData.status = input.status;

    if (Object.keys(updateData).length > 0) {
      await this.itineraryRepository.update(id, updateData);
    }

    // 如果提供了 daysData，更新 days 和 activities
    if (input.daysData && input.daysData.length > 0) {
      // 先删除现有的 days（级联删除 activities）
      await this.dayRepository.delete({ itineraryId: id });

      // 批量创建活动（性能优化：减少数据库往返次数）
      const allActivities: Array<{
        dayId: string;
        time: string;
        title: string;
        type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
        details?: Record<string, unknown>;
      }> = [];

      // 创建新的 days 和收集活动数据
      for (const dayData of input.daysData) {
        const day = this.dayRepository.create({
          itineraryId: id,
          day: dayData.day,
          date: dayData.date,
        });
        const savedDay = await this.dayRepository.save(day);

        // 收集活动数据（不立即保存）
        for (const activityData of dayData.activities) {
          allActivities.push({
            dayId: savedDay.id,
            time: activityData.time,
            title: activityData.title,
            type: activityData.type,
            duration: activityData.duration,
            location: activityData.location,
            notes: activityData.notes,
            cost: activityData.cost,
            details: activityData.details,
          });
        }
      }

      // 批量保存所有活动（性能优化）
      if (allActivities.length > 0) {
        const activityEntities = allActivities.map((activityData) =>
          this.activityRepository.create(activityData),
        );
        await this.activityRepository.save(activityEntities);
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
   * 批量为行程添加天数
   */
  async createDays(
    itineraryId: string,
    inputs: Array<{
      day: number;
      date: Date;
      activities?: Array<{
        time: string;
        title: string;
        type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
        details?: Record<string, unknown>;
      }>;
    }>,
  ): Promise<ItineraryDayEntity[]> {
    const days = inputs.map((input) =>
      this.dayRepository.create({
        itineraryId,
        day: input.day,
        date: input.date,
      }),
    );
    const savedDays = await this.dayRepository.save(days);

    // 如果提供了activities，为每个天数创建活动
    for (let i = 0; i < savedDays.length; i++) {
      const day = savedDays[i];
      const input = inputs[i];
      if (input.activities && Array.isArray(input.activities) && input.activities.length > 0) {
        const activities = input.activities.map((act) =>
          this.activityRepository.create({
            dayId: day.id,
            time: act.time,
            title: act.title,
            type: act.type,
            duration: act.duration,
            location: act.location,
            notes: act.notes,
            cost: act.cost,
            details: act.details,
          }),
        );
        await this.activityRepository.save(activities);
      }
    }

    // 重新查询以获取完整的关联数据（包括activities）
    const dayIds = savedDays.map((day) => day.id);
    const daysWithActivities = await this.dayRepository.find({
      where: dayIds.map((id) => ({ id })),
      relations: ['activities'],
      order: { day: 'ASC' },
    });

    // 排序每个天的活动
    daysWithActivities.forEach((day) => {
      if (day.activities) {
        day.activities.sort((a, b) => a.time.localeCompare(b.time));
      }
    });

    return daysWithActivities;
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
    const result = await this.dayRepository.delete({ id: dayId });
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
   * 批量获取多个天数的活动
   * @param dayIds 天数ID列表，如果为空则获取整个行程的所有活动
   * @param itineraryId 行程ID（用于验证所有权和获取所有天数）
   */
  async findActivitiesByDayIds(
    dayIds: string[] | undefined,
    itineraryId: string,
  ): Promise<Record<string, ItineraryActivityEntity[]>> {
    let targetDayIds = dayIds;

    // 如果没有指定 dayIds，获取整个行程的所有天数
    if (!targetDayIds || targetDayIds.length === 0) {
      const days = await this.findDaysByItineraryId(itineraryId);
      targetDayIds = days.map((day) => day.id);
    }

    if (targetDayIds.length === 0) {
      return {};
    }

    // 批量查询所有指定天数的活动
    const activities = await this.activityRepository.find({
      where: { dayId: In(targetDayIds) },
      order: { dayId: 'ASC', time: 'ASC' },
    });

    // 按 dayId 分组
    const result: Record<string, ItineraryActivityEntity[]> = {};
    activities.forEach((activity) => {
      if (!result[activity.dayId]) {
        result[activity.dayId] = [];
      }
      result[activity.dayId].push(activity);
    });

    // 确保所有请求的 dayIds 都有对应的键（即使为空数组）
    targetDayIds.forEach((dayId) => {
      if (!result[dayId]) {
        result[dayId] = [];
      }
    });

    return result;
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
      details?: Record<string, unknown>;
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
      details: input.details,
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
      details?: Record<string, unknown>;
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
    if (input.details !== undefined) updateData.details = input.details;

    // 如果没有需要更新的字段，直接返回现有数据
    if (Object.keys(updateData).length === 0) {
      return await this.activityRepository.findOne({
        where: { id: activityId },
      });
    }

    // 执行更新
    const result = await this.activityRepository.update(activityId, updateData);
    
    // 检查是否成功更新
    if ((result.affected ?? 0) === 0) {
      return null;
    }

    // 重新查询以确保获取最新数据
    return await this.activityRepository.findOne({
      where: { id: activityId },
    });
  }

  /**
   * 删除指定活动
   */
  async deleteActivity(activityId: string): Promise<boolean> {
    const result = await this.activityRepository.delete({ id: activityId });
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
   * 优化：添加数据验证、批量更新、保持原有时间间隔
   */
  async reorderActivities(
    dayId: string,
    activityIds: string[],
  ): Promise<ItineraryActivityEntity[]> {
    // 1. 获取所有活动并验证
    const activities = await this.findActivitiesByDayId(dayId);
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    // 2. 验证 activityIds 是否都属于这个 dayId
    const invalidIds = activityIds.filter(id => !activityMap.has(id));
    if (invalidIds.length > 0) {
      throw new Error(
        `以下活动不属于此天数: ${invalidIds.join(', ')}`,
      );
    }

    // 3. 验证数量匹配
    if (activityIds.length !== activities.length) {
      throw new Error(
        `活动数量不匹配: 期望 ${activities.length}, 实际 ${activityIds.length}`,
      );
    }

    // 4. 计算时间间隔（基于原有活动的时间分布）
    const timeIntervals: string[] = [];
    if (activities.length > 0) {
      // 如果只有一个活动，保持原时间
      if (activities.length === 1) {
        timeIntervals.push(activities[0].time);
      } else {
        // 计算平均时间间隔
        const sortedActivities = [...activities].sort((a, b) => 
          a.time.localeCompare(b.time)
        );
        const firstTime = this.parseTimeToMinutes(sortedActivities[0].time);
        const lastTime = this.parseTimeToMinutes(sortedActivities[sortedActivities.length - 1].time);
        const totalDuration = lastTime - firstTime;
        const interval = totalDuration / (activities.length - 1);

        // 生成新的时间序列
        for (let i = 0; i < activityIds.length; i++) {
          const minutes = firstTime + Math.round(interval * i);
          timeIntervals.push(this.minutesToTimeString(minutes));
        }
      }
    }

    // 5. 批量更新（优化性能）
    const updatePromises = activityIds.map((activityId, index) => {
      const newTime = timeIntervals[index] || activities[index]?.time || '09:00';
      return this.activityRepository.update(activityId, { time: newTime });
    });

    await Promise.all(updatePromises);

    // 6. 重新查询并返回
    return await this.findActivitiesByDayId(dayId);
  }

  /**
   * 将时间字符串（HH:MM）转换为分钟数
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 将分钟数转换为时间字符串（HH:MM）
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24; // 确保不超过24小时
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
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

  /**
   * 获取行程的所有支出记录
   */
  async findExpensesByItineraryId(
    itineraryId: string,
    filters?: {
      category?: ExpenseCategory;
      startDate?: Date;
      endDate?: Date;
      payerId?: string;
    },
  ): Promise<ExpenseEntity[]> {
    const where: FindOptionsWhere<ExpenseEntity> = { itineraryId };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.payerId) {
      where.payerId = filters.payerId;
    }

    const expenses = await this.expenseRepository.find({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    // 如果提供了日期范围，在内存中过滤（因为 date 是 date 类型，查询比较麻烦）
    if (filters?.startDate || filters?.endDate) {
      return expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        if (filters.startDate && expenseDate < filters.startDate) {
          return false;
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (expenseDate > endDate) {
            return false;
          }
        }
        return true;
      });
    }

    return expenses;
  }

  /**
   * 计算支出总额
   */
  async calculateTotalExpenses(
    itineraryId: string,
    currencyCode?: string,
  ): Promise<number> {
    const expenses = await this.findExpensesByItineraryId(itineraryId);

    if (currencyCode) {
      // 如果指定了货币代码，只计算该货币的支出
      const filteredExpenses = expenses.filter(
        (expense) => expense.currencyCode === currencyCode,
      );
      return filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    }

    // 默认计算所有支出（不进行货币转换）
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  /**
   * 创建支出记录
   */
  async createExpense(
    itineraryId: string,
    input: {
      title: string;
      amount: number;
      currencyCode: string;
      category?: ExpenseCategory;
      location?: string;
      payerId?: string;
      payerName?: string;
      splitType?: ExpenseSplitType;
      splitDetails?: Record<string, number>;
      date: Date;
      notes?: string;
    },
  ): Promise<ExpenseEntity> {
    const expense = this.expenseRepository.create({
      itineraryId,
      title: input.title,
      amount: input.amount,
      currencyCode: input.currencyCode || 'USD',
      category: input.category,
      location: input.location,
      payerId: input.payerId,
      payerName: input.payerName,
      splitType: input.splitType || 'none',
      splitDetails: input.splitDetails,
      date: input.date,
      notes: input.notes,
    });

    return await this.expenseRepository.save(expense);
  }

  /**
   * 更新支出记录
   */
  async updateExpense(
    expenseId: string,
    input: {
      title?: string;
      amount?: number;
      currencyCode?: string;
      category?: ExpenseCategory;
      location?: string;
      payerId?: string;
      payerName?: string;
      splitType?: ExpenseSplitType;
      splitDetails?: Record<string, number>;
      date?: Date;
      notes?: string;
    },
  ): Promise<ExpenseEntity | null> {
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.currencyCode !== undefined) updateData.currencyCode = input.currencyCode;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.payerId !== undefined) updateData.payerId = input.payerId;
    if (input.payerName !== undefined) updateData.payerName = input.payerName;
    if (input.splitType !== undefined) updateData.splitType = input.splitType;
    if (input.splitDetails !== undefined) updateData.splitDetails = input.splitDetails;
    if (input.date !== undefined) updateData.date = input.date;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await this.expenseRepository.update(expenseId, updateData);
    return await this.expenseRepository.findOne({ where: { id: expenseId } });
  }

  /**
   * 删除支出记录
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    const result = await this.expenseRepository.delete({ id: expenseId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 检查支出是否属于指定行程
   */
  async checkExpenseOwnership(
    expenseId: string,
    itineraryId: string,
  ): Promise<boolean> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, itineraryId },
      select: ['id'],
    });
    return !!expense;
  }

  // ========== 对话消息管理方法 ==========

  /**
   * 保存对话消息
   */
  async saveConversationMessage(
    conversationId: string,
    journeyId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConversationMessageEntity> {
    // 获取当前对话的最大序号
    const maxSequence = await this.conversationMessageRepository
      .createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId })
      .select('MAX(msg.sequence)', 'max')
      .getRawOne();

    const nextSequence = (maxSequence?.max || 0) + 1;

    const message = this.conversationMessageRepository.create({
      conversationId,
      journeyId,
      userId,
      role,
      content,
      sequence: nextSequence,
      metadata: metadata || null,
    });

    return await this.conversationMessageRepository.save(message);
  }

  /**
   * 获取对话历史消息
   */
  async getConversationHistory(
    conversationId: string,
    limit?: number,
  ): Promise<ConversationMessageEntity[]> {
    const queryBuilder = this.conversationMessageRepository
      .createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId })
      .orderBy('msg.sequence', 'ASC')
      .addOrderBy('msg.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  /**
   * 获取行程的所有对话ID列表
   */
  async getConversationIdsByJourney(
    journeyId: string,
  ): Promise<string[]> {
    const conversations = await this.conversationMessageRepository
      .createQueryBuilder('msg')
      .select('DISTINCT msg.conversationId', 'conversationId')
      .where('msg.journeyId = :journeyId', { journeyId })
      .orderBy('msg.createdAt', 'DESC')
      .getRawMany();

    return conversations.map((c) => c.conversationId);
  }

  /**
   * 删除对话的所有消息
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const result = await this.conversationMessageRepository.delete({
      conversationId,
    });
    return (result.affected ?? 0) > 0;
  }
}

