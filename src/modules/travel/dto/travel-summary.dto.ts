import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActivityDto {
  @ApiProperty({ description: '活动时间', example: '09:00' })
  time!: string;

  @ApiProperty({ description: '活动标题', example: '铁力士峰云端漫步' })
  title!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
  })
  type!: string;

  @ApiProperty({ description: '活动描述', example: '详细的游览建议和体验描述' })
  notes?: string;
}

export class DayDto {
  @ApiProperty({ description: '第几天', example: 1 })
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  date!: string;

  @ApiProperty({ description: '活动列表', type: [ActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities!: ActivityDto[];
}

export class ItineraryDto {
  @ApiProperty({ description: '行程天数详情', type: [DayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayDto)
  days!: DayDto[];

  @ApiPropertyOptional({ description: '总费用', example: 8000 })
  totalCost?: number;

  @ApiPropertyOptional({ description: '行程摘要', example: '行程摘要' })
  summary?: string;
}

export class GenerateTravelSummaryRequestDto {
  @ApiProperty({
    description: '行程数据',
    type: ItineraryDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDto)
  itinerary!: ItineraryDto;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  @IsString()
  destination!: string;
}

export class TravelSummaryDataDto {
  @ApiProperty({
    description: '旅行摘要',
    example: '5天琉森文化探索之旅，从铁力士峰的云端漫步到琉森湖的湖光山色...',
  })
  summary!: string;

  @ApiProperty({
    description: '生成时间',
    example: '2024-01-01T00:00:00Z',
  })
  generatedAt!: string;
}

export class GenerateTravelSummaryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '摘要数据', type: TravelSummaryDataDto })
  data!: TravelSummaryDataDto;
}

