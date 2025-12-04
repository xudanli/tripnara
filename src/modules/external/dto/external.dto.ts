import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsNumber, IsOptional } from 'class-validator';

export class LocationSearchQueryDto {
  @ApiProperty({ description: '目的地关键字', example: 'Restaurant Crystal' })
  @IsString()
  @MinLength(1)
  query!: string;

  @ApiPropertyOptional({ description: '城市名称（用于优化搜索）', example: 'Zermatt' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '国家名称（用于优化搜索）', example: 'Switzerland' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '国家代码（ISO 3166-1 alpha-2，用于坐标验证）', example: 'CH' })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class AttractionDetailsParamDto {
  @ApiProperty({ description: '景点ID（TripAdvisor location_id）', example: '123456' })
  @IsString()
  @MinLength(1)
  id!: string;
}

export class AttractionDetailsQueryDto {
  @ApiPropertyOptional({ description: '语言代码', example: 'zh-CN', default: 'zh-CN' })
  @IsString()
  lang?: string;
}

export class TicketPriceRangeDto {
  @ApiPropertyOptional({ description: '最低价格', example: 50 })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ description: '最高价格', example: 200 })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ description: '货币代码', example: 'CNY' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: '价格描述', example: '成人票 50-200 CNY' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AttractionRatingDto {
  @ApiProperty({ description: '评分（1-5）', example: 4.5, minimum: 1, maximum: 5 })
  @IsNumber()
  rating!: number;

  @ApiProperty({ description: '评论总数', example: 1234 })
  @IsNumber()
  reviewCount!: number;

  @ApiPropertyOptional({ description: '评分分布', example: { excellent: 500, very_good: 400, average: 200, poor: 100, terrible: 34 } })
  @IsOptional()
  ratingDistribution?: Record<string, number>;
}

export class TicketInfoDto {
  @ApiPropertyOptional({ description: '是否需要门票', example: true })
  @IsOptional()
  requiresTicket?: boolean;

  @ApiPropertyOptional({ description: '门票价格区间', type: TicketPriceRangeDto })
  @IsOptional()
  priceRange?: TicketPriceRangeDto;

  @ApiPropertyOptional({ description: '购票方式', example: '在线购票、现场购票' })
  @IsOptional()
  @IsString()
  purchaseMethod?: string;

  @ApiPropertyOptional({ description: '购票链接', example: 'https://tripadvisor.com/...' })
  @IsOptional()
  @IsString()
  purchaseUrl?: string;
}

export class AttractionDetailsDto {
  @ApiProperty({ description: '景点ID', example: '123456' })
  id!: string;

  @ApiProperty({ description: '景点名称', example: '铁力士峰云端漫步' })
  name!: string;

  @ApiPropertyOptional({ description: '地址', example: 'Titlis Bergstation, 6390 Engelberg, Switzerland' })
  address?: string;

  @ApiPropertyOptional({ description: '坐标', example: { lat: 46.7704, lng: 8.4050 } })
  coordinates?: { lat: number; lng: number };

  @ApiProperty({ description: '评分信息', type: AttractionRatingDto })
  rating!: AttractionRatingDto;

  @ApiPropertyOptional({ description: '门票信息', type: TicketInfoDto })
  ticketInfo?: TicketInfoDto;

  @ApiPropertyOptional({ description: '开放时间', example: '全天开放' })
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({ description: '电话', example: '+41 41 639 50 50' })
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '网站', example: 'https://titlis.ch' })
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: '描述', example: '欧洲最高的悬索桥' })
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '分类', example: '景点 - 自然景观' })
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'TripAdvisor 链接', example: 'https://tripadvisor.com/Attraction_Review...' })
  @IsString()
  tripadvisorUrl?: string;
}

export class AttractionDetailsResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '景点详情', type: AttractionDetailsDto })
  data!: AttractionDetailsDto;
}

/**
 * Travel Advisor 位置搜索结果项
 */
export class LocationSearchResultItemDto {
  @ApiProperty({ description: '结果类型', example: 'geos' })
  result_type!: string;

  @ApiProperty({
    description: '结果对象',
    example: {
      name: '拉萨',
      coordinates: { latitude: 29.65, longitude: 91.11 },
    },
  })
  result_object!: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    [key: string]: unknown;
  };
}

/**
 * Travel Advisor 位置搜索响应
 */
export class LocationSearchResponseDto {
  @ApiProperty({
    description: '响应数据',
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { 
          type: 'object',
          properties: {
            result_type: { type: 'string', example: 'geos' },
            result_object: {
              type: 'object',
              properties: {
                name: { type: 'string', example: '拉萨' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', example: 29.65 },
                    longitude: { type: 'number', example: 91.11 },
                  },
                },
              },
            },
          },
        },
        description: 'Travel Advisor 位置搜索结果列表',
      },
    },
  })
  data!: {
    data?: Array<{
      result_type: string;
      result_object: {
        name: string;
        coordinates?: {
          latitude: number;
          longitude: number;
        };
        [key: string]: unknown;
      };
    }>;
  };
}

