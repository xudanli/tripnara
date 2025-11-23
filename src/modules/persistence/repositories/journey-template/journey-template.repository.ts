import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../../entities/journey-template.entity';

type CreateJourneyTemplateInput = {
  title: string;
  coverImage?: string;
  destination?: string;
  durationDays?: number;
  summary?: string;
  description?: string;
  coreInsight?: string;
  safetyNotice?: Record<string, unknown>;
  journeyBackground?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  language?: string;
  status?: 'draft' | 'published' | 'archived';
  daysData: Array<{
    dayNumber: number;
    title?: string;
    summary?: string;
    detailsJson?: Record<string, unknown>;
    timeSlots: Array<{
      sequence: number;
      startTime?: string;
      durationMinutes?: number;
      type?: string;
      title?: string;
      activityHighlights?: Record<string, unknown>;
      scenicIntro?: string;
      notes?: string;
      cost?: number;
      currencyCode?: string;
      locationJson?: { lat: number; lng: number };
      detailsJson?: Record<string, unknown>;
    }>;
  }>;
};

type UpdateJourneyTemplateInput = Partial<
  Pick<
    JourneyTemplateEntity,
    | 'title'
    | 'coverImage'
    | 'destination'
    | 'durationDays'
    | 'summary'
    | 'description'
    | 'coreInsight'
    | 'safetyNotice'
    | 'journeyBackground'
    | 'preferences'
    | 'language'
    | 'status'
  >
>;

@Injectable()
export class JourneyTemplateRepository {
  constructor(
    @InjectRepository(JourneyTemplateEntity)
    private readonly templateRepository: Repository<JourneyTemplateEntity>,
    @InjectRepository(TemplateDayEntity)
    private readonly dayRepository: Repository<TemplateDayEntity>,
    @InjectRepository(TemplateTimeSlotEntity)
    private readonly timeSlotRepository: Repository<TemplateTimeSlotEntity>,
  ) {}

  async createTemplate(
    input: CreateJourneyTemplateInput,
  ): Promise<JourneyTemplateEntity> {
    const newTemplate = this.templateRepository.create({
      title: input.title,
      coverImage: input.coverImage,
      destination: input.destination,
      durationDays: input.durationDays,
      summary: input.summary,
      description: input.description,
      coreInsight: input.coreInsight,
      safetyNotice: input.safetyNotice,
      journeyBackground: input.journeyBackground,
      preferences: input.preferences,
      language: input.language || 'zh-CN',
      status: input.status || 'draft',
    });

    const savedTemplate = await this.templateRepository.save(newTemplate);

    // 创建天数
    console.log(`[JourneyTemplateRepository] Creating ${input.daysData.length} days for template ${savedTemplate.id}`);
    for (const dayData of input.daysData) {
      const day = this.dayRepository.create({
        templateId: savedTemplate.id,
        dayNumber: dayData.dayNumber,
        title: dayData.title,
        summary: dayData.summary,
        detailsJson: dayData.detailsJson,
      });
      const savedDay = await this.dayRepository.save(day);
      console.log(`[JourneyTemplateRepository] Created day ${savedDay.dayNumber} with ${dayData.timeSlots.length} timeSlots`);

      // 创建时段活动
      for (const slotData of dayData.timeSlots) {
        const slot = this.timeSlotRepository.create({
          dayId: savedDay.id,
          sequence: slotData.sequence,
          startTime: slotData.startTime,
          durationMinutes: slotData.durationMinutes,
          type: slotData.type,
          title: slotData.title,
          activityHighlights: slotData.activityHighlights,
          scenicIntro: slotData.scenicIntro,
          notes: slotData.notes,
          cost: slotData.cost,
          currencyCode: slotData.currencyCode,
          locationJson: slotData.locationJson,
          detailsJson: slotData.detailsJson,
        });
        await this.timeSlotRepository.save(slot);
      }
    }

    // 重新查询以获取完整关联数据
    console.log(`[JourneyTemplateRepository] Querying template ${savedTemplate.id} with relations`);
    
    // 手动查询并组装数据，避免 TypeORM 关联加载问题
    const result = await this.templateRepository.findOne({
      where: { id: savedTemplate.id },
    });

    if (!result) {
      throw new Error('Failed to create journey template');
    }

    // 手动查询 days
    const days = await this.dayRepository.find({
      where: { templateId: savedTemplate.id },
      order: { dayNumber: 'ASC' },
    });

    console.log(`[JourneyTemplateRepository] Found ${days.length} days for template ${savedTemplate.id}`);

    // 为每个 day 查询 timeSlots
    for (const day of days) {
      const timeSlots = await this.timeSlotRepository.find({
        where: { dayId: day.id },
        order: { sequence: 'ASC' },
      });
      day.timeSlots = timeSlots;
      console.log(`[JourneyTemplateRepository] Day ${day.dayNumber} has ${timeSlots.length} timeSlots`);
    }

    // 将 days 赋值给 result
    result.days = days;

    console.log(`[JourneyTemplateRepository] Query result: days count=${result.days?.length || 0}`);
    return result;
  }

