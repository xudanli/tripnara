import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TemplateTimeSlotDto {
  @ApiProperty({ description: '序号（从 1 开始）', example: 1 })
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiPropertyOptional({ description: '开始时间（HH:mm）' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '持续时间（分钟）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: '类型，如 transport/activity/meal' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '亮点信息（JSON）' })
  @IsOptional()
  activityHighlights?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '风景介绍' })
  @IsOptional()
  @IsString()
  scenicIntro?: string;

  @ApiPropertyOptional({ description: '位置信息（JSON）' })
  @IsOptional()
  locationJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '自定义详情（JSON）' })
  @IsOptional()
  detailsJson?: Record<string, unknown>;
}

export class TemplateDayDto {
  @ApiProperty({ description: '天数序号（从 1 开始）', example: 1 })
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '详情 JSON' })
  @IsOptional()
  detailsJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '时段列表',
    type: () => [TemplateTimeSlotDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTimeSlotDto)
  timeSlots?: TemplateTimeSlotDto[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: '封面图链接' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: '推荐行程天数', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: '模板摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '核心洞察' })
  @IsOptional()
  @IsString()
  coreInsight?: string;

  @ApiPropertyOptional({
    description: '状态 draft/published/archived',
    default: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({
    description: '模式 inspiration/planner/seeker',
    default: 'inspiration',
  })
  @IsOptional()
  @IsString()
  mode?: 'inspiration' | 'planner' | 'seeker';

  @ApiPropertyOptional({ description: '主模式分类' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  modePrimary?: string;

  @ApiPropertyOptional({
    description: '模式标签（逗号分隔）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  modeTags?: string;

  @ApiPropertyOptional({ description: '安全提示默认值 JSON' })
  @IsOptional()
  safetyNoticeDefault?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '旅程背景数组' })
  @IsOptional()
  journeyBackground?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '人格画像 JSON' })
  @IsOptional()
  personaProfile?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '旅程设计 JSON' })
  @IsOptional()
  journeyDesign?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '默认任务列表' })
  @IsOptional()
  tasksDefault?: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: '日程结构',
    type: () => [TemplateDayDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateDayDto)
  days?: TemplateDayDto[];
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

export class TemplateQueryDto {
  @ApiPropertyOptional({ description: '状态过滤 draft/published/archived' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '模式过滤 inspiration/planner/seeker' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: '关键字搜索（名称/摘要）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class CreateTemplateDayRequestDto extends TemplateDayDto {}
export class UpdateTemplateDayRequestDto extends PartialType(TemplateDayDto) {}
export class CreateTemplateSlotRequestDto extends TemplateTimeSlotDto {}
export class UpdateTemplateSlotRequestDto extends PartialType(
  TemplateTimeSlotDto,
) {}
