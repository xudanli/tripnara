import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// 请求 DTO
export class GenerateSeekerTravelPlanRequestDto {
  @ApiProperty({
    description: '当前心情',
    example: 'calm',
    enum: ['calm', 'active', 'romantic', 'adventurous', 'cultural'],
  })
  @IsString()
  @IsEnum(['calm', 'active', 'romantic', 'adventurous', 'cultural'])
  currentMood!: string;

  @ApiProperty({
    description: '期望体验',
    example: 'sightseeing',
    enum: [
      'sightseeing',
      'nature',
      'food',
      'shopping',
      'nightlife',
      'adventure',
    ],
  })
  @IsString()
  @IsEnum([
    'sightseeing',
    'nature',
    'food',
    'shopping',
    'nightlife',
    'adventure',
  ])
  desiredExperience!: string;

  @ApiProperty({
    description: '预算范围',
    example: 'comfort',
    enum: ['economy', 'comfort', 'luxury'],
  })
  @IsString()
  @IsEnum(['economy', 'comfort', 'luxury'])
  budget!: string;

  @ApiProperty({
    description: '时长类型',
    example: 'weekend',
    enum: ['weekend', 'week', 'extended'],
  })
  @IsString()
  @IsEnum(['weekend', 'week', 'extended'])
  duration!: string;

  @ApiPropertyOptional({
    description: '语言代码',
    example: 'zh-CN',
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '用户所在国家', example: 'CN' })
  @IsOptional()
  @IsString()
  userCountry?: string;

  @ApiPropertyOptional({ description: '用户国籍', example: 'CN' })
  @IsOptional()
  @IsString()
  userNationality?: string;
}

// 响应 DTO
export class ActivityDto {
  @ApiProperty({ description: '时间', example: '09:00' })
  @IsString()
  time!: string;

  @ApiProperty({ description: '活动', example: '参观铁力士峰' })
  @IsString()
  activity!: string;

  @ApiProperty({
    description: '活动类型',
    example: 'attraction',
    enum: [
      'attraction',
      'meal',
      'hotel',
      'shopping',
      'transport',
      'ocean',
    ],
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: '位置', example: '铁力士峰' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: '备注',
    example: '建议提前预订门票',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DayItineraryDto {
  @ApiProperty({ description: '第几天', example: 1 })
  @IsNumber()
  day!: number;

  @ApiProperty({ description: '标题', example: '探索自然美景' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: '主题', example: '自然探索' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({
    description: '活动列表',
    type: [ActivityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities!: ActivityDto[];
}

export class RecommendationsDto {
  @ApiPropertyOptional({
    description: '住宿推荐',
    example: '推荐市中心精品酒店，交通便利',
  })
  @IsOptional()
  @IsString()
  accommodation?: string;

  @ApiPropertyOptional({
    description: '交通推荐',
    example: '建议使用公共交通，购买一日票',
  })
  @IsOptional()
  @IsString()
  transportation?: string;

  @ApiPropertyOptional({
    description: '美食推荐',
    example: '尝试当地特色菜，推荐米其林餐厅',
  })
  @IsOptional()
  @IsString()
  food?: string;

  @ApiPropertyOptional({
    description: '旅行提示',
    example: '建议提前预订热门景点门票',
  })
  @IsOptional()
  @IsString()
  tips?: string;
}

export class DetectedIntentDto {
  @ApiProperty({ description: '意图类型', example: 'emotional_healing' })
  @IsString()
  intentType!: string;

  @ApiProperty({
    description: '关键词列表',
    example: ['放松', '自然', '安静'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  keywords!: string[];

  @ApiProperty({ description: '情感倾向', example: 'calm' })
  @IsString()
  emotionTone!: string;

  @ApiProperty({
    description: '意图描述',
    example: '用户希望寻找一个安静、放松的旅行目的地',
  })
  @IsString()
  description!: string;
}

export class GenerateSeekerTravelPlanDataDto {
  @ApiProperty({ description: '推荐的目的地', example: '冰岛' })
  @IsString()
  destination!: string;

  @ApiProperty({ description: '行程天数', example: 5 })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    description: '行程详情',
    type: [DayItineraryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayItineraryDto)
  itinerary!: DayItineraryDto[];

  @ApiPropertyOptional({
    description: '推荐信息',
    type: RecommendationsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecommendationsDto)
  recommendations?: RecommendationsDto;

  @ApiPropertyOptional({
    description: '检测到的意图',
    type: DetectedIntentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DetectedIntentDto)
  detectedIntent?: DetectedIntentDto;
}

export class GenerateSeekerTravelPlanResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '行程数据',
    type: GenerateSeekerTravelPlanDataDto,
  })
  @ValidateNested()
  @Type(() => GenerateSeekerTravelPlanDataDto)
  data!: GenerateSeekerTravelPlanDataDto;
}

