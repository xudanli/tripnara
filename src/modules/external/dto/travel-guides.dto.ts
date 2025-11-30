import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TravelGuideSearchQueryDto {
  @ApiProperty({ description: '目的地名称，例如 "日本"、"Tokyo"' })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({
    description: '返回数量上限',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: '内容语言，默认 zh-CN',
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  language?: string = 'zh-CN';
}

export class TravelGuideItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  publishedAt?: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiPropertyOptional({ nullable: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  author?: string | null;

  @ApiPropertyOptional({ nullable: true })
  readTime?: number | null;
}

export class TravelGuideResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: [TravelGuideItemDto] })
  data!: TravelGuideItemDto[];

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, nullable: true })
  error!: string | null;
}

export class PlatformConfigDto {
  @ApiProperty({ description: '平台名称，例如 "马蜂窝"、"携程"' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '平台域名，例如 "mafengwo.cn"' })
  @IsString()
  domain!: string;

  @ApiPropertyOptional({
    description: '搜索URL模板（可选）',
    example: 'https://www.mafengwo.cn/search/q.php?q=',
  })
  @IsOptional()
  @IsString()
  searchUrl?: string;
}

export class PlatformSearchRequestDto {
  @ApiProperty({ description: '目的地名称，例如 "日本"、"Tokyo"' })
  @IsString()
  destination!: string;

  @ApiProperty({
    description: '要搜索的平台列表',
    type: [PlatformConfigDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformConfigDto)
  platforms!: PlatformConfigDto[];

  @ApiPropertyOptional({
    description: '返回数量上限',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

