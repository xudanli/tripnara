import { promises as fs } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TemplateService } from '../src/modules/templates/template.service';
import { DataSource } from 'typeorm';
import { JourneyTemplateEntity } from '../src/modules/persistence/entities/journey-template.entity';

/**
 * 导出模板脚本
 * 
 * 使用方法：
 * 1. 导出单个模板（通过 ID）：
 *    DATABASE_URL="..." npx ts-node scripts/export-template.ts --id <templateId>
 * 
 * 2. 导出单个模板（通过标题）：
 *    DATABASE_URL="..." npx ts-node scripts/export-template.ts --title "模板标题"
 * 
 * 3. 导出所有模板：
 *    DATABASE_URL="..." npx ts-node scripts/export-template.ts --all
 * 
 * 4. 导出到指定目录：
 *    DATABASE_URL="..." npx ts-node scripts/export-template.ts --id <templateId> --output ./exports
 */

interface ExportedTemplate {
  id?: string;
  mode?: string;
  modePrimary?: string;
  modeTags?: string;
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
  days?: Array<{
    day?: number;
    dayNumber?: number;
    title?: string;
    summary?: string;
    detailsJson?: Record<string, unknown>;
    timeSlots?: Array<{
      sequence?: number;
      startTime?: string;
      durationHours?: number;
      durationMinutes?: number;
      type?: string;
      title?: string;
      activityHighlights?: Record<string, unknown>;
      scenicIntro?: string;
      location?: string;
      locationJson?: Record<string, unknown>;
      detailsJson?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
  }>;
}

type ExportedDay = {
  day?: number;
  dayNumber?: number;
  title?: string;
  summary?: string;
  detailsJson?: Record<string, unknown>;
  timeSlots?: ExportedTimeSlot[];
};

type ExportedTimeSlot = {
  sequence?: number;
  startTime?: string;
  durationHours?: number;
  durationMinutes?: number;
  type?: string;
  title?: string;
  activityHighlights?: Record<string, unknown>;
  scenicIntro?: string;
  location?: string;
  locationJson?: Record<string, unknown>;
  detailsJson?: Record<string, unknown>;
  [key: string]: unknown;
};

function toHours(minutes?: number): number | undefined {
  if (typeof minutes !== 'number') return undefined;
  return Math.round((minutes / 60) * 100) / 100; // 保留2位小数
}

function convertTemplateToExport(template: JourneyTemplateEntity): ExportedTemplate {
  const journeyDesign = template.journeyDesign as Record<string, unknown> | undefined;
  const slug = journeyDesign?.slug as string | undefined;
  const location = journeyDesign?.location as string | undefined || template.journeyDesign?.['location'] as string | undefined;

  const exported: ExportedTemplate = {
    id: slug, // 使用 slug 作为 id（原始导入时的 id）
    mode: template.mode,
    modePrimary: template.modePrimary || undefined,
    modeTags: template.modeTags || undefined,
    title: template.title,
    coverImage: template.coverImage || undefined,
    location: location,
    duration: template.durationDays || undefined,
    summary: template.summary || undefined,
    description: template.description || undefined,
    coreInsight: template.coreInsight || undefined,
    safetyNotices: template.safetyNoticeDefault as Record<string, unknown> | undefined,
    journeyBackground: template.journeyBackground as Array<string | Record<string, unknown>> | undefined,
    personaProfile: template.personaProfile as Record<string, unknown> | undefined,
    journeyDesign: journeyDesign ? {
      ...journeyDesign,
      location: undefined, // location 已经提取到顶层
    } : undefined,
    mentalFlowStages: journeyDesign?.mentalFlowStages as Record<string, unknown> | undefined,
    tasks: template.tasksDefault as Array<Record<string, unknown>> | undefined,
  };

  // 处理 days
  if (template.days && template.days.length > 0) {
    exported.days = template.days.map((day) => {
      const dayExport: ExportedDay = {
        dayNumber: day.dayNumber,
        title: day.title || undefined,
        summary: day.summary || undefined,
        detailsJson: day.detailsJson as Record<string, unknown> | undefined,
      };

      // 处理 timeSlots
      if (day.timeSlots && day.timeSlots.length > 0) {
        dayExport.timeSlots = day.timeSlots.map((slot) => {
          const slotExport: ExportedTimeSlot = {
            sequence: slot.sequence,
            startTime: slot.startTime || undefined,
            durationHours: toHours(slot.durationMinutes),
            durationMinutes: slot.durationMinutes || undefined,
            type: slot.type || undefined,
            title: slot.title || undefined,
            activityHighlights: slot.activityHighlights as Record<string, unknown> | undefined,
            scenicIntro: slot.scenicIntro || undefined,
            locationJson: slot.locationJson as Record<string, unknown> | undefined,
            detailsJson: slot.detailsJson as Record<string, unknown> | undefined,
          };

          // 移除 undefined 值
          Object.keys(slotExport).forEach((key) => {
            if (slotExport[key as keyof typeof slotExport] === undefined) {
              delete slotExport[key as keyof typeof slotExport];
            }
          });

          return slotExport;
        });
      }

      // 移除 undefined 值
      Object.keys(dayExport).forEach((key) => {
        if (dayExport[key as keyof typeof dayExport] === undefined) {
          delete dayExport[key as keyof typeof dayExport];
        }
      });

      return dayExport;
    });
  }

  // 移除 undefined 值
  Object.keys(exported).forEach((key) => {
    if (exported[key as keyof ExportedTemplate] === undefined) {
      delete exported[key as keyof ExportedTemplate];
    }
  });

  return exported;
}

function sanitizeFileName(title: string): string {
  // 移除或替换不适合文件名的字符
  return title
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100); // 限制长度
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const titleIndex = args.indexOf('--title');
  const allIndex = args.indexOf('--all');
  const outputIndex = args.indexOf('--output');

