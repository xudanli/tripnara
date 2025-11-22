import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../persistence/entities/journey-template.entity';
import {
  CreateTemplateDayRequestDto,
  CreateTemplateDto,
  CreateTemplateSlotRequestDto,
  TemplateQueryDto,
  TemplateDayDto,
  TemplateTimeSlotDto,
  UpdateTemplateDayRequestDto,
  UpdateTemplateDto,
  UpdateTemplateSlotRequestDto,
} from './dto/template.dto';
import {
  CreateItineraryRequestDto,
  ItineraryDayDto,
  ItineraryActivityDto,
} from '../itinerary/dto/itinerary.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(JourneyTemplateEntity)
    private readonly templateRepository: Repository<JourneyTemplateEntity>,
    @InjectRepository(TemplateDayEntity)
    private readonly dayRepository: Repository<TemplateDayEntity>,
    @InjectRepository(TemplateTimeSlotEntity)
    private readonly slotRepository: Repository<TemplateTimeSlotEntity>,
  ) {}

  async listTemplates(query: TemplateQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      mode,
      keyword,
      modePrimary,
      modeTags,
      language,
    } = query;

    // 调试日志
    console.log('[TemplateService] Query params:', {
      mode,
      status,
      modePrimary,
      modeTags,
      keyword,
      language,
    });

    const qb = this.templateRepository.createQueryBuilder('template');

    // 只有当 status 不为 'all' 时才添加过滤条件
    if (status && status !== 'all') {
      qb.andWhere('template.status = :status', { status });
    }

    // 只有当 mode 不为 'all' 时才添加过滤条件
    if (mode && mode !== 'all' && mode.trim() !== 'all') {
      qb.andWhere('template.mode = :mode', { mode: mode.trim() });
    }

    // 支持 modePrimary 过滤
    if (modePrimary) {
      qb.andWhere('template.modePrimary = :modePrimary', { modePrimary });
    }

    // 支持 modeTags 过滤（支持逗号分隔的多个标签，使用 LIKE 匹配）
    if (modeTags) {
      const tags = Array.isArray(modeTags) 
        ? modeTags.map(t => String(t).trim()).filter(t => t)
        : String(modeTags).split(',').map(t => t.trim()).filter(t => t);
      if (tags.length > 0) {
        const tagConditions = tags.map((tag, index) => {
          const paramName = `tag${index}`;
          return `template.modeTags ILIKE :${paramName}`;
        });
        const tagParams: Record<string, string> = {};
        tags.forEach((tag, index) => {
          tagParams[`tag${index}`] = `%${tag}%`;
        });
        qb.andWhere(`(${tagConditions.join(' OR ')})`, tagParams);
      }
    }

    if (keyword) {
      qb.andWhere(
        '(template.title ILIKE :keyword OR template.summary ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (language) {
      qb.andWhere('template.language = :language', { language });
    }

    qb.orderBy('template.updatedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getTemplateById(templateId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: {
        days: {
          timeSlots: true,
        },
      },
      order: {
        days: {
          dayNumber: 'ASC',
          timeSlots: { sequence: 'ASC' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return template;
  }

  async createTemplate(dto: CreateTemplateDto) {
    const template = this.templateRepository.create({
      ...dto,
      language: dto.language || 'zh-CN',
      days:
        dto.days?.map((day, index) =>
          this.dayRepository.create({
            dayNumber: day.dayNumber ?? index + 1,
            title: day.title,
            summary: day.summary,
            detailsJson: day.detailsJson,
            timeSlots: day.timeSlots?.map((slot, slotIndex) =>
              this.slotRepository.create({
                sequence: slot.sequence ?? slotIndex + 1,
                startTime: slot.startTime,
                durationMinutes: slot.durationMinutes,
                type: slot.type,
                title: slot.title,
                activityHighlights: slot.activityHighlights,
                scenicIntro: slot.scenicIntro,
                locationJson: slot.locationJson,
                detailsJson: slot.detailsJson,
              }),
            ),
          }),
        ) ?? [],
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(templateId: string, dto: UpdateTemplateDto) {
    const template = await this.templateRepository.preload({
      id: templateId,
      ...dto,
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return this.templateRepository.save(template);
  }

  async deleteTemplate(templateId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    await this.templateRepository.remove(template);
    return { success: true };
  }

  async publishTemplate(templateId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    template.status = 'published';
    return this.templateRepository.save(template);
  }

  async cloneTemplate(templateId: string) {
    const template = await this.getTemplateById(templateId);

    const {
      days,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...rest
    } = template;
    void _createdAt;
    void _updatedAt;

    const clone = this.templateRepository.create({
      ...rest,
      id: undefined,
      status: 'draft',
      title: `${template.title} Copy`,
      days: days?.map((day) =>
        this.dayRepository.create({
          dayNumber: day.dayNumber,
          title: day.title,
          summary: day.summary,
          detailsJson: day.detailsJson,
          timeSlots: day.timeSlots?.map((slot) =>
            this.slotRepository.create({
              sequence: slot.sequence,
              startTime: slot.startTime,
              durationMinutes: slot.durationMinutes,
              type: slot.type,
              title: slot.title,
              activityHighlights: slot.activityHighlights,
              scenicIntro: slot.scenicIntro,
              locationJson: slot.locationJson,
              detailsJson: slot.detailsJson,
            }),
          ),
        }),
      ),
    });

    return this.templateRepository.save(clone);
  }

  async listDays(templateId: string) {
    const template = await this.getTemplateById(templateId);
    return template.days;
  }

  async createDay(templateId: string, dto: CreateTemplateDayRequestDto) {
    await this.ensureTemplateExists(templateId);
    const existing = await this.dayRepository.find({
      where: { templateId },
      order: { dayNumber: 'ASC' },
    });

    const dayNumber = dto.dayNumber ?? existing.length + 1;
    if (existing.some((day) => day.dayNumber === dayNumber)) {
      throw new BadRequestException('dayNumber 已存在，请调整序号');
    }

    const day = this.dayRepository.create({
      templateId,
      dayNumber,
      title: dto.title,
      summary: dto.summary,
      detailsJson: dto.detailsJson,
      timeSlots: dto.timeSlots?.map((slot, index) =>
        this.slotRepository.create({
          sequence: slot.sequence ?? index + 1,
          startTime: slot.startTime,
          durationMinutes: slot.durationMinutes,
          type: slot.type,
          title: slot.title,
          activityHighlights: slot.activityHighlights,
          scenicIntro: slot.scenicIntro,
          locationJson: slot.locationJson,
          detailsJson: slot.detailsJson,
        }),
      ),
    });
    return this.dayRepository.save(day);
  }

  async updateDay(
    templateId: string,
    dayId: string,
    dto: UpdateTemplateDayRequestDto,
  ) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, templateId },
    });
    if (!day) {
      throw new NotFoundException('模板日程不存在');
    }

    if (dto.dayNumber && dto.dayNumber !== day.dayNumber) {
      const conflict = await this.dayRepository.findOne({
        where: { templateId, dayNumber: dto.dayNumber },
      });
      if (conflict) {
        throw new BadRequestException('目标 dayNumber 已存在');
      }
    }

    Object.assign(day, dto);
    return this.dayRepository.save(day);
  }

  async deleteDay(templateId: string, dayId: string) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, templateId },
    });
    if (!day) {
      throw new NotFoundException('模板日程不存在');
    }
    await this.dayRepository.remove(day);
    return { success: true };
  }

  async listSlots(templateId: string, dayId: string) {
    await this.ensureTemplateDay(templateId, dayId);
    return this.slotRepository.find({
      where: { dayId },
      order: { sequence: 'ASC' },
    });
  }

  async createSlot(
    templateId: string,
    dayId: string,
    dto: CreateTemplateSlotRequestDto,
  ) {
    await this.ensureTemplateDay(templateId, dayId);
    const existing = await this.slotRepository.find({
      where: { dayId },
      order: { sequence: 'ASC' },
    });
    const sequence = dto.sequence ?? existing.length + 1;
    if (existing.some((slot) => slot.sequence === sequence)) {
      throw new BadRequestException('序号已存在，请调整 sequence');
    }

    const slot = this.slotRepository.create({
      dayId,
      sequence,
      startTime: dto.startTime,
      durationMinutes: dto.durationMinutes,
      type: dto.type,
      title: dto.title,
      activityHighlights: dto.activityHighlights,
      scenicIntro: dto.scenicIntro,
      locationJson: dto.locationJson,
      detailsJson: dto.detailsJson,
    });

    return this.slotRepository.save(slot);
  }

  async updateSlot(
    templateId: string,
    dayId: string,
    slotId: string,
    dto: UpdateTemplateSlotRequestDto,
  ) {
    await this.ensureTemplateDay(templateId, dayId);
    const slot = await this.slotRepository.findOne({
      where: { id: slotId, dayId },
    });
    if (!slot) {
      throw new NotFoundException('模板时段不存在');
    }

    if (dto.sequence && dto.sequence !== slot.sequence) {
      const conflict = await this.slotRepository.findOne({
        where: { dayId, sequence: dto.sequence },
      });
      if (conflict) {
        throw new BadRequestException('目标 sequence 已存在');
      }
    }

    Object.assign(slot, dto);
    return this.slotRepository.save(slot);
  }

  async deleteSlot(templateId: string, dayId: string, slotId: string) {
    await this.ensureTemplateDay(templateId, dayId);
    const slot = await this.slotRepository.findOne({
      where: { id: slotId, dayId },
    });
    if (!slot) {
      throw new NotFoundException('模板时段不存在');
    }
    await this.slotRepository.remove(slot);
    return { success: true };
  }

  private async ensureTemplateExists(templateId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return template;
  }

  private async ensureTemplateDay(templateId: string, dayId: string) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, templateId },
    });
    if (!day) {
      throw new NotFoundException('模板日程不存在');
    }
    return day;
  }

  /**
   * 根据行程数据反推并生成模板结构
   * 将 CreateItineraryRequestDto 转换为 CreateTemplateDto
   */
  extractTemplateFromItinerary(
    itineraryRequest: CreateItineraryRequestDto,
  ): CreateTemplateDto {
    try {
      this.logger.log(
        `Extracting template from itinerary: ${itineraryRequest.destination}`,
      );

      // 转换活动为模板时间段
      const convertActivityToTimeSlot = (
        activity: ItineraryActivityDto,
        index: number,
      ): TemplateTimeSlotDto => {
        const timeSlot: TemplateTimeSlotDto = {
          sequence: index + 1,
          startTime: activity.time,
          durationMinutes: activity.duration,
          type: activity.type,
          title: activity.title,
          scenicIntro: activity.notes || undefined,
          locationJson: {
            lat: activity.location.lat,
            lng: activity.location.lng,
          },
          detailsJson: {
            cost: activity.cost,
            notes: activity.notes,
            // 保留原始数据以备需要
            originalData: {
              time: activity.time,
              title: activity.title,
              type: activity.type,
              duration: activity.duration,
              location: activity.location,
              notes: activity.notes,
              cost: activity.cost,
            },
          },
        };

        return timeSlot;
      };

      // 转换天数为模板天数
      const convertDayToTemplateDay = (
        day: ItineraryDayDto,
        index: number,
      ): TemplateDayDto => {
        const templateDay: TemplateDayDto = {
          dayNumber: day.day,
          title: undefined, // 模板中天标题是可选的，可以从 detailsJson 获取
          summary: undefined, // 模板中摘要是可选的
          detailsJson: {
            date: day.date,
            // 保留原始日期信息
            originalDay: day.day,
            originalDate: day.date,
          },
          timeSlots: day.activities.map((activity, activityIndex) =>
            convertActivityToTimeSlot(activity, activityIndex),
          ),
        };

        return templateDay;
      };

      // 构建模板数据
      const template: CreateTemplateDto = {
        title: itineraryRequest.destination,
        durationDays: itineraryRequest.days,
        summary: itineraryRequest.data.summary || undefined,
        description: `从行程自动生成的模板：${itineraryRequest.destination} ${itineraryRequest.days}天行程`,
        language: 'zh-CN', // 默认中文
        status: 'draft',
        mode: 'inspiration', // 从 CreateItineraryRequestDto 反推的模板默认使用 inspiration 模式
        days: itineraryRequest.data.days.map((day, index) =>
          convertDayToTemplateDay(day, index),
        ),
        journeyDesign: {
          destination: itineraryRequest.destination,
          startDate: itineraryRequest.startDate,
          totalCost: itineraryRequest.data.totalCost,
          // 保留偏好信息
          preferences: itineraryRequest.preferences
            ? {
                interests: itineraryRequest.preferences.interests,
                budget: itineraryRequest.preferences.budget,
                travelStyle: itineraryRequest.preferences.travelStyle,
              }
            : undefined,
        },
      };

      this.logger.log(
        `Template extracted successfully: ${template.days?.length} days, ${template.days?.reduce((sum, day) => sum + (day.timeSlots?.length || 0), 0)} time slots`,
      );

      return template;
    } catch (error) {
      this.logger.error('Failed to extract template from itinerary', error);
      throw new BadRequestException(
        '无法从行程数据生成模板结构：' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * 根据行程数据创建模板
   */
  async createTemplateFromItinerary(
    itineraryRequest: CreateItineraryRequestDto,
  ): Promise<JourneyTemplateEntity> {
    const templateDto = this.extractTemplateFromItinerary(itineraryRequest);
    return this.createTemplate(templateDto);
  }

  /**
   * 根据灵感模式的行程数据反推并生成模板结构
   * 将灵感模式的 GenerateItineraryDataDto 转换为 CreateTemplateDto
   */
  extractTemplateFromInspirationItinerary(
    inspirationData: {
      title: string;
      destination?: string;
      location?: string;
      duration: string | number;
      days?: Array<{
        day: number;
        date?: string;
        theme?: string;
        mood?: string;
        summary?: string;
        timeSlots: Array<{
          time: string;
          title?: string;
          activity?: string;
          coordinates?: { lat: number; lng: number };
          type?: string;
          duration?: number;
          cost?: number;
          details?: Record<string, unknown>;
        }>;
      }>;
      highlights?: string[];
    },
    mode: 'inspiration' | 'planner' | 'seeker' = 'inspiration',
  ): CreateTemplateDto {
    try {
      this.logger.log(
        `Extracting template from inspiration itinerary: ${inspirationData.title}`,
      );

      // 解析天数
      const durationStr = String(inspirationData.duration);
      const durationMatch = durationStr.match(/(\d+)/);
      const durationDays = durationMatch
        ? parseInt(durationMatch[1], 10)
        : inspirationData.days?.length || 5;

      // 转换时间段为模板时间段
      const convertTimeSlotToTemplateSlot = (
        timeSlot: {
          time: string;
          title?: string;
          activity?: string;
          coordinates?: { lat: number; lng: number };
          type?: string;
          duration?: number;
          cost?: number;
          details?: Record<string, unknown>;
        },
        index: number,
      ): TemplateTimeSlotDto => {
        const slot: TemplateTimeSlotDto = {
          sequence: index + 1,
          startTime: timeSlot.time,
          durationMinutes: timeSlot.duration || 120, // 默认2小时
          type: timeSlot.type || 'attraction',
          title: timeSlot.title || timeSlot.activity || undefined,
          scenicIntro: timeSlot.details?.notes
            ? String(timeSlot.details.notes)
            : timeSlot.details?.description
              ? String(timeSlot.details.description)
              : undefined,
          locationJson: timeSlot.coordinates
            ? {
                lat: timeSlot.coordinates.lat,
                lng: timeSlot.coordinates.lng,
              }
            : undefined,
          detailsJson: {
            ...(timeSlot.details || {}),
            cost: timeSlot.cost || 0,
            activity: timeSlot.activity,
            // 保留原始数据
            originalTimeSlot: timeSlot,
          },
        };

        return slot;
      };

      // 转换天数为模板天数
      const convertDayToTemplateDay = (
        day: {
          day: number;
          date?: string;
          theme?: string;
          mood?: string;
          summary?: string;
          timeSlots: Array<{
            time: string;
            title?: string;
            activity?: string;
            coordinates?: { lat: number; lng: number };
            type?: string;
            duration?: number;
            cost?: number;
            details?: Record<string, unknown>;
          }>;
        },
        index: number,
      ): TemplateDayDto => {
        const templateDay: TemplateDayDto = {
          dayNumber: day.day,
          title: day.theme || undefined,
          summary: day.summary || undefined,
          detailsJson: {
            date: day.date,
            mood: day.mood,
            theme: day.theme,
            // 保留原始数据
            originalDay: day.day,
            originalDate: day.date,
          },
          timeSlots: day.timeSlots.map((timeSlot, slotIndex) =>
            convertTimeSlotToTemplateSlot(timeSlot, slotIndex),
          ),
        };

        return templateDay;
      };

      // 构建模板数据
      const template: CreateTemplateDto = {
        title: inspirationData.title,
        durationDays: durationDays,
        summary: inspirationData.days?.[0]?.summary || undefined,
        description: `从灵感模式行程自动生成的模板：${inspirationData.title}`,
        language: 'zh-CN',
        status: 'draft',
        mode: mode,
        days:
          inspirationData.days?.map((day, index) =>
            convertDayToTemplateDay(day, index),
          ) || [],
        journeyDesign: {
          destination: inspirationData.destination || inspirationData.location,
          highlights: inspirationData.highlights,
          // 保留原始数据
          originalInspirationData: {
            title: inspirationData.title,
            destination: inspirationData.destination,
            location: inspirationData.location,
            duration: inspirationData.duration,
            highlights: inspirationData.highlights,
          },
        },
      };

      this.logger.log(
        `Inspiration template extracted successfully: ${template.days?.length} days, ${template.days?.reduce((sum, day) => sum + (day.timeSlots?.length || 0), 0)} time slots`,
      );

      return template;
    } catch (error) {
      this.logger.error(
        'Failed to extract template from inspiration itinerary',
        error,
      );
      throw new BadRequestException(
        '无法从灵感模式行程数据生成模板结构：' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * 根据灵感模式的行程数据创建模板
   */
  async createTemplateFromInspirationItinerary(
    inspirationData: {
      title: string;
      destination?: string;
      location?: string;
      duration: string | number;
      days?: Array<{
        day: number;
        date?: string;
        theme?: string;
        mood?: string;
        summary?: string;
        timeSlots: Array<{
          time: string;
          title?: string;
          activity?: string;
          coordinates?: { lat: number; lng: number };
          type?: string;
          duration?: number;
          cost?: number;
          details?: Record<string, unknown>;
        }>;
      }>;
      highlights?: string[];
    },
    mode: 'inspiration' | 'planner' | 'seeker' = 'inspiration',
  ): Promise<JourneyTemplateEntity> {
    const templateDto = this.extractTemplateFromInspirationItinerary(
      inspirationData,
      mode,
    );
    return this.createTemplate(templateDto);
  }
}
