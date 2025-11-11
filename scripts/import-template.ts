import { promises as fs } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TemplateService } from '../src/modules/templates/template.service';
import { DataSource } from 'typeorm';
import { JourneyTemplateEntity } from '../src/modules/persistence/entities/journey-template.entity';
import {
  CreateTemplateDto,
  TemplateDayDto,
  TemplateTimeSlotDto,
} from '../src/modules/templates/dto/template.dto';

interface RawTemplateDay {
  day?: number;
  dayNumber?: number;
  title?: string;
  summary?: string;
  detailsJson?: Record<string, unknown>;
  timeSlots?: Array<Record<string, unknown>>;
}

interface RawTemplate {
  id?: string;
  mode?: string;
  title: string;
  coverImage?: string;
  location?: string;
  duration?: number;
  summary?: string;
  description?: string;
  coreInsight?: string;
  safetyNotice?: string;
  safetyNotices?: Record<string, unknown>;
  journeyBackground?: Array<string | Record<string, unknown>>;
  personaProfile?: Record<string, unknown>;
  journeyDesign?: Record<string, unknown>;
  mentalFlowStages?: Record<string, unknown>;
  tasks?: Array<Record<string, unknown>>;
  days?: RawTemplateDay[];
}

const toMinutes = (value?: number): number | undefined =>
  typeof value === 'number' ? Math.round(value * 60) : undefined;

const normalizeArrayOfRecord = (
  items?: Array<string | Record<string, unknown>>,
): Record<string, unknown>[] | undefined => {
  if (!items) {
    return undefined;
  }
  return items.map((item, index) =>
    typeof item === 'string' ? { order: index + 1, text: item } : item,
  );
};

const normalizeHighlights = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return { text: value };
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return { value };
};

const buildDetails = (
  slot: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const details: Record<string, unknown> = {};
  const merge = (key: string, value: unknown) => {
    if (value !== undefined) {
      details[key] = value;
    }
  };

  merge('transport', slot.transport);
  merge('localTip', slot.localTip);
  merge('durationHours', slot.durationHours);
  merge('location', slot.location);
  merge('metadata', slot.metadata);

  if (slot.detailsJson && typeof slot.detailsJson === 'object') {
    Object.assign(details, slot.detailsJson as Record<string, unknown>);
  }

  return Object.keys(details).length > 0 ? details : undefined;
};

const convertTimeSlots = (
  slots: RawTemplateDay['timeSlots'],
): TemplateTimeSlotDto[] | undefined => {
  if (!Array.isArray(slots)) {
    return undefined;
  }

  return slots.map((slotRaw, slotIndex) => {
    const slot = slotRaw as Record<string, unknown>;
    const sequence =
      (slot.sequence as number | undefined) ?? slotIndex + 1;
    const durationMinutes =
      (slot.durationMinutes as number | undefined) ??
      toMinutes(slot.durationHours as number | undefined);
    const activityHighlights = normalizeHighlights(slot.activityHighlights);
    const locationJson =
      typeof slot.locationJson === 'object'
        ? (slot.locationJson as Record<string, unknown>)
        : slot.location
        ? { name: slot.location }
        : undefined;
    const detailsJson = buildDetails(slot);

    return {
      sequence,
      startTime:
        typeof slot.startTime === 'string' &&
        /^\d{1,2}:\d{2}$/.test(slot.startTime)
          ? slot.startTime
          : undefined,
      durationMinutes,
      type: slot.type as string | undefined,
      title: slot.title as string | undefined,
      activityHighlights,
      scenicIntro: slot.scenicIntro as string | undefined,
      locationJson,
      detailsJson,
    };
  });
};

const convertDays = (days?: RawTemplateDay[]): TemplateDayDto[] | undefined => {
  if (!Array.isArray(days)) {
    return undefined;
  }

  return days.map((day, index) => ({
    dayNumber: day.dayNumber ?? day.day ?? index + 1,
    title: day.title,
    summary: day.summary,
    detailsJson: day.detailsJson,
    timeSlots: convertTimeSlots(day.timeSlots),
  }));
};

const buildDto = (raw: RawTemplate): CreateTemplateDto => {
  const safety =
    raw.safetyNotices ??
    (raw.safetyNotice ? { default: raw.safetyNotice } : undefined);

  return {
    title: raw.title,
    mode: (raw.mode as CreateTemplateDto['mode']) ?? 'inspiration',
    coverImage: raw.coverImage,
    durationDays: raw.duration,
    summary: raw.summary,
    description: raw.description,
    coreInsight: raw.coreInsight,
    safetyNoticeDefault: safety,
    journeyBackground: normalizeArrayOfRecord(raw.journeyBackground),
    personaProfile: raw.personaProfile,
    journeyDesign: {
      ...(raw.journeyDesign ?? {}),
      location: raw.location,
      mentalFlowStages: raw.mentalFlowStages,
      slug: raw.id,
    },
    tasksDefault: raw.tasks,
    days: convertDays(raw.days),
  };
};

async function main(): Promise<void> {
  const filePath = join(__dirname, 'templates', 'antarctica.json');
  const rawText = await fs.readFile(filePath, 'utf8');
  const raw = (0, eval)(`(${rawText})`) as RawTemplate;
  const dto = buildDto(raw);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const templateService = app.get(TemplateService);
    const dataSource = app.get(DataSource);
    const templateRepository =
      dataSource.getRepository(JourneyTemplateEntity);

    const existing = await templateRepository.findOne({
      where: { title: dto.title },
    });

    if (existing) {
      await templateService.deleteTemplate(existing.id);
    }

    const created = await templateService.createTemplate(dto);
    console.log('模板导入成功:', {
      id: created.id,
      title: created.title,
      days: created.days?.length ?? dto.days?.length ?? 0,
    });
  } catch (error) {
    console.error('模板导入失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

