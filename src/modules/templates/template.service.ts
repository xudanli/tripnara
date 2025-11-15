import {
  BadRequestException,
  Injectable,
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
  UpdateTemplateDayRequestDto,
  UpdateTemplateDto,
  UpdateTemplateSlotRequestDto,
} from './dto/template.dto';

@Injectable()
export class TemplateService {
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
}
