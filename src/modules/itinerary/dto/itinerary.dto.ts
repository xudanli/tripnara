import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  IsArray,
  IsDateString,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
  ValidateIf,
  IsIn,
  IsBoolean,
  IsEnum,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  IsTimeFormat,
  IsDateFormat,
  IsValidCoordinates,
  IsFutureDate,
} from '../../../utils/validators';

export class ItineraryPreferencesDto {
  @ApiPropertyOptional({
    description: '用户兴趣列表',
    example: ['自然风光', '户外活动'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description: '预算等级',
    example: 'medium',
    enum: ['low', 'medium', 'high'],
  })
  @IsOptional()
  @IsString()
  budget?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({
    description: '旅行风格',
    example: 'relaxed',
    enum: ['relaxed', 'moderate', 'intensive'],
  })
  @IsOptional()
  @IsString()
  travelStyle?: 'relaxed' | 'moderate' | 'intensive';
}

export class IntentDataDto {
  @ApiProperty({
    description: '意图类型',
    example: 'photography_exploration',
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
    example: '用户希望寻找一个安静的地方进行放松和情感疗愈',
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

export class ItineraryActivityDto {
  @ApiProperty({ description: '活动时间', example: '09:00' })
  @IsString()
  @IsTimeFormat({ message: '时间格式必须是 HH:mm，例如: 09:00' })
  time!: string;

  @ApiProperty({ description: '活动标题', example: '铁力士峰云端漫步' })
  @IsString()
  title!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
    example: 'attraction',
  })
  @IsString()
  type!: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';

  @ApiProperty({ description: '持续时间（分钟）', example: 120 })
  @IsNumber()
  @Min(1, { message: '持续时间至少为 1 分钟' })
  @Max(1440, { message: '持续时间不能超过 1440 分钟（24小时）' })
  duration!: number;

  @ApiPropertyOptional({
    description: '位置坐标（如果为 null，后端会自动通过地理编码获取）',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  @IsOptional()
  @IsObject()
  @ValidateIf((o) => o.location !== null && o.location !== undefined)
  @IsValidCoordinates({ message: '坐标格式不正确' })
  location?: { lat: number; lng: number } | null;

  @ApiPropertyOptional({
    description: '地点名称（用于地理编码）',
    example: '琉森湖游船码头',
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({
    description: '地点地址（用于地理编码）',
    example: 'Lucerne, Switzerland',
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiProperty({ description: '活动描述和建议', example: '详细的游览建议和体验描述' })
  @IsString()
  notes!: string;

  @ApiProperty({ description: '预估费用', example: 400 })
  @IsNumber()
  @Min(0, { message: '费用不能为负数' })
  cost!: number;

  @ApiPropertyOptional({ description: '详细信息（JSON对象）', example: { name: { chinese: '...', english: '...' } } })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class ItineraryDayDto {
  @ApiPropertyOptional({ description: '天数ID', example: 'uuid' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '第几天', example: 1 })
  @IsNumber()
  @Min(1, { message: '天数必须大于 0' })
  @Max(365, { message: '天数不能超过 365' })
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  @IsString()
  @IsDateFormat({ message: '日期格式必须是 YYYY-MM-DD，例如: 2024-06-01' })
  date!: string;

  @ApiProperty({
    description: '活动列表',
    type: [ItineraryActivityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryActivityDto)
  activities!: ItineraryActivityDto[];
}

export class GenerateItineraryRequestDto {
  @ApiPropertyOptional({
    description: '目的地（可选，如果不提供将根据其他信息推荐目的地）',
    example: '瑞士琉森',
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({ description: '旅行天数', example: 5, minimum: 1, maximum: 30 })
  @IsNumber()
  @Min(1)
  @Max(30)
  days!: number;

  @ApiPropertyOptional({
    description: '用户偏好，可以是对象或兴趣数组',
    oneOf: [
      { type: 'object', $ref: '#/components/schemas/ItineraryPreferencesDto' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: { interests: ['自然风光', '户外活动'], budget: 'medium', travelStyle: 'relaxed' },
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 如果传入的是数组，转换为对象格式
    if (Array.isArray(value)) {
      return { interests: value };
    }
    // 如果已经是对象或未定义，直接返回
    if (value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.preferences !== undefined && o.preferences !== null)
  @IsObject({ message: 'preferences must be either object or array' })
  @ValidateNested()
  @Type(() => ItineraryPreferencesDto)
  preferences?: ItineraryPreferencesDto;

  @ApiProperty({ description: '旅行开始日期', example: '2024-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({
    description: '意图识别数据（可选，用于优化行程生成）',
    type: IntentDataDto,
    example: {
      intentType: 'photography_exploration',
      keywords: ['摄影', '自然风光', '日出'],
      emotionTone: 'calm',
      description: '用户希望进行摄影探索，寻找自然美景',
      confidence: 0.85,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntentDataDto)
  intent?: IntentDataDto;

  @ApiPropertyOptional({
    description: '语言代码，用于生成对应语言的行程内容',
    example: 'en-US',
    enum: ['zh-CN', 'en-US', 'en'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['zh-CN', 'en-US', 'en'])
  language?: string;
}

export class ItineraryDataDto {
  @ApiProperty({ description: '行程天数详情', type: [ItineraryDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  days!: ItineraryDayDto[];

  @ApiProperty({ description: '总费用', example: 8000 })
  @IsNumber()
  totalCost!: number;

  @ApiProperty({ description: '行程摘要', example: '行程摘要' })
  @IsString()
  summary!: string;

  @ApiPropertyOptional({ description: '货币代码', example: 'CHF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: '货币详细信息',
    example: { code: 'CHF', symbol: 'CHF', name: '瑞士法郎' },
  })
  @IsOptional()
  @IsObject()
  currencyInfo?: {
    code: string;
    symbol: string;
    name: string;
  };

  @ApiPropertyOptional({
    description: '实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等）',
    example: {
      weather: '未来一周天气预报摘要',
      safety: '安全提醒和注意事项',
      plugType: 'Type C, 220V',
      currency: 'CHF，1 CHF ≈ 8 CNY',
      culturalTaboos: '文化禁忌和注意事项',
      packingList: '针对性打包清单',
    },
  })
  @IsOptional()
  @IsObject()
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };
}

export class GenerateItineraryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程数据', type: ItineraryDataDto })
  data!: ItineraryDataDto;

  @ApiProperty({ description: '生成时间', example: '2024-01-01T00:00:00Z' })
  generatedAt!: string;
}

// CRUD DTOs
export class CreateItineraryRequestDto {
  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  @IsString()
  destination!: string;

  @ApiProperty({ description: '旅行开始日期', example: '2024-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: '旅行天数', example: 5, minimum: 1, maximum: 30 })
  @IsNumber()
  @Min(1)
  @Max(30)
  days!: number;

  @ApiProperty({ description: '行程数据', type: ItineraryDataDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDataDto)
  data!: ItineraryDataDto;

  @ApiPropertyOptional({
    description: '用户偏好，可以是对象或兴趣数组',
    oneOf: [
      { type: 'object', $ref: '#/components/schemas/ItineraryPreferencesDto' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: { interests: ['自然风光', '户外活动'], budget: 'medium', travelStyle: 'relaxed' },
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 如果传入的是数组，转换为对象格式
    if (Array.isArray(value)) {
      return { interests: value };
    }
    // 如果已经是对象或未定义，直接返回
    if (value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.preferences !== undefined && o.preferences !== null)
  @IsObject({ message: 'preferences must be either object or array' })
  @ValidateNested()
  @Type(() => ItineraryPreferencesDto)
  preferences?: ItineraryPreferencesDto;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published' | 'archived';
}

export class UpdateItineraryRequestDto {
  @ApiPropertyOptional({ description: '目的地', example: '瑞士琉森' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '旅行开始日期', example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '旅行天数', example: 5, minimum: 1, maximum: 30 })
  @IsOptional()
  @ValidateIf((o) => {
    // 只有当 days 存在、是数字、且在有效范围内时才验证
    if (o.days === undefined || o.days === null) return false;
    if (typeof o.days !== 'number') return false;
    if (isNaN(o.days)) return false;
    // 如果值无效（< 1 或 > 30），跳过验证（让服务层处理）
    if (o.days < 1 || o.days > 30) return false;
    return true;
  })
  @IsNumber()
  @Min(1, { message: 'days must not be less than 1' })
  @Max(30, { message: 'days must not be greater than 30' })
  days?: number;

  @ApiPropertyOptional({ description: '行程摘要', example: '行程摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '总费用', example: 8000 })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional({
    description: '用户偏好，可以是对象或兴趣数组',
    oneOf: [
      { type: 'object', $ref: '#/components/schemas/ItineraryPreferencesDto' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: { interests: ['自然风光', '户外活动'], budget: 'medium', travelStyle: 'relaxed' },
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 如果传入的是数组，转换为对象格式
    if (Array.isArray(value)) {
      return { interests: value };
    }
    // 如果已经是对象或未定义，直接返回
    if (value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.preferences !== undefined && o.preferences !== null)
  @IsObject({ message: 'preferences must be either object or array' })
  @ValidateNested()
  @Type(() => ItineraryPreferencesDto)
  preferences?: ItineraryPreferencesDto;

  @ApiPropertyOptional({
    description: '实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等）',
    example: {
      weather: '未来一周天气预报摘要',
      safety: '安全提醒和注意事项',
      plugType: 'Type C, 220V',
      currency: 'CHF，1 CHF ≈ 8 CNY',
      culturalTaboos: '文化禁忌和注意事项',
      packingList: '针对性打包清单',
    },
  })
  @IsOptional()
  @IsObject()
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
  })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published' | 'archived';
}

export class ItineraryListItemDto {
  @ApiProperty({ description: '行程ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  destination!: string;

  @ApiProperty({ description: '旅行开始日期', example: '2024-06-01' })
  startDate!: string;

  @ApiProperty({ description: '旅行天数', example: 5 })
  days!: number;

  @ApiPropertyOptional({ description: '行程摘要', example: '行程摘要' })
  summary?: string;

  @ApiPropertyOptional({ description: '总费用', example: 8000 })
  totalCost?: number;

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
    example: 'draft',
  })
  status!: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00Z' })
  updatedAt!: string;
}

export class ItineraryDetailDto {
  @ApiProperty({ description: '行程ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  destination!: string;

  @ApiProperty({ description: '旅行开始日期', example: '2024-06-01' })
  startDate!: string;

  @ApiProperty({ description: '旅行天数', example: 5 })
  daysCount!: number;

  @ApiProperty({ description: '行程摘要', example: '行程摘要' })
  summary!: string;

  @ApiProperty({ description: '总费用', example: 8000 })
  totalCost!: number;

  @ApiProperty({ description: '行程天数详情', type: [ItineraryDayDto] })
  days!: ItineraryDayDto[];

  @ApiPropertyOptional({
    description: '是否有天数数据（辅助字段，用于前端判断）',
    example: true,
  })
  hasDays?: boolean;

  @ApiPropertyOptional({
    description: '用户偏好',
    type: ItineraryPreferencesDto,
  })
  preferences?: ItineraryPreferencesDto;

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
    example: 'draft',
  })
  status!: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00Z' })
  updatedAt!: string;
}


export class ItineraryListResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '行程列表',
    type: [ItineraryListItemDto],
  })
  data!: ItineraryListItemDto[];

  @ApiProperty({ description: '总数', example: 10 })
  total!: number;

  @ApiProperty({ description: '当前页', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit!: number;
}

export class ItineraryDetailResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程详情', type: ItineraryDetailDto })
  data!: ItineraryDetailDto;
}

export class CreateItineraryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程详情', type: ItineraryDetailDto })
  data!: ItineraryDetailDto;
}

export class UpdateItineraryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程详情', type: ItineraryDetailDto })
  data!: ItineraryDetailDto;
}

export class DeleteItineraryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '消息', example: '行程已删除' })
  message!: string;
}

// 前端提供的完整行程数据格式（包含 itineraryData 和 tasks）
export class ItineraryTimeSlotDto {
  @ApiPropertyOptional({ description: '活动ID（slotId，用于编辑/删除活动）', example: 'uuid' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: '天数ID（dayId，用于编辑/删除活动）', example: 'uuid' })
  @IsOptional()
  @IsString()
  dayId?: string;

  @ApiProperty({ description: '时间', example: '08:00' })
  @IsString()
  time!: string;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '活动' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional({
    description: '类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
  })
  @IsOptional()
  @IsString()
  type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';

  @ApiPropertyOptional({ description: '坐标' })
  @IsOptional()
  @IsObject()
  coordinates?: { lat: number; lng: number };

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '持续时间（分钟）' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: '成本' })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: '详情' })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class ItineraryDayWithTimeSlotsDto {
  @ApiPropertyOptional({ description: '天数ID', example: 'uuid' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '天数序号', example: 1 })
  @IsNumber()
  day!: number;

  @ApiProperty({ description: '日期', example: '2025-11-21' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: '天数标题', example: '第一天：抵达目的地' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '天数摘要', example: '抵达目的地，入住酒店，自由活动' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '天数详情（JSON对象）' })
  @IsOptional()
  @IsObject()
  detailsJson?: Record<string, unknown>;

  @ApiProperty({ description: '时间段列表', type: [ItineraryTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryTimeSlotDto)
  timeSlots!: ItineraryTimeSlotDto[];
}

/**
 * 行程详情 DTO（前端格式，使用 timeSlots）
 * 统一使用前端期望的格式，减少前端数据转换工作
 */
export class ItineraryDetailWithTimeSlotsDto {
  @ApiProperty({ description: '行程ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  destination!: string;

  @ApiProperty({ description: '旅行开始日期', example: '2024-06-01' })
  startDate!: string;

  @ApiProperty({ description: '旅行天数', example: 5 })
  daysCount!: number;

  @ApiProperty({ description: '行程摘要', example: '行程摘要' })
  summary!: string;

  @ApiProperty({ description: '总费用', example: 8000 })
  totalCost!: number;

  @ApiPropertyOptional({ description: '货币代码', example: 'CHF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: '货币详细信息',
    example: { code: 'CHF', symbol: 'CHF', name: '瑞士法郎' },
  })
  @IsOptional()
  @IsObject()
  currencyInfo?: {
    code: string;
    symbol: string;
    name: string;
  };

  @ApiProperty({ description: '行程天数详情（使用 timeSlots）', type: [ItineraryDayWithTimeSlotsDto] })
  days!: ItineraryDayWithTimeSlotsDto[];

  @ApiPropertyOptional({
    description: '是否有天数数据（辅助字段，用于前端判断）',
    example: true,
  })
  hasDays?: boolean;

  @ApiPropertyOptional({
    description: '用户偏好',
    type: ItineraryPreferencesDto,
  })
  preferences?: ItineraryPreferencesDto;

  @ApiPropertyOptional({
    description: '实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等）',
    example: {
      weather: '未来一周天气预报摘要',
      safety: '安全提醒和注意事项',
      plugType: 'Type C, 220V',
      currency: 'CHF，1 CHF ≈ 8 CNY',
      culturalTaboos: '文化禁忌和注意事项',
      packingList: '针对性打包清单',
    },
  })
  @IsOptional()
  @IsObject()
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
    example: 'draft',
  })
  status!: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00Z' })
  updatedAt!: string;
}

export class ItineraryDataWithTimeSlotsDto {
  @ApiProperty({ description: '目的地', example: '冰岛' })
  @IsString()
  destination!: string;

  @ApiProperty({ description: '行程天数', example: 5 })
  @IsNumber()
  duration!: number;

  @ApiPropertyOptional({ description: '预算' })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: '偏好数组' })
  @IsOptional()
  @IsArray()
  preferences?: string[];

  @ApiPropertyOptional({ description: '旅行风格' })
  @IsOptional()
  @IsString()
  travelStyle?: string;

  @ApiPropertyOptional({ description: '行程数组' })
  @IsOptional()
  @IsArray()
  itinerary?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: '实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等）',
    example: {
      weather: '未来一周天气预报摘要',
      safety: '安全提醒和注意事项',
      plugType: 'Type C, 220V',
      currency: 'CHF，1 CHF ≈ 8 CNY',
      culturalTaboos: '文化禁忌和注意事项',
      packingList: '针对性打包清单',
    },
  })
  @IsOptional()
  @IsObject()
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };

  @ApiPropertyOptional({ description: '推荐信息' })
  @IsOptional()
  @IsObject()
  recommendations?: {
    accommodation?: string;
    transportation?: string;
    food?: string;
    tips?: string;
  };

  @ApiProperty({ description: '天数详情（使用 timeSlots）', type: [ItineraryDayWithTimeSlotsDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayWithTimeSlotsDto)
  days!: ItineraryDayWithTimeSlotsDto[];

  @ApiPropertyOptional({ description: '总成本' })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional({ description: '摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  title!: string;
}

export class TaskLinkDto {
  @ApiProperty({ description: '链接标签', example: 'IATA 入境政策查询' })
  @IsString()
  label!: string;

  @ApiProperty({ description: '链接URL', example: 'https://www.iatatravelcentre.com/' })
  @IsString()
  url!: string;
}

export class TaskDto {
  @ApiPropertyOptional({ description: '任务ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '任务标题' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: '是否完成', default: false })
  @IsOptional()
  completed?: boolean;

  @ApiPropertyOptional({ description: '创建时间' })
  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @ApiPropertyOptional({ description: '是否自动生成' })
  @IsOptional()
  autoGenerated?: boolean;

  @ApiPropertyOptional({ description: '自动生成键' })
  @IsOptional()
  @IsString()
  autoKey?: string;

  @ApiPropertyOptional({ description: '类别' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '目的地' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '链接列表', type: [TaskLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[];
}

export class CreateItineraryFromFrontendDataDto {
  @ApiProperty({ description: '行程数据', type: ItineraryDataWithTimeSlotsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDataWithTimeSlotsDto)
  itineraryData!: ItineraryDataWithTimeSlotsDto;

  @ApiPropertyOptional({ description: '任务列表', type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional({ description: '旅行开始日期（如果未提供，将使用第一天的日期）', example: '2025-11-21' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '后端行程ID（创建时将被忽略，仅用于前端兼容性）' })
  @IsOptional()
  @IsString()
  backendItineraryId?: string;
}

/**
 * 从前端数据格式更新行程请求 DTO
 * 支持完整的前端数据格式，包括 days 数组的详细内容
 */
export class UpdateItineraryFromFrontendDataDto {
  @ApiProperty({ description: '行程数据', type: ItineraryDataWithTimeSlotsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDataWithTimeSlotsDto)
  itineraryData!: ItineraryDataWithTimeSlotsDto;

  @ApiPropertyOptional({ description: '任务列表', type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional({ description: '旅行开始日期（如果未提供，将使用第一天的日期）', example: '2025-11-21' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

/**
 * 创建行程模版请求 DTO（用于 /api/v1/itineraries 接口）
 * 接受顶层格式的数据，包含 title、language 等字段
 */
export class CreateItineraryTemplateDto {
  @ApiProperty({ description: '行程模版标题', example: '冰岛之旅', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: '目的地', example: '冰岛' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '行程天数', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  duration?: number;

  @ApiPropertyOptional({
    description: '预算等级',
    enum: ['low', 'medium', 'high', 'economy', 'comfort', 'luxury'],
    example: 'medium',
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: '偏好列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @ApiPropertyOptional({
    description: '旅行风格',
    enum: ['relaxed', 'moderate', 'active', 'adventurous', 'intensive'],
    example: 'moderate',
  })
  @IsOptional()
  @IsString()
  travelStyle?: string;

  @ApiPropertyOptional({ description: '推荐信息' })
  @IsOptional()
  @IsObject()
  recommendations?: {
    accommodation?: string;
    transportation?: string;
    food?: string;
    tips?: string;
  };

  @ApiPropertyOptional({ description: '天数详情（使用 timeSlots）', type: [ItineraryDayWithTimeSlotsDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayWithTimeSlotsDto)
  days?: ItineraryDayWithTimeSlotsDto[];

  @ApiPropertyOptional({ description: '总成本', example: 2000 })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional({ description: '行程摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({
    description: '语言代码',
    enum: ['zh-CN', 'en-US'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '任务列表', type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}

/**
 * 创建行程模版响应 DTO
 */
export class CreateItineraryTemplateResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程模版数据' })
  data!: {
    id: string;
    status: string;
    language: string;
    itineraryData: ItineraryDataWithTimeSlotsDto;
    tasks?: TaskDto[];
    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
  };

  @ApiPropertyOptional({ description: '消息', example: '创建成功' })
  message?: string;
}

/**
 * 行程模版查询参数 DTO
 */
export class ItineraryTemplateQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '状态筛选：draft/published/archived/all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '关键字搜索（标题或摘要）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '语言代码',
    enum: ['zh-CN', 'en-US'],
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '目的地' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    description: '预算筛选：low/medium/high/all',
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({
    description: '旅行风格筛选：relaxed/moderate/active/adventurous/all',
  })
  @IsOptional()
  @IsString()
  travelStyle?: string;
}

/**
 * 行程模版列表项 DTO
 */
export class ItineraryTemplateListItemDto {
  @ApiProperty({ description: '行程模版ID' })
  id!: string;

  @ApiProperty({ description: '状态' })
  status!: string;

  @ApiProperty({ description: '语言代码' })
  language!: string;

  @ApiProperty({ description: '行程数据摘要' })
  itineraryData!: {
    title: string;
    destination?: string;
    duration?: number;
    budget?: string;
    totalCost?: number;
    summary?: string;
  };

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 行程模版列表响应 DTO
 */
export class ItineraryTemplateListResponseDto {
  @ApiProperty({ description: '行程模版列表', type: [ItineraryTemplateListItemDto] })
  data!: ItineraryTemplateListItemDto[];

  @ApiProperty({ description: '总记录数' })
  total!: number;

  @ApiProperty({ description: '当前页码' })
  page!: number;

  @ApiProperty({ description: '每页数量' })
  limit!: number;
}

/**
 * 行程模版详情响应 DTO
 */
export class ItineraryTemplateDetailResponseDto {
  @ApiProperty({ description: '行程模版ID' })
  id!: string;

  @ApiProperty({ description: '状态' })
  status!: string;

  @ApiProperty({ description: '语言代码' })
  language!: string;

  @ApiProperty({ description: '完整的行程数据', type: ItineraryDataWithTimeSlotsDto })
  itineraryData!: ItineraryDataWithTimeSlotsDto;

  @ApiPropertyOptional({ description: '天数详情（兼容字段，指向 itineraryData.days）', type: [ItineraryDayWithTimeSlotsDto] })
  days?: ItineraryDayWithTimeSlotsDto[];

  @ApiPropertyOptional({ description: '任务列表', type: [TaskDto] })
  tasks?: TaskDto[];

  @ApiPropertyOptional({ description: '创建者' })
  createdBy?: string;

  @ApiPropertyOptional({ description: '更新者' })
  updatedBy?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 更新行程模版请求 DTO（所有字段可选）
 */
export class UpdateItineraryTemplateDto extends PartialType(
  CreateItineraryTemplateDto,
) {}

/**
 * 更新行程模版响应 DTO
 */
export class UpdateItineraryTemplateResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程模版数据', type: ItineraryTemplateDetailResponseDto })
  data!: ItineraryTemplateDetailResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '更新成功' })
  message?: string;
}

/**
 * 删除行程模版响应 DTO
 */
export class DeleteItineraryTemplateResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '消息', example: '删除成功' })
  message?: string;
}

/**
 * 发布行程模版响应 DTO
 */
export class PublishItineraryTemplateResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程模版数据', type: ItineraryTemplateDetailResponseDto })
  data!: ItineraryTemplateDetailResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '发布成功' })
  message?: string;
}

/**
 * 复制行程模版响应 DTO
 */
export class CloneItineraryTemplateResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程模版数据', type: ItineraryTemplateDetailResponseDto })
  data!: ItineraryTemplateDetailResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '复制成功' })
  message?: string;
}

/**
 * 创建天数请求 DTO
 */
export class CreateDayDto {
  @ApiProperty({ description: '第几天', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  @IsDateString()
  date!: string;
}

/**
 * 批量创建天数请求 DTO
 */
export class CreateDaysDto {
  @ApiProperty({
    description: '天数数组',
    type: [CreateDayDto],
    example: [
      { day: 1, date: '2025-11-25' },
      { day: 2, date: '2025-11-26' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDayDto)
  days!: CreateDayDto[];
}

/**
 * 更新天数请求 DTO
 */
export class UpdateDayDto {
  @ApiPropertyOptional({ description: '第几天', example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  day?: number;

  @ApiPropertyOptional({ description: '日期', example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

/**
 * 创建活动请求 DTO
 */
/**
 * 位置详细信息 DTO
 */
export class LocationDetailsDto {
  @ApiPropertyOptional({ description: '中文名称', example: '铁力士峰云端漫步' })
  @IsOptional()
  @IsString()
  chineseName?: string;

  @ApiPropertyOptional({ description: '当地语言名称', example: 'Titlis Cliff Walk' })
  @IsOptional()
  @IsString()
  localName?: string;

  @ApiPropertyOptional({
    description: '中文地址',
    example: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
  })
  @IsOptional()
  @IsString()
  chineseAddress?: string;

  @ApiPropertyOptional({
    description: '当地语言地址',
    example: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
  })
  @IsOptional()
  @IsString()
  localAddress?: string;

  @ApiPropertyOptional({
    description: '交通信息',
    example: '从琉森乘火车约45分钟至Engelberg站，然后乘坐缆车...',
  })
  @IsOptional()
  @IsString()
  transportInfo?: string;

  @ApiPropertyOptional({
    description: '开放时间',
    example: '全年开放，夏季8:30-17:30，冬季8:30-16:30',
  })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({
    description: '门票价格',
    example: 'Cliff Walk约CHF 15（约¥120）。往返缆车票：成人CHF 89...',
  })
  @IsOptional()
  @IsString()
  ticketPrice?: string;

  @ApiPropertyOptional({
    description: '游览建议',
    example: '最佳游览时间：上午10点前避开人群，晴朗天气最佳...',
  })
  @IsOptional()
  @IsString()
  visitTips?: string;

  @ApiPropertyOptional({
    description: '周边推荐',
    example: '冰川公园、Ice Flyer缆车、旋转缆车体验',
  })
  @IsOptional()
  @IsString()
  nearbyAttractions?: string;

  @ApiPropertyOptional({
    description: '联系方式',
    example: '请查询官网或当地信息中心',
  })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional({ description: '景点类型', example: '景点' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '评分', example: 4.8, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: '建议游览时长', example: '2-3小时' })
  @IsOptional()
  @Transform(({ value }) => {
    // 如果值是 null 或 undefined，保持原样
    if (value === null || value === undefined) {
      return value;
    }
    // 如果值是数字或其他类型，转换为字符串
    return String(value);
  })
  @ValidateIf((o) => o.visitDuration !== null && o.visitDuration !== undefined)
  @IsString()
  visitDuration?: string;

  @ApiPropertyOptional({ description: '最佳游览时间', example: '上午10点前，晴朗天气' })
  @IsOptional()
  @Transform(({ value }) => {
    // 如果值是 null 或 undefined，保持原样
    if (value === null || value === undefined) {
      return value;
    }
    // 如果值是数字或其他类型，转换为字符串
    return String(value);
  })
  @ValidateIf((o) => o.bestTimeToVisit !== null && o.bestTimeToVisit !== undefined)
  @IsString()
  bestTimeToVisit?: string;

  @ApiPropertyOptional({
    description: '无障碍设施信息',
    example: '请确认无障碍设施',
  })
  @IsOptional()
  @IsString()
  accessibility?: string;

  @ApiPropertyOptional({
    description: '穿搭建议',
    example: '建议穿着舒适的步行鞋和轻便外套，山区天气变化快，建议携带雨具',
  })
  @IsOptional()
  @IsString()
  dressingTips?: string;

  @ApiPropertyOptional({
    description: '当地文化提示和特殊注意事项',
    example: '进入宗教场所需脱帽，保持安静；当地习惯给小费，建议准备零钱',
  })
  @IsOptional()
  @IsString()
  culturalTips?: string;

  @ApiPropertyOptional({
    description: '是否需要提前预订',
    example: '建议提前预订，可通过官网或电话预约，旺季需提前1-2周预订',
  })
  @IsOptional()
  @IsString()
  bookingInfo?: string;
}

export class CreateActivityDto {
  @ApiProperty({ description: '活动时间', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  time!: string;

  @ApiProperty({ description: '活动标题', example: '铁力士峰云端漫步' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
    example: 'attraction',
  })
  @IsString()
  type!: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';

  @ApiProperty({ description: '持续时间（分钟）', example: 120, minimum: 1 })
  @IsNumber()
  @Min(1)
  duration!: number;

  @ApiProperty({
    description: '位置坐标',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  @IsObject()
  location!: { lat: number; lng: number };

  @ApiPropertyOptional({ description: '活动描述和建议', example: '详细的游览建议和体验描述' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '预估费用', example: 400, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: '位置详细信息',
    type: LocationDetailsDto,
    example: {
      chineseName: '铁力士峰云端漫步',
      localName: 'Titlis Cliff Walk',
      chineseAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      localAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      transportInfo: '从琉森乘火车约45分钟至Engelberg站，然后乘坐缆车...',
      openingHours: '全年开放，夏季8:30-17:30，冬季8:30-16:30',
      ticketPrice: 'Cliff Walk约CHF 15（约¥120）',
      visitTips: '最佳游览时间：上午10点前避开人群',
      rating: 4.8,
      visitDuration: '2-3小时',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDetailsDto)
  locationDetails?: LocationDetailsDto;

  @ApiPropertyOptional({
    description: 'TripAdvisor 景点 ID（用于获取景点详情，将存储在 details.tripAdvisorId）',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  tripAdvisorId?: string;
}

/**
 * 更新活动请求 DTO
 */
export class UpdateActivityDto {
  @ApiPropertyOptional({ description: '活动时间', example: '09:00' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: '活动标题', example: '铁力士峰云端漫步' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
    example: 'attraction',
  })
  @IsOptional()
  @IsString()
  type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';

  @ApiPropertyOptional({ description: '持续时间（分钟）', example: 120, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    description: '位置坐标',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @ApiPropertyOptional({ description: '活动描述和建议', example: '详细的游览建议和体验描述' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '预估费用', example: 400, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: '位置详细信息',
    type: LocationDetailsDto,
    example: {
      chineseName: '铁力士峰云端漫步',
      localName: 'Titlis Cliff Walk',
      chineseAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      localAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      transportInfo: '从琉森乘火车约45分钟至Engelberg站，然后乘坐缆车...',
      openingHours: '全年开放，夏季8:30-17:30，冬季8:30-16:30',
      ticketPrice: 'Cliff Walk约CHF 15（约¥120）',
      visitTips: '最佳游览时间：上午10点前避开人群',
      rating: 4.8,
      visitDuration: '2-3小时',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDetailsDto)
  locationDetails?: LocationDetailsDto;

  @ApiPropertyOptional({
    description: 'TripAdvisor 景点 ID（用于获取景点详情，将存储在 details.tripAdvisorId）',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  tripAdvisorId?: string;
}

/**
 * 重新排序活动请求 DTO
 */
export class ReorderActivitiesDto {
  @ApiProperty({
    description: '活动 ID 列表（按新顺序排列）',
    example: ['activity-id-1', 'activity-id-2', 'activity-id-3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  activityIds!: string[];
}

/**
 * 复制行程响应 DTO
 */
export class CloneJourneyResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '新创建的行程数据', type: ItineraryDetailResponseDto })
  data!: ItineraryDetailResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '复制成功' })
  message?: string;
}

/**
 * 分享行程请求 DTO
 */
export class ShareJourneyRequestDto {
  @ApiPropertyOptional({
    description: '分享有效期（天数）',
    example: 7,
    minimum: 1,
    maximum: 365,
    default: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @ApiPropertyOptional({
    description: '是否需要密码',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requirePassword?: boolean;

  @ApiPropertyOptional({
    description: '分享密码（如果 requirePassword 为 true）',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  password?: string;
}

/**
 * 分享行程响应 DTO
 */
export class ShareJourneyResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '分享链接',
    example: 'https://app.example.com/share/abc123def456',
  })
  shareUrl!: string;

  @ApiProperty({
    description: '分享码',
    example: 'ABC123',
  })
  shareCode!: string;

  @ApiPropertyOptional({
    description: '分享密码（如果设置了密码）',
    example: '123456',
  })
  password?: string;

  @ApiProperty({
    description: '过期时间',
    example: '2025-02-01T00:00:00.000Z',
  })
  expiresAt!: string;

  @ApiPropertyOptional({ description: '消息', example: '分享成功' })
  message?: string;
}

/**
 * 导出行程请求 DTO
 */
export class ExportJourneyRequestDto {
  @ApiProperty({
    description: '导出格式',
    enum: ['pdf', 'ics', 'json'],
    example: 'pdf',
  })
  @IsString()
  @IsIn(['pdf', 'ics', 'json'])
  format!: 'pdf' | 'ics' | 'json';
}

/**
 * 导出行程响应 DTO
 */
export class ExportJourneyResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '导出文件URL（如果是 PDF/ICS）或数据（如果是 JSON）',
  })
  data!: string | Record<string, unknown>;

  @ApiProperty({
    description: '文件类型',
    example: 'application/pdf',
  })
  contentType!: string;

  @ApiProperty({
    description: '文件名',
    example: 'journey-2025-01-15.pdf',
  })
  filename!: string;

  @ApiPropertyOptional({ description: '消息', example: '导出成功' })
  message?: string;
}

/**
 * 重置行程请求 DTO
 */
export class ResetJourneyRequestDto {
  @ApiPropertyOptional({
    description: '是否保留历史版本',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  keepHistory?: boolean;

  @ApiPropertyOptional({
    description: '重置说明',
    example: '重置为初始状态',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 重置行程响应 DTO
 */
export class ResetJourneyResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '重置后的行程数据', type: ItineraryDetailResponseDto })
  data!: ItineraryDetailResponseDto;

  @ApiPropertyOptional({
    description: '历史版本ID（如果 keepHistory 为 true）',
    example: 'version-id-123',
  })
  historyVersionId?: string;

  @ApiPropertyOptional({ description: '消息', example: '重置成功' })
  message?: string;
}

/**
 * 获取任务列表响应 DTO
 */
export class TaskListResponseDto {
  @ApiProperty({ description: '任务列表', type: [TaskDto] })
  tasks!: TaskDto[];
}

/**
 * 同步任务请求 DTO
 */
export class SyncTasksRequestDto {
  @ApiPropertyOptional({
    description: '是否强制重新生成',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;

  @ApiPropertyOptional({
    description: '模板ID（如果要从模板同步）',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}

/**
 * 同步任务响应 DTO
 */
export class SyncTasksResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '同步后的任务列表', type: [TaskDto] })
  tasks!: TaskDto[];

  @ApiPropertyOptional({ description: '消息', example: '同步成功' })
  message?: string;
}

/**
 * 更新任务请求 DTO
 */
export class UpdateTaskRequestDto {
  @ApiPropertyOptional({ description: '任务标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '是否完成' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: '链接列表', type: [TaskLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[];
}

/**
 * 更新任务响应 DTO
 */
export class UpdateTaskResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '更新后的任务', type: TaskDto })
  task!: TaskDto;

  @ApiPropertyOptional({ description: '消息', example: '更新成功' })
  message?: string;
}

/**
 * 创建任务请求 DTO
 */
export class CreateTaskRequestDto {
  @ApiProperty({ description: '任务标题' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: '类别' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '目的地' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '链接列表', type: [TaskLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[];
}

/**
 * 创建任务响应 DTO
 */
export class CreateTaskResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '创建的任务', type: TaskDto })
  task!: TaskDto;

  @ApiPropertyOptional({ description: '消息', example: '创建成功' })
  message?: string;
}

/**
 * 删除任务响应 DTO
 */
export class DeleteTaskResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '消息', example: '删除成功' })
  message?: string;
}

/**
 * 准备任务模板列表项 DTO
 */
export class PreparationProfileListItemDto {
  @ApiProperty({ description: '模板ID' })
  id!: string;

  @ApiProperty({ description: '模板代码' })
  code!: string;

  @ApiProperty({ description: '模板标题' })
  title!: string;

  @ApiProperty({ description: '任务数量' })
  taskCount!: number;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 准备任务模板列表响应 DTO
 */
export class PreparationProfileListResponseDto {
  @ApiProperty({ description: '模板列表', type: [PreparationProfileListItemDto] })
  data!: PreparationProfileListItemDto[];

  @ApiProperty({ description: '总数量' })
  total!: number;
}

/**
 * 准备任务模板详情响应 DTO
 */
export class PreparationProfileDetailResponseDto {
  @ApiProperty({ description: '模板ID' })
  id!: string;

  @ApiProperty({ description: '模板代码' })
  code!: string;

  @ApiProperty({ description: '模板标题' })
  title!: string;

  @ApiProperty({ description: '任务列表', type: [TaskDto] })
  tasks!: TaskDto[];

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 创建准备任务模板请求 DTO
 */
export class CreatePreparationProfileRequestDto {
  @ApiProperty({ description: '模板代码（唯一标识）', example: 'iceland-general' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: '模板标题', example: '冰岛通用准备任务' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: '任务列表', type: [TaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks!: TaskDto[];
}

/**
 * 创建准备任务模板响应 DTO
 */
export class CreatePreparationProfileResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '创建的模板数据', type: PreparationProfileDetailResponseDto })
  data!: PreparationProfileDetailResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '创建成功' })
  message?: string;
}

/**
 * 生成安全提示请求 DTO
 */
export class GenerateSafetyNoticeRequestDto {
  @ApiPropertyOptional({ description: '语言代码', example: 'zh-CN', default: 'zh-CN' })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({ description: '是否强制刷新（忽略缓存）', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

/**
 * 通用安全提示请求 DTO（无需认证）
 */
export class GeneratePublicSafetyNoticeRequestDto {
  @ApiProperty({ description: '目的地', example: '冰岛' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiPropertyOptional({ description: '行程摘要（可选，用于更精准的安全提示）', example: '5天冰岛之旅，包含极光观赏、蓝湖温泉等' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '语言代码', example: 'zh-CN', default: 'zh-CN' })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({ description: '是否强制刷新（忽略缓存）', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

/**
 * 安全提示响应 DTO
 */
export class SafetyNoticeDto {
  @ApiProperty({ description: '安全提示文本', example: '前往冰岛旅行时，请注意以下安全事项...' })
  noticeText!: string;

  @ApiProperty({ description: '语言代码', example: 'zh-CN' })
  lang!: string;

  @ApiPropertyOptional({ description: '是否来自缓存', example: true })
  fromCache?: boolean;

  @ApiPropertyOptional({ description: '生成时间', example: '2025-01-15T10:00:00.000Z' })
  generatedAt?: string;
}

/**
 * 生成安全提示响应 DTO
 */
export class GenerateSafetyNoticeResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '安全提示数据', type: SafetyNoticeDto })
  data!: SafetyNoticeDto;

  @ApiPropertyOptional({ description: '消息', example: '安全提示生成成功' })
  message?: string;
}

/**
 * 获取安全提示响应 DTO
 */
export class GetSafetyNoticeResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '安全提示数据', type: SafetyNoticeDto })
  data!: SafetyNoticeDto;
}

/**
 * 支出分类类型
 */
export type ExpenseCategory =
  | '交通'
  | '住宿'
  | '餐饮'
  | '景点'
  | '购物'
  | '其他';

/**
 * 分摊方式类型
 */
export type ExpenseSplitType = 'none' | 'equal' | 'custom';

/**
 * 支出 DTO
 */
export class ExpenseDto {
  @ApiProperty({ description: '支出ID', example: 'exp_123456' })
  id!: string;

  @ApiProperty({ description: '支出标题', example: '午餐' })
  title!: string;

  @ApiProperty({ description: '支出金额', example: 2500 })
  amount!: number;

  @ApiProperty({ description: '货币代码', example: 'ISK' })
  currencyCode!: string;

  @ApiPropertyOptional({
    description: '分类',
    enum: ['交通', '住宿', '餐饮', '景点', '购物', '其他'],
    example: '餐饮',
  })
  category?: ExpenseCategory;

  @ApiPropertyOptional({ description: '位置/商家', example: '雷克雅未克市中心餐厅' })
  location?: string;

  @ApiPropertyOptional({ description: '付款人ID', example: 'user_001' })
  payerId?: string;

  @ApiPropertyOptional({ description: '付款人名称', example: '张三' })
  payerName?: string;

  @ApiPropertyOptional({
    description: '分摊方式',
    enum: ['none', 'equal', 'custom'],
    example: 'equal',
    default: 'none',
  })
  splitType?: ExpenseSplitType;

  @ApiPropertyOptional({
    description: '自定义分摊详情',
    example: { memberId1: 1000, memberId2: 1500 },
  })
  splitDetails?: Record<string, number>;

  @ApiProperty({ description: '支出日期', example: '2025-11-25' })
  date!: string;

  @ApiPropertyOptional({ description: '备注', example: '四人AA' })
  notes?: string;

  @ApiProperty({ description: '创建时间', example: '2025-11-25T12:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2025-11-25T12:00:00Z' })
  updatedAt!: string;
}

/**
 * 创建支出请求 DTO
 */
export class CreateExpenseDto {
  @ApiProperty({ description: '支出标题', example: '午餐' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: '支出金额', example: 2500, minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: '支出金额必须大于0' })
  amount!: number;

  @ApiPropertyOptional({ description: '货币代码', example: 'ISK', default: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({
    description: '分类',
    enum: ['交通', '住宿', '餐饮', '景点', '购物', '其他'],
    example: '餐饮',
  })
  @IsOptional()
  @IsString()
  @IsIn(['交通', '住宿', '餐饮', '景点', '购物', '其他'])
  category?: ExpenseCategory;

  @ApiPropertyOptional({ description: '位置/商家', example: '雷克雅未克市中心餐厅' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: '付款人ID', example: 'user_001' })
  @IsOptional()
  @IsString()
  payerId?: string;

  @ApiPropertyOptional({ description: '付款人名称', example: '张三' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payerName?: string;

  @ApiPropertyOptional({
    description: '分摊方式',
    enum: ['none', 'equal', 'custom'],
    example: 'equal',
    default: 'none',
  })
  @IsOptional()
  @IsString()
  @IsIn(['none', 'equal', 'custom'])
  splitType?: ExpenseSplitType;

  @ApiPropertyOptional({
    description: '自定义分摊详情（当splitType为custom时必填）',
    example: { memberId1: 1000, memberId2: 1500 },
  })
  @IsOptional()
  @IsObject()
  @ValidateIf((o) => o.splitType === 'custom')
  @IsNotEmpty({ message: '当分摊方式为custom时，必须提供splitDetails' })
  splitDetails?: Record<string, number>;

  @ApiPropertyOptional({
    description: '支出日期',
    example: '2025-11-25',
    default: 'today',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: '备注', example: '四人AA' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * 更新支出请求 DTO
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

/**
 * 获取支出列表响应 DTO
 */
export class GetExpenseListResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '支出列表', type: [ExpenseDto] })
  data!: ExpenseDto[];

  @ApiProperty({ description: '总支出金额', example: 2500 })
  total!: number;
}

/**
 * 创建支出响应 DTO
 */
export class CreateExpenseResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '创建的支出', type: ExpenseDto })
  data!: ExpenseDto;

  @ApiPropertyOptional({ description: '消息', example: '支出创建成功' })
  message?: string;
}

/**
 * 更新支出响应 DTO
 */
export class UpdateExpenseResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '更新后的支出', type: ExpenseDto })
  data!: ExpenseDto;

  @ApiPropertyOptional({ description: '消息', example: '支出更新成功' })
  message?: string;
}

/**
 * 删除支出响应 DTO
 */
export class DeleteExpenseResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '消息', example: '支出删除成功' })
  message?: string;
}

/**
 * 批量获取活动详情请求 DTO
 */
export class BatchGetActivitiesRequestDto {
  @ApiPropertyOptional({
    description: '天数ID列表，如果不提供则获取整个行程所有天的活动',
    type: [String],
    example: ['day-id-1', 'day-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dayIds?: string[];
}

/**
 * 批量获取活动详情响应 DTO
 * 按天数分组返回活动列表
 */
export class BatchActivitiesResponseDto {
  @ApiProperty({
    description: '活动详情，按天数ID分组',
    example: {
      'day-id-1': [
        {
          id: 'activity-id-1',
          time: '09:00',
          title: '活动标题',
          type: 'attraction',
          duration: 90,
          location: { lat: 64.1419, lng: -21.9274 },
          notes: '活动备注',
          cost: 1200,
          details: {},
        },
      ],
    },
  })
  activities!: Record<string, Array<ItineraryActivityDto & { id: string }>>;

  @ApiProperty({ description: '总活动数量', example: 10 })
  totalCount!: number;
}

/**
 * 重新计算总费用响应 DTO
 */
export class RecalculateTotalCostResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程ID', example: 'uuid' })
  journeyId!: string;

  @ApiProperty({ description: '新的总费用', example: 8000 })
  totalCost!: number;

  @ApiPropertyOptional({ description: '之前的总费用', example: 7500 })
  previousTotalCost?: number;
}

/**
 * 生成每日概要请求 DTO
 */
export class GenerateDailySummariesRequestDto {
  @ApiPropertyOptional({
    description: '指定要生成概要的日期（第几天），如果不提供则生成所有天的概要',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  day?: number;

  @ApiPropertyOptional({
    description: '语言代码，用于生成对应语言的每日概要',
    example: 'en-US',
    enum: ['zh-CN', 'en-US', 'en'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['zh-CN', 'en-US', 'en'])
  language?: string;
}

/**
 * 每日概要数据 DTO
 */
export class DailySummaryDto {
  @ApiProperty({ description: '第几天', example: 1 })
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  date!: string;

  @ApiProperty({ description: '每日概要内容', example: '第一天将探索琉森老城区的历史建筑和文化遗产...' })
  summary!: string;

  @ApiProperty({ description: '生成时间', example: '2024-06-01T12:00:00.000Z' })
  generatedAt!: string;
}

/**
 * 生成每日概要响应 DTO
 */
export class GenerateDailySummariesResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程ID', example: 'uuid' })
  journeyId!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  destination!: string;

  @ApiProperty({
    description: '每日概要列表',
    type: [DailySummaryDto],
  })
  data!: DailySummaryDto[];

  @ApiPropertyOptional({ description: '消息', example: '成功生成每日概要' })
  message?: string;
}

/**
 * 行程助手聊天请求 DTO
 */
export class JourneyAssistantChatRequestDto {
  @ApiProperty({
    description: '用户消息',
    example: '这个行程的预算大概是多少？',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: '对话ID（用于多轮对话，如果不提供将创建新对话）',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsOptional()
  @ValidateIf((o) => o.conversationId !== undefined && o.conversationId !== null)
  @IsUUID(4, { message: 'conversationId 必须是有效的 UUID 格式' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: '语言代码',
    example: 'zh-CN',
    enum: ['zh-CN', 'en-US'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;
}

/**
 * 行程助手聊天响应 DTO
 */
/**
 * 行程修改建议 DTO
 */
export class ModificationSuggestionDto {
  @ApiProperty({
    description: '修改类型',
    enum: ['modify', 'add', 'delete', 'reorder'],
    example: 'modify',
  })
  @IsEnum(['modify', 'add', 'delete', 'reorder'])
  type!: 'modify' | 'add' | 'delete' | 'reorder';

  @ApiProperty({
    description: '修改目标',
    example: {
      day: 1,
      dayId: 'day-id-here',
      activityId: 'activity-id-here',
      slotId: 'slot-id-here',
    },
  })
  @IsObject()
  target!: {
    day?: number; // 天数（1-based）
    dayId?: string; // 天数ID
    activityId?: string; // 活动ID
    slotId?: string; // 时间段ID（前端使用）
  };

  @ApiPropertyOptional({
    description: '修改内容（用于 modify 类型）',
    example: {
      time: '10:00',
      title: '新标题',
      duration: 120,
    },
  })
  @IsOptional()
  @IsObject()
  changes?: {
    time?: string;
    title?: string;
    type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration?: number;
    location?: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };

  @ApiPropertyOptional({
    description: '新活动数据（用于 add 类型）',
    example: {
      time: '14:00',
      title: '新活动',
      type: 'attraction',
      duration: 90,
      location: { lat: 46.7704, lng: 8.4050 },
    },
  })
  @IsOptional()
  @IsObject()
  newActivity?: {
    time: string;
    title: string;
    type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration: number;
    location: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };

  @ApiPropertyOptional({
    description: '新的活动顺序（用于 reorder 类型）',
    example: ['activity-id-1', 'activity-id-2', 'activity-id-3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newOrder?: string[];

  @ApiPropertyOptional({
    description: '修改原因（给用户看的说明）',
    example: '将活动时间调整为10:00，提供更充足的准备时间',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class JourneyAssistantChatResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: 'AI助手回复', example: '根据您的行程安排，总预算大约在8000-12000元之间...' })
  response!: string;

  @ApiProperty({ description: '对话ID', example: 'uuid' })
  conversationId!: string;

  @ApiPropertyOptional({ description: '消息', example: '回复成功' })
  message?: string;

  @ApiPropertyOptional({
    description: '行程修改建议（当用户提出修改需求时，Nara会生成结构化的修改建议）',
    type: [ModificationSuggestionDto],
    example: [
      {
        type: 'modify',
        target: {
          day: 1,
          activityId: 'activity-id-here',
        },
        changes: {
          time: '10:00',
        },
        reason: '将活动时间调整为10:00，提供更充足的准备时间',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModificationSuggestionDto)
  modifications?: ModificationSuggestionDto[];
}

/**
 * 对话消息 DTO
 */
export class ConversationMessageDto {
  @ApiProperty({ description: '消息ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '消息角色', enum: ['user', 'assistant'], example: 'user' })
  role!: 'user' | 'assistant';

  @ApiProperty({ description: '消息内容', example: '这个行程的预算大概是多少？' })
  content!: string;

  @ApiProperty({ description: '消息序号', example: 1 })
  sequence!: number;

  @ApiPropertyOptional({ description: '元数据', example: {} })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间', example: '2025-01-30T10:00:00Z' })
  createdAt!: Date;
}

/**
 * 获取对话历史响应 DTO
 */
export class GetConversationHistoryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '对话ID', example: 'uuid' })
  conversationId!: string;

  @ApiProperty({
    description: '对话消息列表',
    type: [ConversationMessageDto],
  })
  messages!: ConversationMessageDto[];

  @ApiProperty({ description: '消息总数', example: 10 })
  totalCount!: number;
}

/**
 * 文化红黑榜响应 DTO
 */
export class CulturalGuideResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '目的地名称', example: '冰岛' })
  destination!: string;

  @ApiProperty({ description: '文化红黑榜内容（Markdown格式）', example: '# 冰岛文化红黑榜\n\n## ✅ 推荐做法\n...' })
  content!: string;

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache!: boolean;

  @ApiProperty({ description: '生成时间', example: '2025-12-01T12:00:00Z' })
  generatedAt!: string;
}

/**
 * 目的地实用信息数据 DTO
 */
export class LocalEssentialsDataDto {
  @ApiProperty({
    description: '官方语言及常用问候语',
    example: '冰岛语（Íslenska）。常用问候：你好 - Halló / Góðan daginn，谢谢 - Takk / Þakka þér',
  })
  language!: string;

  @ApiProperty({
    description: '汇率估算',
    example: '1 ISK ≈ 0.05 CNY（约20冰岛克朗 = 1人民币）',
  })
  currencyRate!: string;

  @ApiProperty({
    description: '时区（GMT/UTC格式）',
    example: 'GMT+0 或 UTC+0',
  })
  timeZone!: string;

  @ApiProperty({
    description: '插座类型',
    example: 'Type C, 220V（欧式两圆插）',
  })
  powerOutlet!: string;

  @ApiProperty({
    description: '报警/急救电话',
    example: '112（紧急电话，报警、消防、急救通用）',
  })
  emergencyNumber!: string;
}

/**
 * 目的地实用信息响应 DTO
 */
export class LocalEssentialsResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '目的地名称', example: '冰岛' })
  destination!: string;

  @ApiProperty({
    description: '实用信息',
    type: LocalEssentialsDataDto,
  })
  localEssentials!: LocalEssentialsDataDto;

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache!: boolean;

  @ApiProperty({ description: '生成时间', example: '2025-12-01T12:00:00Z' })
  generatedAt!: string;
}

/**
 * 天气信息数据 DTO
 */
export class WeatherInfoDto {
  @ApiProperty({
    description: '当前天气概况（实时）或平均温度范围（历史）',
    example: '当前温度：15°C，天气：多云，湿度：65%',
  })
  currentWeather!: string;

  @ApiProperty({
    description: '天气预报（实时）或典型天气状况（历史）',
    example: '未来7天天气预报：第1天15°C多云，第2天18°C晴天...',
  })
  forecast!: string;

  @ApiProperty({
    description: '安全警示和警告',
    example: '注意：近期可能有强风，建议避免户外活动',
  })
  safetyAlerts!: string;

  @ApiProperty({
    description: '打包建议',
    example: '建议携带：轻便外套、雨具、防晒霜',
  })
  packingSuggestions!: string;

  @ApiProperty({
    description: '旅行建议',
    example: '建议选择天气晴朗的日子进行户外活动，注意保暖',
  })
  travelTips!: string;

  @ApiPropertyOptional({
    description: '平均温度范围（仅历史气候时提供）',
    example: '15-25°C',
  })
  averageTemperature?: string;

  @ApiPropertyOptional({
    description: '降雨信息（仅历史气候时提供）',
    example: '平均降雨量：50mm，降雨天数：8天',
  })
  rainfall?: string;

  @ApiPropertyOptional({
    description: '穿衣建议（仅历史气候时提供）',
    example: '建议穿着轻便外套和长裤，携带雨具',
  })
  clothingSuggestions?: string;

  @ApiPropertyOptional({
    description: '常年安全建议（仅历史气候时提供）',
    example: '该季节常有强风，注意安全',
  })
  safetyAdvice?: string;

  @ApiProperty({
    description: '信息类型',
    enum: ['realtime', 'historical'],
    example: 'realtime',
  })
  type!: 'realtime' | 'historical';
}

/**
 * 获取天气信息请求 DTO
 */
export class GetWeatherInfoRequestDto {
  @ApiPropertyOptional({
    description: '语言代码',
    example: 'zh-CN',
    enum: ['zh-CN', 'en-US', 'en'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['zh-CN', 'en-US', 'en'])
  language?: string;
}

/**
 * 获取天气信息响应 DTO
 */
export class GetWeatherInfoResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '行程ID', example: 'uuid' })
  journeyId!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  destination!: string;

  @ApiProperty({ description: '开始日期', example: '2025-12-01' })
  startDate!: string;

  @ApiProperty({ description: '结束日期', example: '2025-12-08' })
  endDate!: string;

  @ApiProperty({
    description: '天气信息',
    type: WeatherInfoDto,
  })
  weatherInfo!: WeatherInfoDto;

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache!: boolean;

  @ApiProperty({ description: '生成时间', example: '2025-12-01T12:00:00Z' })
  generatedAt!: string;
}

/**
 * 路线优化活动 DTO（用于验证）
 */
export class OptimizeRouteActivityDto {
  @ApiPropertyOptional({ description: '活动ID', example: 'activity-1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '活动标题', example: '琉森湖游船' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: '活动坐标',
    example: { lat: 47.0502, lng: 8.3093 },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => OptimizeRouteLocationDto)
  location!: OptimizeRouteLocationDto;

  @ApiPropertyOptional({
    description: '活动类型',
    example: 'attraction',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '活动时间', example: '09:00' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: '活动时长（分钟）', example: 120 })
  @IsOptional()
  @IsNumber()
  duration?: number;
}

/**
 * 路线优化位置坐标 DTO
 */
export class OptimizeRouteLocationDto {
  @ApiProperty({ description: '纬度', example: 47.0502 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: '经度', example: 8.3093 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

/**
 * 路线优化请求 DTO
 */
export class OptimizeRouteRequestDto {
  @ApiProperty({
    description: '活动列表（必须包含 location 坐标）',
    type: [OptimizeRouteActivityDto],
    example: [
      {
        id: 'activity-1',
        title: '琉森湖游船',
        location: { lat: 47.0502, lng: 8.3093 },
        type: 'attraction',
        time: '09:00',
        duration: 120,
      },
      {
        id: 'activity-2',
        title: '铁力士峰',
        location: { lat: 46.7704, lng: 8.4050 },
        type: 'attraction',
        time: '14:00',
        duration: 180,
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: '活动列表至少需要1个活动' })
  @ValidateNested({ each: true })
  @Type(() => OptimizeRouteActivityDto)
  activities!: OptimizeRouteActivityDto[];

  @ApiPropertyOptional({
    description: '交通方式',
    enum: ['driving', 'walking', 'cycling'],
    default: 'driving',
  })
  @IsOptional()
  @IsEnum(['driving', 'walking', 'cycling'])
  profile?: 'driving' | 'walking' | 'cycling';

  @ApiPropertyOptional({
    description: '是否回到起点（往返路线）',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  roundtrip?: boolean;

  @ApiPropertyOptional({
    description: '固定起点',
    enum: ['first', 'any'],
    default: 'first',
  })
  @IsOptional()
  @IsEnum(['first', 'any'])
  source?: 'first' | 'any';

  @ApiPropertyOptional({
    description: '固定终点',
    enum: ['last', 'any'],
    default: 'any',
  })
  @IsOptional()
  @IsEnum(['last', 'any'])
  destination?: 'last' | 'any';
}

/**
 * 路线优化响应 DTO
 */
export class OptimizeRouteResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '优化后的活动列表（按最优路线排序）',
    type: [Object],
  })
  activities!: Array<{
    id?: string;
    title: string;
    location: { lat: number; lng: number };
    type?: string;
    time?: string;
    duration?: number;
    [key: string]: unknown;
  }>;

  @ApiProperty({
    description: '总距离（米）',
    example: 12500,
  })
  totalDistance!: number;

  @ApiProperty({
    description: '总时长（秒）',
    example: 1800,
  })
  totalDuration!: number;

  @ApiPropertyOptional({
    description: '路线几何形状（GeoJSON LineString）',
  })
  routeGeometry?: {
    coordinates: [number, number][];
    type: string;
  };

  @ApiPropertyOptional({
    description: '路线分段信息',
    type: [Object],
  })
  legs?: Array<{
    distance: number; // 米
    duration: number; // 秒
    from: number; // 起点索引
    to: number; // 终点索引
  }>;

  @ApiProperty({
    description: '天气信息',
    type: WeatherInfoDto,
  })
  weatherInfo!: WeatherInfoDto;

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache!: boolean;

  @ApiProperty({ description: '生成时间', example: '2025-12-01T12:00:00Z' })
  generatedAt!: string;
}

