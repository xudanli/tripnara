import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 货币名称 DTO
 */
export class CurrencyNameDto {
  @ApiProperty({ description: '中文名称', example: '人民币' })
  @IsString()
  @MaxLength(100)
  nameZh!: string;

  @ApiProperty({ description: '英文名称', example: 'CNY' })
  @IsString()
  @MaxLength(100)
  nameEn!: string;
}

/**
 * 创建货币请求 DTO
 */
export class CreateCurrencyRequestDto {
  @ApiProperty({ description: '货币代码（ISO 4217）', example: 'CNY' })
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  code!: string;

  @ApiProperty({ description: '货币符号', example: '¥' })
  @IsString()
  @MaxLength(20)
  symbol!: string;

  @ApiProperty({ description: '中文名称', example: '人民币' })
  @IsString()
  @MaxLength(100)
  nameZh!: string;

  @ApiProperty({ description: '英文名称', example: 'CNY' })
  @IsString()
  @MaxLength(100)
  nameEn!: string;

  @ApiPropertyOptional({ description: '是否启用', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 更新货币请求 DTO
 */
export class UpdateCurrencyRequestDto {
  @ApiPropertyOptional({ description: '货币代码（ISO 4217）', example: 'CNY' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  code?: string;

  @ApiPropertyOptional({ description: '货币符号', example: '¥' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  symbol?: string;

  @ApiPropertyOptional({ description: '中文名称', example: '人民币' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameZh?: string;

  @ApiPropertyOptional({ description: '英文名称', example: 'CNY' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 货币响应 DTO
 */
export class CurrencyResponseDto {
  @ApiProperty({ description: '货币ID' })
  id!: string;

  @ApiProperty({ description: '货币代码', example: 'CNY' })
  code!: string;

  @ApiProperty({ description: '货币符号', example: '¥' })
  symbol!: string;

  @ApiProperty({ description: '中文名称', example: '人民币' })
  nameZh!: string;

  @ApiProperty({ description: '英文名称', example: 'CNY' })
  nameEn!: string;

  @ApiProperty({ description: '是否启用', example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 创建国家货币映射请求 DTO
 */
export class CreateCountryCurrencyMappingRequestDto {
  @ApiProperty({ description: '国家代码（ISO 3166-1 alpha-2）', example: 'CN' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode!: string;

  @ApiProperty({ description: '货币ID', example: 'uuid' })
  @IsUUID()
  currencyId!: string;

  @ApiPropertyOptional({
    description: '国家名称映射',
    example: { zh: ['中国', '中华人民共和国'], en: ['China', 'PRC'] },
  })
  @IsOptional()
  @IsObject()
  countryNames?: {
    zh?: string[];
    en?: string[];
  };

  @ApiPropertyOptional({ description: '是否启用', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 更新国家货币映射请求 DTO
 */
export class UpdateCountryCurrencyMappingRequestDto {
  @ApiPropertyOptional({ description: '国家代码（ISO 3166-1 alpha-2）', example: 'CN' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({ description: '货币ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({
    description: '国家名称映射',
    example: { zh: ['中国', '中华人民共和国'], en: ['China', 'PRC'] },
  })
  @IsOptional()
  @IsObject()
  countryNames?: {
    zh?: string[];
    en?: string[];
  };

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 国家货币映射响应 DTO
 */
export class CountryCurrencyMappingResponseDto {
  @ApiProperty({ description: '映射ID' })
  id!: string;

  @ApiProperty({ description: '国家代码', example: 'CN' })
  countryCode!: string;

  @ApiProperty({ description: '货币ID' })
  currencyId!: string;

  @ApiProperty({ description: '货币代码', example: 'CNY' })
  currencyCode!: string;

  @ApiPropertyOptional({
    description: '国家名称映射',
    example: { zh: ['中国'], en: ['China'] },
  })
  countryNames?: {
    zh?: string[];
    en?: string[];
  };

  @ApiProperty({ description: '是否启用', example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}

/**
 * 统一响应 DTO
 */
export class CurrencyAdminResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '数据' })
  data?: CurrencyResponseDto | CountryCurrencyMappingResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '操作成功' })
  message?: string;
}

/**
 * 列表响应 DTO
 */
export class CurrencyListResponseDto {
  @ApiProperty({ description: '货币列表', type: [CurrencyResponseDto] })
  data!: CurrencyResponseDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit!: number;
}

export class CountryCurrencyMappingListResponseDto {
  @ApiProperty({
    description: '映射列表',
    type: [CountryCurrencyMappingResponseDto],
  })
  data!: CountryCurrencyMappingResponseDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit!: number;
}

