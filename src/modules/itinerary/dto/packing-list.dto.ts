import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

/**
 * 打包清单项 DTO
 */
export class PackingListItemDto {
  @ApiProperty({
    description: '物品名称',
    example: '防滑冰爪',
  })
  item!: string;

  @ApiProperty({
    description: '推荐理由，需明确关联具体活动或天气',
    example: '针对第三天攀登冰川活动，且当地近期有雨雪，防止滑倒',
  })
  reason!: string;
}

/**
 * 获取智能打包清单请求 DTO
 */
export class GetPackingListRequestDto {
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
 * 获取智能打包清单响应 DTO
 */
export class GetPackingListResponseDto {
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
    description: '打包清单（5-10项）',
    type: [PackingListItemDto],
  })
  packingList!: PackingListItemDto[];

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache!: boolean;

  @ApiProperty({ description: '生成时间', example: '2025-12-01T12:00:00Z' })
  generatedAt!: string;
}

