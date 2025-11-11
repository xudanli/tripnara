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
