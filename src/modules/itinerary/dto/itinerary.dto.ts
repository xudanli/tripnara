import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
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
  time!: string;

  @ApiProperty({ description: '活动标题', example: '铁力士峰云端漫步' })
  title!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport'],
    example: 'attraction',
  })
  type!: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport';

  @ApiProperty({ description: '持续时间（分钟）', example: 120 })
  duration!: number;

  @ApiProperty({
    description: '位置坐标',
    example: { lat: 46.7704, lng: 8.4050 },
  })
  location!: { lat: number; lng: number };

  @ApiProperty({ description: '活动描述和建议', example: '详细的游览建议和体验描述' })
  notes!: string;

  @ApiProperty({ description: '预估费用', example: 400 })
  cost!: number;
}

export class ItineraryDayDto {
  @ApiProperty({ description: '第几天', example: 1 })
  day!: number;

  @ApiProperty({ description: '日期', example: '2024-06-01' })
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
  days!: ItineraryDayDto[];

  @ApiProperty({ description: '总费用', example: 8000 })
  totalCost!: number;

  @ApiProperty({ description: '行程摘要', example: '行程摘要' })
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
  @IsNumber()
  @Min(1)
  @Max(30)
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

