import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatesDto {
  @ApiProperty({ description: '纬度', example: 46.7704 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: '经度', example: 8.4050 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ description: '区域', example: '市中心区域' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class GenerateLocationRequestDto {
  @ApiProperty({ description: '活动名称', example: '铁力士峰云端漫步' })
  @IsString()
  activityName!: string;

  @ApiProperty({ description: '目的地', example: '瑞士琉森' })
  @IsString()
  destination!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
    example: 'attraction',
  })
  @IsString()
  activityType!:
    | 'attraction'
    | 'meal'
    | 'hotel'
    | 'shopping'
    | 'transport'
    | 'ocean';

  @ApiProperty({ description: '坐标信息', type: CoordinatesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates!: CoordinatesDto;
}

export class LocationInfoDto {
  @ApiProperty({ description: '中文名称', example: '铁力士峰云端漫步' })
  chineseName!: string;

  @ApiProperty({ description: '当地语言名称', example: 'Titlis Cliff Walk' })
  localName!: string;

  @ApiProperty({
    description: '中文地址',
    example: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
  })
  chineseAddress!: string;

  @ApiProperty({
    description: '当地语言地址',
    example: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
  })
  localAddress!: string;

  @ApiProperty({
    description: '交通信息',
    example: '从琉森乘火车约45分钟至Engelberg站...',
  })
  transportInfo!: string;

  @ApiProperty({
    description: '开放时间',
    example: '全年开放，夏季8:30-17:30，冬季8:30-16:30',
  })
  openingHours!: string;

  @ApiProperty({
    description: '门票价格',
    example: 'Cliff Walk约CHF 15（约¥120）...',
  })
  ticketPrice!: string;

  @ApiProperty({
    description: '游览建议',
    example: '最佳游览时间：上午10点前避开人群...',
  })
  visitTips!: string;

  @ApiPropertyOptional({
    description: '周边推荐',
    example: '冰川公园、Ice Flyer缆车、旋转缆车体验',
  })
  nearbyAttractions?: string;

  @ApiPropertyOptional({
    description: '联系方式',
    example: '请查询官网或当地信息中心',
  })
  contactInfo?: string;

  @ApiProperty({ description: '景点类型', example: '景点' })
  category!: string;

  @ApiProperty({ description: '评分', example: 4.8, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ description: '建议游览时长', example: '2-3小时' })
  visitDuration!: string;

  @ApiProperty({ description: '最佳游览时间', example: '上午10点前，晴朗天气' })
  bestTimeToVisit!: string;

  @ApiPropertyOptional({
    description: '无障碍设施信息',
    example: '请确认无障碍设施',
  })
  accessibility?: string;

  @ApiPropertyOptional({
    description: '穿搭建议',
    example: '建议穿着舒适的步行鞋和轻便外套，山区天气变化快，建议携带雨具',
  })
  dressingTips?: string;

  @ApiPropertyOptional({
    description: '当地文化提示和特殊注意事项',
    example: '进入宗教场所需脱帽，保持安静；当地习惯给小费，建议准备零钱；注意当地禁忌和习俗',
  })
  culturalTips?: string;

  @ApiPropertyOptional({
    description: '是否需要提前预订',
    example: '建议提前预订，可通过官网或电话预约，旺季需提前1-2周预订',
  })
  bookingInfo?: string;
}

export class GenerateLocationResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '位置信息', type: LocationInfoDto })
  data!: LocationInfoDto;
}

export class BatchActivityDto {
  @ApiProperty({ description: '活动名称', example: '活动1' })
  @IsString()
  activityName!: string;

  @ApiProperty({ description: '目的地', example: '瑞士' })
  @IsString()
  destination!: string;

  @ApiProperty({
    description: '活动类型',
    enum: ['attraction', 'meal', 'hotel', 'shopping', 'transport', 'ocean'],
  })
  @IsString()
  activityType!:
    | 'attraction'
    | 'meal'
    | 'hotel'
    | 'shopping'
    | 'transport'
    | 'ocean';

  @ApiProperty({ description: '坐标信息', type: CoordinatesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates!: CoordinatesDto;
}

export class GenerateLocationBatchRequestDto {
  @ApiProperty({
    description: '活动列表',
    type: [BatchActivityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchActivityDto)
  activities!: BatchActivityDto[];
}

export class BatchLocationResultDto {
  @ApiProperty({ description: '活动名称', example: '活动1' })
  activityName!: string;

  @ApiProperty({ description: '位置信息', type: LocationInfoDto })
  locationInfo!: LocationInfoDto;
}

export class GenerateLocationBatchResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({
    description: '结果列表',
    type: [BatchLocationResultDto],
  })
  data!: BatchLocationResultDto[];
}

