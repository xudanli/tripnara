import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class GeocodeLookupDto {
  @ApiProperty({ description: 'User search text to geocode.' })
  @IsString()
  @MinLength(2)
  query!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return.',
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(10)
  limit?: number;

  @ApiPropertyOptional({ description: 'Preferred language code for results.' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class GeocodeFeatureDto {
  @ApiProperty({ description: 'Primary name of the location.' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Canonical formatted name for UI display.',
  })
  @IsOptional()
  @IsString()
  canonicalName?: string;

  @ApiProperty({ description: 'Latitude of the feature.' })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ description: 'Longitude of the feature.' })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ description: 'Country or region code.' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Feature type returned by the provider.',
  })
  @IsOptional()
  @IsString()
  placeType?: string;
}

export class GeocodeResponseDto {
  @ApiProperty({
    description: 'Matched features.',
    type: () => [GeocodeFeatureDto],
  })
  @IsArray()
  @Type(() => GeocodeFeatureDto)
  features!: GeocodeFeatureDto[];
}

export class CoordinateDto {
  @ApiProperty({ description: 'Latitude component.' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Longitude component.' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class TransportRequestDto {
  @ApiProperty({ description: 'Origin coordinate.' })
  @Type(() => CoordinateDto)
  origin!: CoordinateDto;

  @ApiProperty({ description: 'Destination coordinate.' })
  @Type(() => CoordinateDto)
  destination!: CoordinateDto;

  @ApiPropertyOptional({
    description: 'Preferred mode (car, transit, walking, etc.).',
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description: 'Desired departure timestamp (ISO string).',
  })
  @IsOptional()
  @IsDateString()
  departureTime?: string;
}

export class TransportOptionDetailDto {
  @ApiProperty({ description: 'Transport mode label.' })
  @IsString()
  mode!: string;

  @ApiProperty({ description: 'Estimated duration in minutes.' })
  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @ApiPropertyOptional({ description: 'Estimated distance in kilometers.' })
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @ApiPropertyOptional({
    description: 'Estimated price in the configured currency.',
  })
  @IsOptional()
  @IsNumber()
  priceEstimate?: number;
}

export class TransportResponseDto {
  @ApiProperty({
    description: 'Ranked transport options.',
    type: () => [TransportOptionDetailDto],
  })
  @IsArray()
  @Type(() => TransportOptionDetailDto)
  options!: TransportOptionDetailDto[];
}

export class EventsRequestDto {
  @ApiProperty({
    description: 'Canonical destination name used to fetch events.',
  })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({
    description: 'ISO date filter for events starting after this time.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'ISO date filter for events ending before this time.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Optional category filter (music, food, etc.).',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

export class FestivalEventDto {
  @ApiProperty({ description: 'Event identifier from the upstream provider.' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Event display name.' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Start date/time in ISO format.' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'End date/time in ISO format.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Event landing page URL.' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Venue or location metadata.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  venue?: Record<string, unknown>;
}

export class EventsResponseDto {
  @ApiProperty({
    description: 'Festival or event listings.',
    type: () => [FestivalEventDto],
  })
  @IsArray()
  @Type(() => FestivalEventDto)
  events!: FestivalEventDto[];
}

export class ReverseGeocodeQueryDto {
  @ApiProperty({
    description: '经度（longitude）',
    example: 8.4050,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({
    description: '纬度（latitude）',
    example: 46.7704,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({
    description: '首选语言代码',
    example: 'zh-CN',
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: '返回结果的数量限制',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(5)
  limit?: number;
}

export class ReverseGeocodeFeatureDto {
  @ApiProperty({ description: '地点名称', example: 'Engelberg, Switzerland' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '完整地址', example: 'Engelberg, Obwalden, Switzerland' })
  @IsString()
  fullAddress!: string;

  @ApiPropertyOptional({ description: '国家', example: 'Switzerland' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '国家代码', example: 'CH' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: '省/州', example: 'Obwalden' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '省/州代码', example: 'OW' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ description: '城市', example: 'Engelberg' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '地区类型', example: 'place' })
  @IsOptional()
  @IsString()
  placeType?: string;

  @ApiProperty({ description: '纬度', example: 46.7704 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ description: '经度', example: 8.4050 })
  @IsNumber()
  longitude!: number;
}

export class ReverseGeocodeResponseDto {
  @ApiProperty({
    description: '反向地理编码结果',
    type: ReverseGeocodeFeatureDto,
  })
  @Type(() => ReverseGeocodeFeatureDto)
  data!: ReverseGeocodeFeatureDto;
}

export class HighAltitudeQueryDto {
  @ApiProperty({ description: 'Name of the destination to check.' })
  @IsString()
  name!: string;
}

export class HighAltitudeResponseDto {
  @ApiProperty({ description: 'Destination name evaluated.' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Whether the destination exceeds altitude thresholds.',
  })
  @IsBoolean()
  isHighAltitude!: boolean;

  @ApiPropertyOptional({
    description: 'Altitude band classification (mid/high/very_high).',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Reference notes explaining the classification.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
