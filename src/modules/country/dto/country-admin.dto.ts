import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 创建国家请求 DTO
 */
export class CreateCountryRequestDto {
  @ApiProperty({ description: '国家代码（ISO 3166-1 alpha-2 或 alpha-3）', example: 'CN' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  isoCode!: string;

  @ApiProperty({ description: '国家名称', example: '中国' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: '签证摘要', example: '中国护照持有者可免签前往多个国家' })
  @IsOptional()
  @IsString()
  visaSummary?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 更新国家请求 DTO
 */
export class UpdateCountryRequestDto {
  @ApiPropertyOptional({ description: '国家代码（ISO 3166-1 alpha-2 或 alpha-3）', example: 'CN' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  isoCode?: string;

  @ApiPropertyOptional({ description: '国家名称', example: '中国' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: '签证摘要' })
  @IsOptional()
  @IsString()
  visaSummary?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 国家响应 DTO
 */
export class CountryResponseDto {
  @ApiProperty({ description: '国家ID' })
  id!: string;

  @ApiProperty({ description: '国家代码', example: 'CN' })
  isoCode!: string;

  @ApiProperty({ description: '国家名称', example: '中国' })
  name!: string;

  @ApiPropertyOptional({ description: '签证摘要' })
  visaSummary?: string;

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
export class CountryAdminResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: '数据' })
  data?: CountryResponseDto;

  @ApiPropertyOptional({ description: '消息', example: '操作成功' })
  message?: string;
}

/**
 * 列表响应 DTO
 */
export class CountryListResponseDto {
  @ApiProperty({ description: '国家列表', type: [CountryResponseDto] })
  data!: CountryResponseDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit!: number;
}

/**
 * 批量创建国家请求 DTO
 */
export class BatchCreateCountryRequestDto {
  @ApiProperty({
    description: '国家列表',
    type: [CreateCountryRequestDto],
    example: [
      {
        isoCode: 'CN',
        name: '中国',
        visaSummary: '中国护照持有者可免签前往多个国家',
      },
      {
        isoCode: 'US',
        name: '美国',
        visaSummary: '需要申请签证',
      },
    ],
  })
  countries!: CreateCountryRequestDto[];
}

/**
 * 批量创建结果 DTO
 */
export class BatchCreateCountryResultDto {
  @ApiProperty({ description: '成功创建的数量', example: 10 })
  created!: number;

  @ApiProperty({ description: '跳过的数量（已存在）', example: 2 })
  skipped!: number;

  @ApiProperty({ description: '失败的数量', example: 1 })
  failed!: number;

  @ApiProperty({
    description: '失败详情',
    type: [Object],
    example: [{ isoCode: 'XX', error: '国家代码格式错误' }],
  })
  errors!: Array<{ isoCode: string; error: string }>;

  @ApiProperty({
    description: '创建成功的国家列表',
    type: [CountryResponseDto],
  })
  data!: CountryResponseDto[];
}

/**
 * 批量创建响应 DTO
 */
export class BatchCreateCountryResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '批量创建结果', type: BatchCreateCountryResultDto })
  data!: BatchCreateCountryResultDto;

  @ApiPropertyOptional({ description: '消息', example: '批量导入完成' })
  message?: string;
}