  const outputDir = outputIndex !== -1 && outputIndex + 1 < args.length
    ? args[outputIndex + 1]
    : join(__dirname, 'templates', 'exports');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const templateService = app.get(TemplateService);
    const dataSource = app.get(DataSource);
    const templateRepository = dataSource.getRepository(JourneyTemplateEntity);

    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 导出所有模板
    if (allIndex !== -1) {
      const templates = await templateRepository.find({
        relations: {
          days: {
            timeSlots: true,
          },
        },
        order: {
          createdAt: 'DESC',
          days: {
            dayNumber: 'ASC',
            timeSlots: { sequence: 'ASC' },
          },
        },
      });

      console.log(`找到 ${templates.length} 个模板，开始导出...`);

      for (const template of templates) {
        const exported = convertTemplateToExport(template);
        const fileName = `${sanitizeFileName(template.title)}.json`;
        const filePath = join(outputDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(exported, null, 2), 'utf8');
        console.log(`✅ 已导出：${template.title} -> ${filePath}`);
      }

      console.log(`\n✅ 所有模板已导出到：${outputDir}`);
      return;
    }

    // 通过 ID 导出
    if (idIndex !== -1 && idIndex + 1 < args.length) {
      const templateId = args[idIndex + 1];
      try {
        const template = await templateService.getTemplateById(templateId);
        const exported = convertTemplateToExport(template);
        const fileName = `${sanitizeFileName(template.title)}.json`;
        const filePath = join(outputDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(exported, null, 2), 'utf8');
        console.log(`✅ 已导出模板：${template.title}`);
        console.log(`   文件路径：${filePath}`);
        console.log(`   模板 ID：${template.id}`);
      } catch (error: any) {
        console.error(`❌ 导出模板失败：`, error.message);
        process.exitCode = 1;
      }
      return;
    }

    // 通过标题导出
    if (titleIndex !== -1 && titleIndex + 1 < args.length) {
      const title = args[titleIndex + 1];
      try {
        const template = await templateRepository.findOne({
          where: { title },
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
          console.error(`❌ 未找到模板：${title}`);
          process.exitCode = 1;
          return;
        }

        const exported = convertTemplateToExport(template);
        const fileName = `${sanitizeFileName(template.title)}.json`;
        const filePath = join(outputDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(exported, null, 2), 'utf8');
        console.log(`✅ 已导出模板：${template.title}`);
        console.log(`   文件路径：${filePath}`);
        console.log(`   模板 ID：${template.id}`);
      } catch (error: any) {
        console.error(`❌ 导出模板失败：`, error.message);
        process.exitCode = 1;
      }
      return;
    }

    // 显示帮助信息
    console.log(`
使用方法：
  通过 ID 导出：
    DATABASE_URL="..." npx ts-node scripts/export-template.ts --id <templateId>

  通过标题导出：
    DATABASE_URL="..." npx ts-node scripts/export-template.ts --title "模板标题"

  导出所有模板：
    DATABASE_URL="..." npx ts-node scripts/export-template.ts --all

  指定输出目录：
    DATABASE_URL="..." npx ts-node scripts/export-template.ts --id <templateId> --output ./exports

示例：
    DATABASE_URL="postgresql://..." npx ts-node scripts/export-template.ts --id f4473f3a-3390-41a6-bfb4-29ac1e9c19d3
    DATABASE_URL="postgresql://..." npx ts-node scripts/export-template.ts --title "南极南美经典之旅（长线24天）"
    DATABASE_URL="postgresql://..." npx ts-node scripts/export-template.ts --all --output ./backups
    `);
    process.exitCode = 1;
  } catch (error: any) {
    console.error('❌ 导出模板失败：', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

