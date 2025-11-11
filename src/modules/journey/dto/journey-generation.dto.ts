import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const JOURNEY_GENERATION_STAGES = [
  'framework',
  'dayDetails',
  'transport',
  'scenicIntro',
  'tips',
  'safetyNotice',
] as const;

export type JourneyGenerationStage = (typeof JOURNEY_GENERATION_STAGES)[number];

export class JourneyGenerationRequestDto {
  @ApiPropertyOptional({
    description: '需要执行的阶段列表，默认为全部阶段',
    type: [String],
    enum: JOURNEY_GENERATION_STAGES,
  })
  @IsOptional()
  @IsArray()
  @IsIn(JOURNEY_GENERATION_STAGES, { each: true })
  stages?: JourneyGenerationStage[];

  @ApiPropertyOptional({
    description: 'LLM 提供方',
    enum: ['deepseek', 'openai'],
  })
  @IsOptional()
  @IsString()
  provider?: 'deepseek' | 'openai';

  @ApiPropertyOptional({ description: '附加指令或上下文', type: Object })
  @IsOptional()
  extra?: Record<string, unknown>;
}

export class JourneyGenerationStageRequestDto {
  @ApiPropertyOptional({ description: '自定义提示词' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: '自定义提供方',
    enum: ['deepseek', 'openai'],
  })
  @IsOptional()
  @IsString()
  provider?: 'deepseek' | 'openai';
}

export class JourneyGenerationStatusDto {
  @ApiProperty({ description: '任务状态 pending/running/completed/failed' })
  status!: string;

  @ApiProperty({ description: '任务开始时间' })
  startedAt!: Date;

  @ApiPropertyOptional({ description: '任务完成时间' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ description: '异常信息' })
  errorMessage?: string | null;
}

export class JourneyAiLogDto {
  @ApiProperty({ description: '日志 ID' })
  id!: string;

  @ApiProperty({ description: '所属阶段或模块' })
  module!: string;

  @ApiProperty({ description: '调用状态' })
  status!: string;

  @ApiPropertyOptional({ description: '创建时间' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: '提示内容', type: Object })
  promptJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '原始响应', type: Object })
  responseRaw?: Record<string, unknown>;
}

export class JourneyGenerationStatusResponseDto {
  @ApiProperty({ description: '任务信息', type: JourneyGenerationStatusDto })
  @ValidateNested()
  @Type(() => JourneyGenerationStatusDto)
  job!: JourneyGenerationStatusDto;

  @ApiProperty({ description: '已执行阶段', type: [String] })
  stages!: JourneyGenerationStage[];
}

export class JourneyGenerationResultDto {
  @ApiProperty({ description: '任务 ID' })
  jobId!: string;

  @ApiProperty({ description: '触发阶段', type: [String] })
  stages!: JourneyGenerationStage[];
}
