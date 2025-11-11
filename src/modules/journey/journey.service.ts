import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JourneyEntity,
  JourneyDayEntity,
  JourneyTimeSlotEntity,
} from '../persistence/entities/journey.entity';
import {
  CreateJourneyDto,
  CreateJourneyDayRequestDto,
  CreateJourneySlotRequestDto,
  JourneyQueryDto,
  UpdateJourneyDto,
  UpdateJourneyDayRequestDto,
  UpdateJourneySlotRequestDto,
} from './dto/journey.dto';

@Injectable()
export class JourneyService {
  constructor(
    @InjectRepository(JourneyEntity)
    private readonly journeyRepository: Repository<JourneyEntity>,
    @InjectRepository(JourneyDayEntity)
    private readonly dayRepository: Repository<JourneyDayEntity>,
    @InjectRepository(JourneyTimeSlotEntity)
    private readonly slotRepository: Repository<JourneyTimeSlotEntity>,
  ) {}

  async listJourneys(query: JourneyQueryDto) {
    const { page = 1, limit = 20, userId, templateId, status, keyword } = query;

    const qb = this.journeyRepository.createQueryBuilder('journey');

    if (userId) {
      qb.andWhere('journey.userId = :userId', { userId });
    }

    if (templateId) {
      qb.andWhere('journey.templateId = :templateId', { templateId });
    }

    if (status) {
      qb.andWhere('journey.status = :status', { status });
    }

    if (keyword) {
      qb.andWhere(
        '(journey.title ILIKE :keyword OR journey.destination ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    qb.orderBy('journey.updatedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getJourneyById(journeyId: string) {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
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

    if (!journey) {
      throw new NotFoundException('行程不存在');
    }

    return journey;
  }

  async createJourney(dto: CreateJourneyDto) {
    const journey = this.journeyRepository.create({
      ...dto,
      days:
        dto.days?.map((day, index) =>
          this.dayRepository.create({
            dayNumber: day.dayNumber ?? index + 1,
            date: day.date,
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
                notes: slot.notes,
                cost: slot.cost,
                currencyCode: slot.currencyCode,
                locationJson: slot.locationJson,
                detailsJson: slot.detailsJson,
                source: slot.source,
                aiGenerated: slot.aiGenerated ?? true,
                lockedByUser: slot.lockedByUser ?? false,
              }),
            ),
          }),
        ) ?? [],
    });

    return this.journeyRepository.save(journey);
  }

  async updateJourney(journeyId: string, dto: UpdateJourneyDto) {
    const journey = await this.journeyRepository.preload({
      id: journeyId,
      ...dto,
    });
    if (!journey) {
      throw new NotFoundException('行程不存在');
    }
    return this.journeyRepository.save(journey);
  }

  async deleteJourney(journeyId: string) {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
    });
    if (!journey) {
      throw new NotFoundException('行程不存在');
    }
    await this.journeyRepository.remove(journey);
    return { success: true };
  }

  async listDays(journeyId: string) {
    const journey = await this.getJourneyById(journeyId);
    return journey.days;
  }

  async createDay(journeyId: string, dto: CreateJourneyDayRequestDto) {
    await this.ensureJourneyExists(journeyId);

    const existing = await this.dayRepository.find({
      where: { journeyId },
      order: { dayNumber: 'ASC' },
    });
    const dayNumber = dto.dayNumber ?? existing.length + 1;
    if (existing.some((day) => day.dayNumber === dayNumber)) {
      throw new BadRequestException('dayNumber 已存在，请调整序号');
    }

    const day = this.dayRepository.create({
      journeyId,
      dayNumber,
      date: dto.date,
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
          notes: slot.notes,
          cost: slot.cost,
          currencyCode: slot.currencyCode,
          locationJson: slot.locationJson,
          detailsJson: slot.detailsJson,
          source: slot.source,
          aiGenerated: slot.aiGenerated ?? true,
          lockedByUser: slot.lockedByUser ?? false,
        }),
      ),
    });

    return this.dayRepository.save(day);
  }

  async updateDay(
    journeyId: string,
    dayId: string,
    dto: UpdateJourneyDayRequestDto,
  ) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, journeyId },
    });
    if (!day) {
      throw new NotFoundException('行程日程不存在');
    }

    if (dto.dayNumber && dto.dayNumber !== day.dayNumber) {
      const conflict = await this.dayRepository.findOne({
        where: { journeyId, dayNumber: dto.dayNumber },
      });
      if (conflict) {
        throw new BadRequestException('目标 dayNumber 已存在');
      }
    }

    Object.assign(day, dto);
    return this.dayRepository.save(day);
  }

  async deleteDay(journeyId: string, dayId: string) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, journeyId },
    });
    if (!day) {
      throw new NotFoundException('行程日程不存在');
    }
    await this.dayRepository.remove(day);
    return { success: true };
  }

  async listSlots(journeyId: string, dayId: string) {
    await this.ensureJourneyDay(journeyId, dayId);
    return this.slotRepository.find({
      where: { dayId },
      order: { sequence: 'ASC' },
    });
  }

  async createSlot(
    journeyId: string,
    dayId: string,
    dto: CreateJourneySlotRequestDto,
  ) {
    await this.ensureJourneyDay(journeyId, dayId);
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
      notes: dto.notes,
      cost: dto.cost,
      currencyCode: dto.currencyCode,
      locationJson: dto.locationJson,
      detailsJson: dto.detailsJson,
      source: dto.source,
      aiGenerated: dto.aiGenerated ?? true,
      lockedByUser: dto.lockedByUser ?? false,
    });

    return this.slotRepository.save(slot);
  }

  async updateSlot(
    journeyId: string,
    dayId: string,
    slotId: string,
    dto: UpdateJourneySlotRequestDto,
  ) {
    await this.ensureJourneyDay(journeyId, dayId);
    const slot = await this.slotRepository.findOne({
      where: { id: slotId, dayId },
    });
    if (!slot) {
      throw new NotFoundException('行程时段不存在');
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

  async deleteSlot(journeyId: string, dayId: string, slotId: string) {
    await this.ensureJourneyDay(journeyId, dayId);
    const slot = await this.slotRepository.findOne({
      where: { id: slotId, dayId },
    });
    if (!slot) {
      throw new NotFoundException('行程时段不存在');
    }
    await this.slotRepository.remove(slot);
    return { success: true };
  }

  private async ensureJourneyExists(journeyId: string) {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
    });
    if (!journey) {
      throw new NotFoundException('行程不存在');
    }
    return journey;
  }

  private async ensureJourneyDay(journeyId: string, dayId: string) {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, journeyId },
    });
    if (!day) {
      throw new NotFoundException('行程日程不存在');
    }
    return day;
  }
}
