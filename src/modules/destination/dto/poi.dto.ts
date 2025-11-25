import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PoiSearchRequestDto {
  @ApiProperty({ description: '搜索关键词', example: '博物馆' })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiPropertyOptional({ description: '目的地名称', example: '巴黎' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: '纬度', example: 48.8566 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: '经度', example: 2.3522 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'POI 类型',
    enum: ['attraction', 'restaurant', 'hotel', 'shopping', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['attraction', 'restaurant', 'hotel', 'shopping', 'all'])
  type?: 'attraction' | 'restaurant' | 'hotel' | 'shopping' | 'all';

  @ApiPropertyOptional({ description: '返回数量限制', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;
}

export class PoiItemDto {
  @ApiProperty({ description: 'POI ID', example: 'poi-123' })
  id!: string;

  @ApiProperty({ description: '名称', example: '卢浮宫' })
  name!: string;

  @ApiPropertyOptional({ description: '地址', example: 'Rue de Rivoli, 75001 Paris' })
  address?: string;

  @ApiProperty({ description: '纬度', example: 48.8606 })
  latitude!: number;

  @ApiProperty({ description: '经度', example: 2.3376 })
  longitude!: number;

  @ApiPropertyOptional({ description: '类型', example: 'attraction' })
  type?: string;

  @ApiPropertyOptional({ description: '评分', example: 4.5 })
  rating?: number;

  @ApiPropertyOptional({ description: '图片URL', example: 'https://example.com/image.jpg' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: '描述', example: '世界著名的艺术博物馆' })
  description?: string;
}

export class PoiSearchResponseDto {
  @ApiProperty({ description: 'POI 列表', type: [PoiItemDto] })
  data!: PoiItemDto[];

  @ApiProperty({ description: '总数量', example: 50 })
  total!: number;
}

