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
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

export class ItineraryActivityDto {
  @ApiProperty({ description: '活动时间', example: '09:00' })
  @IsString()
  time!: string;

  @ApiProperty({ description: '活动标题', example: '铁力士峰云端漫步' })
  @IsString()
  title!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport'],
    example: 'attraction',
  })
  @IsString()
  type!: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport';

  @ApiProperty({ description: '持续时间（分钟）', example: 120 })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    description: '位置坐标',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  @IsObject()
  location!: { lat: number; lng: number };

  @ApiProperty({ description: '活动描述和建议', example: '详细的游览建议和体验描述' })
  @IsString()
  notes!: string;

  @ApiProperty({ description: '预估费用', example: 400 })
  @IsNumber()
  cost!: number;
}

export class ItineraryDayDto {
  @ApiProperty({ description: '第几天', example: 1 })
  @IsNumber()
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
  @IsString()
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
  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  @IsString()
  destination!: string;

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

