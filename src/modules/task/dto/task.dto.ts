import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum TaskType {
  JourneyGeneration = 'journey_generation',
  CatalogSync = 'catalog_sync',
  GuidesCacheRefresh = 'guides_cache_refresh',
}

export class ScheduleTaskDto {
  @ApiProperty({ enum: TaskType, description: 'Type of task to schedule.' })
  @IsEnum(TaskType)
  task!: TaskType;

  @ApiPropertyOptional({ description: 'Optional context payload identifier.' })
  @IsOptional()
  @IsString()
  contextId?: string;
}

export class QueueStatusDto {
  @ApiProperty({ description: 'Queue name.' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Number of jobs waiting to be processed.' })
  @IsInt()
  @Min(0)
  waiting!: number;

  @ApiProperty({ description: 'Number of jobs currently active.' })
  @IsInt()
  @Min(0)
  active!: number;

  @ApiProperty({ description: 'Number of jobs failed recently.' })
  @IsInt()
  @Min(0)
  failed!: number;
}
