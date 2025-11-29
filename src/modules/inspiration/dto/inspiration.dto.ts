import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// 意图识别相关 DTO
export class DetectIntentRequestDto {
  @ApiProperty({
    description: '用户自然语言输入',
    example: '我想去一个安静的地方放松',
  })
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiPropertyOptional({
    description: '语言代码',
    example: 'zh-CN',
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;
}

export class IntentDataDto {
  @ApiProperty({
    description: '意图类型',
    example: 'emotional_healing',
    enum: [
      'photography_exploration',
      'cultural_exchange',
      'emotional_healing',
      'mind_healing',
      'extreme_exploration',
      'urban_creation',
    ],
  })
  @IsString()
  intentType!: string;

  @ApiProperty({
    description: '提取的关键词列表',
    example: ['安静', '放松', '自然'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  keywords!: string[];

  @ApiProperty({
    description: '情感倾向',
    example: 'calm',
    enum: ['calm', 'active', 'romantic', 'adventurous', 'peaceful'],
  })
  @IsString()
  emotionTone!: string;

  @ApiProperty({
    description: '意图描述',
    example: '用户希望寻找一个安静、放松的旅行目的地，追求情感疗愈和心灵平静',
  })
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    description: '置信度（0-1）',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class DetectIntentResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '意图识别结果', type: IntentDataDto })
  @ValidateNested()
  @Type(() => IntentDataDto)
  data!: IntentDataDto;
}

// 目的地推荐相关 DTO
export class IntentDto {
  @ApiProperty({ description: '意图类型', example: 'emotional_healing' })
  @IsString()
  intentType!: string;

  @ApiProperty({
    description: '关键词列表',
    example: ['安静', '放松'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  keywords!: string[];

  @ApiProperty({ description: '情感倾向', example: 'calm' })
  @IsString()
  emotionTone!: string;
}

export class RecommendDestinationsRequestDto {
  @ApiProperty({
    description: '用户自然语言输入',
    example: '我想去一个安静的地方放松',
  })
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiPropertyOptional({
    description: '意图识别结果（可选，如果不提供会在后端识别）',
    type: IntentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntentDto)
  intent?: IntentDto;

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

  @ApiPropertyOptional({ description: '用户永久居住地', example: 'US' })
  @IsOptional()
  @IsString()
  userPermanentResidency?: string;

  @ApiPropertyOptional({
    description: '用户持有的签证',
    example: ['US', 'JP'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  heldVisas?: string[];

  @ApiPropertyOptional({
    description: '免签目的地列表',
    example: ['TH', 'SG'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visaFreeDestinations?: string[];

  @ApiPropertyOptional({
    description: '签证信息摘要',
    example: '中国护照免签泰国、新加坡等',
  })
  @IsOptional()
  @IsString()
  visaInfoSummary?: string | null;

  @ApiPropertyOptional({
    description: '返回数量',
    example: 10,
    default: 10,
    minimum: 8,
    maximum: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(12)
  limit?: number;
}

export class LocationDetailDto {
  @ApiPropertyOptional({ description: '国家', example: 'Iceland' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: '描述',
    example: '冰岛是追求宁静和自然美景的理想目的地',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '亮点',
    example: ['极光', '温泉', '冰川'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @ApiPropertyOptional({
    description: '最佳季节',
    example: '全年，夏季最佳',
  })
  @IsOptional()
  @IsString()
  bestSeason?: string;

  @ApiPropertyOptional({
    description: '目的地封面图片URL',
    example: 'https://images.unsplash.com/photo-1234567890',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({
    description: '预算信息（每人每天，单位：人民币）',
    example: {
      low: 500,
      medium: 1000,
      high: 2000,
      currency: 'CNY',
      description: '预算范围：经济型500-800元/天，舒适型1000-1500元/天，豪华型2000-3000元/天',
    },
  })
  @IsOptional()
  @IsObject()
  budget?: {
    low?: number;
    medium?: number;
    high?: number;
    currency?: string;
    description?: string;
  };
}

export class RecommendDestinationsDataDto {
  @ApiProperty({
    description: '推荐的目的地列表',
    example: ['冰岛', '挪威', '瑞士'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  locations!: string[];

  @ApiPropertyOptional({
    description: '目的地详情',
    type: Object,
    example: {
      '冰岛': {
        country: 'Iceland',
        description: '冰岛是追求宁静和自然美景的理想目的地',
        highlights: ['极光', '温泉', '冰川'],
        bestSeason: '全年，夏季最佳',
        coverImage: 'https://images.unsplash.com/photo-1234567890',
        budget: {
          low: 800,
          medium: 1500,
          high: 3000,
          currency: 'CNY',
          description: '预算范围：经济型800-1000元/天，舒适型1500-2000元/天，豪华型3000-4000元/天',
        },
      },
    },
  })
  @IsOptional()
  @IsObject()
  locationDetails?: Record<string, LocationDetailDto>;

  @ApiPropertyOptional({
    description: '推荐理由',
    example: '这些目的地符合您对安静、放松的需求，拥有丰富的自然景观和疗愈环境',
  })
  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class RecommendDestinationsResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '推荐结果',
    type: RecommendDestinationsDataDto,
  })
  @ValidateNested()
  @Type(() => RecommendDestinationsDataDto)
  data!: RecommendDestinationsDataDto;
}

// 生成完整行程相关 DTO（灵感模式）
export class GenerateInspirationItineraryRequestDto {
  @ApiProperty({
    description: '用户自然语言输入',
    example: '我想去冰岛看极光，5天行程',
  })
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiPropertyOptional({
    description: '用户选择的目的地',
    example: '冰岛',
  })
  @IsOptional()
  @IsString()
  selectedDestination?: string;

  @ApiPropertyOptional({
    description: '意图识别结果（可选）',
    type: IntentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntentDto)
  intent?: IntentDto;

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

  @ApiPropertyOptional({ description: '用户永久居住地', example: 'US' })
  @IsOptional()
  @IsString()
  userPermanentResidency?: string;

  @ApiPropertyOptional({
    description: '用户持有的签证',
    example: ['US', 'JP'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  heldVisas?: string[];

  @ApiPropertyOptional({
    description: '免签目的地列表',
    example: ['TH', 'SG'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visaFreeDestinations?: string[];

  @ApiPropertyOptional({
    description: '签证信息摘要',
    example: '中国护照免签泰国、新加坡等',
  })
  @IsOptional()
  @IsString()
  visaInfoSummary?: string | null;

  @ApiPropertyOptional({
    description: '交通偏好',
    example: 'public_transit_and_walking',
    enum: ['public_transit_and_walking', 'driving_and_walking'],
  })
  @IsOptional()
  @IsString()
  transportPreference?: 'public_transit_and_walking' | 'driving_and_walking';

  @ApiPropertyOptional({
    description: '用户期望的天数',
    example: 5,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  userRequestedDays?: number;

  @ApiPropertyOptional({
    description: '生成模式',
    example: 'full',
    enum: ['full', 'candidates'],
    default: 'full',
  })
  @IsOptional()
  @IsString()
  mode?: 'full' | 'candidates';
}

export class TimeSlotDto {
  @ApiProperty({ description: '时间', example: '09:00' })
  @IsString()
  time!: string;

  @ApiPropertyOptional({ description: '标题', example: '铁力士峰云端漫步' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '活动', example: '登顶铁力士峰' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional({
    description: '坐标',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  @IsOptional()
  @IsObject()
  coordinates?: { lat: number; lng: number };

  @ApiPropertyOptional({
    description: '活动类型',
    example: 'attraction',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: '持续时间（分钟）',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: '费用', example: 200 })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({
    description: '详情',
    example: { images: {}, notes: '...', description: '...' },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class ItineraryDayDto {
  @ApiProperty({ description: '第几天', example: 1 })
  @IsNumber()
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: '主题', example: '探索自然' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ description: '情绪', example: 'calm' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: '摘要', example: '第一天行程摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: '时间段列表',
    type: [TimeSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots!: TimeSlotDto[];
}

export class GenerateItineraryDataDto {
  @ApiProperty({ description: '标题', example: '冰岛极光之旅' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: '目的地', example: '冰岛' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '位置', example: '冰岛' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: '位置列表（候选模式）',
    example: ['冰岛', '挪威'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiProperty({
    description: '持续时间',
    example: '5天',
  })
  @IsString()
  duration!: string | number;

  @ApiPropertyOptional({
    description: '天数详情',
    type: [ItineraryDayDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  days?: ItineraryDayDto[];

  @ApiPropertyOptional({
    description: '是否有完整行程',
    example: true,
  })
  @IsOptional()
  hasFullItinerary?: boolean;

  @ApiPropertyOptional({
    description: '生成模式',
    example: 'full',
    enum: ['full', 'candidates'],
  })
  @IsOptional()
  @IsString()
  generationMode?: 'full' | 'candidates';

  @ApiPropertyOptional({
    description: '亮点',
    example: ['极光', '温泉', '冰川'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class GenerateItineraryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '行程数据',
    type: GenerateItineraryDataDto,
  })
  @ValidateNested()
  @Type(() => GenerateItineraryDataDto)
  data!: GenerateItineraryDataDto;
}

// 天数提取相关 DTO
export class ExtractDaysRequestDto {
  @ApiProperty({
    description: '用户输入',
    example: '我想去冰岛5天',
  })
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiPropertyOptional({
    description: '语言代码',
    example: 'zh-CN',
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;
}

export class ExtractDaysDataDto {
  @ApiPropertyOptional({
    description: '提取到的天数',
    example: 5,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  days?: number | null;

  @ApiPropertyOptional({
    description: '置信度（0-1）',
    example: 0.9,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class ExtractDaysResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '天数提取结果',
    type: ExtractDaysDataDto,
  })
  @ValidateNested()
  @Type(() => ExtractDaysDataDto)
  data!: ExtractDaysDataDto;
}

