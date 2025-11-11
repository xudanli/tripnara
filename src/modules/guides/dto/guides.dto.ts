import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GuideSearchRequestDto {
  @ApiProperty({ description: 'Search text used to retrieve travel guides.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  query!: string;

  @ApiPropertyOptional({
    description: 'Preferred language code for returned guides.',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Source filter (e.g., google, official, rss).',
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class GuideResultDto {
  @ApiProperty({ description: 'Title of the guide result.' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'URL pointing to the guide.' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({
    description: 'Source identifier (Google, RSS, etc.).',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Brief snippet or summary of the guide.',
  })
  @IsOptional()
  @IsString()
  snippet?: string;
}

export class GuideSearchResponseDto {
  @ApiProperty({
    description: 'List of guide results.',
    type: () => [GuideResultDto],
  })
  @IsArray()
  @Type(() => GuideResultDto)
  results!: GuideResultDto[];
}

export class GuideSourceMetadataDto {
  @ApiProperty({ description: 'Unique identifier for the source.' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Display name for the source.' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Generic description for the source.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata for the source.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class GuideSourcesResponseDto {
  @ApiProperty({
    description: 'Configured guide sources.',
    type: () => [GuideSourceMetadataDto],
  })
  @IsArray()
  @Type(() => GuideSourceMetadataDto)
  sources!: GuideSourceMetadataDto[];
}
