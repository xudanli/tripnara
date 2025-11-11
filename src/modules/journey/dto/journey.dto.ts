import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class JourneyTimeSlotDto {
  @ApiProperty({ description: '顺序（从 1 开始）', example: 1 })
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

  @ApiPropertyOptional({ description: '活动类型' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '活动亮点 JSON' })
  @IsOptional()
  activityHighlights?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '风景描述' })
  @IsOptional()
  @IsString()
  scenicIntro?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '费用' })
  @IsOptional()
  @IsString()
  cost?: string;

  @ApiPropertyOptional({ description: '币种' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ description: '位置 JSON' })
  @IsOptional()
  locationJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '详情 JSON' })
  @IsOptional()
  detailsJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '数据来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '是否为 AI 生成', default: true })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @ApiPropertyOptional({ description: '是否被用户锁定', default: false })
  @IsOptional()
  @IsBoolean()
  lockedByUser?: boolean;
}

export class JourneyDayDto {
  @ApiProperty({ description: '天数序号（从 1 开始）', example: 1 })
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @ApiPropertyOptional({ description: '日期（YYYY-MM-DD）' })
  @IsOptional()
  @IsDateString()
  date?: string;

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
    description: '日程时段列表',
    type: () => [JourneyTimeSlotDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JourneyTimeSlotDto)
  timeSlots?: JourneyTimeSlotDto[];
}

export class CreateJourneyDto {
  @ApiPropertyOptional({ description: '关联用户 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '来源模板 ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: '行程状态 draft/generated/archived/shared',
    default: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'generated' | 'archived' | 'shared';

  @ApiPropertyOptional({
    description: '展示模式 inspiration/planner/seeker',
    default: 'inspiration',
  })
  @IsOptional()
  @IsString()
  mode?: 'inspiration' | 'planner' | 'seeker';

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '封面图' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: '目的地' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '行程天数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: '概览摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '核心洞察' })
  @IsOptional()
  @IsString()
  coreInsight?: string;

  @ApiPropertyOptional({ description: '安全提示 JSON' })
  @IsOptional()
  safetyNotice?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '旅程背景数组' })
  @IsOptional()
  journeyBackground?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '人物画像 JSON' })
  @IsOptional()
  personaProfile?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '旅程设计 JSON' })
  @IsOptional()
  journeyDesign?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '任务列表' })
  @IsOptional()
  tasks?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '预算信息' })
  @IsOptional()
  budgetInfo?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '外部来源记录' })
  @IsOptional()
  sources?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '日程结构', type: () => [JourneyDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JourneyDayDto)
  days?: JourneyDayDto[];
}

export class UpdateJourneyDto extends PartialType(CreateJourneyDto) {}

export class JourneyQueryDto {
  @ApiPropertyOptional({ description: '按用户过滤' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '按模板过滤' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: '按状态过滤' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '目的地关键字' })
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

export class CreateJourneyDayRequestDto extends JourneyDayDto {}
export class UpdateJourneyDayRequestDto extends PartialType(JourneyDayDto) {}
export class CreateJourneySlotRequestDto extends JourneyTimeSlotDto {}
export class UpdateJourneySlotRequestDto extends PartialType(
  JourneyTimeSlotDto,
) {}