  async findById(id: string): Promise<JourneyTemplateEntity | null> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['days', 'days.timeSlots'],
    });

    if (!template) {
      return null;
    }

    // 手动排序天数和时段
    if (template.days) {
      template.days.sort((a, b) => a.dayNumber - b.dayNumber);
      // 排序每个天的时段
      template.days.forEach((day) => {
        if (day.timeSlots) {
          day.timeSlots.sort((a, b) => a.sequence - b.sequence);
        }
      });
    } else {
      // 如果 days 未加载，尝试手动查询
      const days = await this.dayRepository.find({
        where: { templateId: id },
        relations: ['timeSlots'],
        order: { dayNumber: 'ASC' },
      });
      template.days = days;
      days.forEach((day) => {
        if (day.timeSlots) {
          day.timeSlots.sort((a, b) => a.sequence - b.sequence);
        }
      });
    }

    return template;
  }

  async findAll(
    options?: {
      status?: 'draft' | 'published' | 'archived';
      language?: string;
      destination?: string;
      keyword?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<[JourneyTemplateEntity[], number]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.days', 'days')
      .leftJoinAndSelect('days.timeSlots', 'timeSlots')
      .orderBy('template.createdAt', 'DESC')
      .addOrderBy('days.dayNumber', 'ASC')
      .addOrderBy('timeSlots.sequence', 'ASC');

    if (options?.status) {
      queryBuilder.andWhere('template.status = :status', {
        status: options.status,
      });
    }

    if (options?.language) {
      queryBuilder.andWhere('template.language = :language', {
        language: options.language,
      });
    }

    if (options?.destination) {
      queryBuilder.andWhere('template.destination ILIKE :destination', {
        destination: `%${options.destination}%`,
      });
    }

    if (options?.keyword) {
      queryBuilder.andWhere(
        '(template.title ILIKE :keyword OR template.summary ILIKE :keyword OR template.destination ILIKE :keyword)',
        { keyword: `%${options.keyword}%` },
      );
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async updateTemplate(
    id: string,
    input: UpdateJourneyTemplateInput,
  ): Promise<JourneyTemplateEntity | null> {
    const updateData: any = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.coverImage !== undefined) updateData.coverImage = input.coverImage;
    if (input.destination !== undefined)
      updateData.destination = input.destination;
    if (input.durationDays !== undefined)
      updateData.durationDays = input.durationDays;
    if (input.summary !== undefined) updateData.summary = input.summary;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.coreInsight !== undefined)
      updateData.coreInsight = input.coreInsight;
    if (input.safetyNotice !== undefined)
      updateData.safetyNotice = input.safetyNotice;
    if (input.journeyBackground !== undefined)
      updateData.journeyBackground = input.journeyBackground;
    if (input.preferences !== undefined)
      updateData.preferences = input.preferences;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.status !== undefined) updateData.status = input.status;

    await this.templateRepository.update(id, updateData);
    return this.findById(id);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.templateRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

