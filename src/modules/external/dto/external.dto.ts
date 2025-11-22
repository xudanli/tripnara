import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsNumber, IsOptional } from 'class-validator';

export class EventSearchQueryDto {
  @ApiProperty({ description: '地点，例如 "深圳"', example: '深圳' })
  @IsString()
  @MinLength(1)
  location!: string;
}

export class LocationSearchQueryDto {
  @ApiProperty({ description: '目的地关键字', example: '拉萨' })
  @IsString()
  @MinLength(1)
  query!: string;
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

