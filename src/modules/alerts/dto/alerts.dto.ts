import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsIn,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'expired' | 'archived';

/**
 * 创建安全通知请求 DTO
 */
export class CreateAlertRequestDto {
  @ApiProperty({ description: '通知标题', example: '冰岛火山活动预警' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: '通知内容', example: '近期冰岛火山活动频繁，请游客注意安全...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: '目的地', example: '冰岛' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destination!: string;

  @ApiPropertyOptional({ description: '国家代码（ISO 3166-1 alpha-3）', example: 'ISL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;

  @ApiProperty({
    description: '严重程度',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity!: AlertSeverity;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['active', 'expired', 'archived'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'expired', 'archived'])
  status?: AlertStatus;

  @ApiProperty({ description: '生效开始日期', example: '2025-01-15T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: '生效结束日期', example: '2025-02-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '元数据', example: { source: 'government', region: 'south' } })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 安全通知响应 DTO
 */
export class AlertDto {
  @ApiProperty({ description: '通知ID', example: 'alert-id-123' })
  id!: string;

  @ApiProperty({ description: '通知标题', example: '冰岛火山活动预警' })
  title!: string;

  @ApiProperty({ description: '通知内容', example: '近期冰岛火山活动频繁，请游客注意安全...' })
  content!: string;

  @ApiProperty({ description: '目的地', example: '冰岛' })
  destination!: string;

  @ApiPropertyOptional({ description: '国家代码', example: 'ISL' })
  countryCode?: string;

  @ApiProperty({ description: '严重程度', enum: ['low', 'medium', 'high', 'critical'] })
  severity!: AlertSeverity;

  @ApiProperty({ description: '状态', enum: ['active', 'expired', 'archived'] })
  status!: AlertStatus;

  @ApiProperty({ description: '生效开始日期', example: '2025-01-15T00:00:00.000Z' })
  startDate!: string;

  @ApiPropertyOptional({ description: '生效结束日期', example: '2025-02-15T00:00:00.000Z' })
  endDate?: string;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间', example: '2025-01-15T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: string;
}

/**
 * 创建安全通知响应 DTO
 */
export class CreateAlertResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '创建的通知数据', type: AlertDto })
  data!: AlertDto;

  @ApiPropertyOptional({ description: '消息', example: '创建成功' })
  message?: string;
}

/**
 * 获取安全通知列表查询参数 DTO
 */
export class GetAlertsQueryDto {
  @ApiPropertyOptional({ description: '目的地（模糊匹配）', example: '冰岛' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '国家代码', example: 'ISL' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: '严重程度',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['active', 'expired', 'archived'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'expired', 'archived'])
  status?: AlertStatus;

  @ApiPropertyOptional({ description: '开始日期（查询在此日期之后生效的通知）', example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（查询在此日期之前生效的通知）', example: '2025-02-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * 安全通知列表响应 DTO
 */
export class AlertListResponseDto {
  @ApiProperty({ description: '通知列表', type: [AlertDto] })
  data!: AlertDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit!: number;
}

/**
 * 更新安全通知请求 DTO（所有字段可选）
 */
export class UpdateAlertRequestDto {
  @ApiPropertyOptional({ description: '通知标题', example: '冰岛火山活动预警（已更新）' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '通知内容', example: '近期冰岛火山活动频繁，请游客注意安全...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '目的地', example: '冰岛' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional({ description: '国家代码（ISO 3166-1 alpha-3）', example: 'ISL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({
    description: '严重程度',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'critical',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['active', 'expired', 'archived'],
  })
  @IsOptional()
  @IsEnum(['active', 'expired', 'archived'])
  status?: AlertStatus;

  @ApiPropertyOptional({ description: '生效开始日期', example: '2025-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: '生效结束日期（设置为 null 表示长期有效）', 
    example: '2025-03-15T00:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ description: '元数据', example: { source: 'government', region: 'south' } })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 获取单个安全通知响应 DTO
 */
export class GetAlertResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '通知数据', type: AlertDto })
  data!: AlertDto;

  @ApiPropertyOptional({ description: '消息', example: '获取成功' })
  message?: string;
}

/**
 * 更新安全通知响应 DTO
 */
export class UpdateAlertResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '更新后的通知数据', type: AlertDto })
  data!: AlertDto;

  @ApiPropertyOptional({ description: '消息', example: '更新成功' })
  message?: string;
}

/**
 * 删除安全通知响应 DTO
 */
export class DeleteAlertResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '消息', example: '删除成功' })
  message?: string;
}

