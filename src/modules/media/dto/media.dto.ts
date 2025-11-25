import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 搜索图片请求 DTO
 */
export class SearchImageRequestDto {
  @ApiProperty({ description: '搜索关键词（地点/关键词）', example: '巴黎埃菲尔铁塔' })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiPropertyOptional({
    description: '图片提供商',
    enum: ['unsplash', 'pexels', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['unsplash', 'pexels', 'all'])
  provider?: 'unsplash' | 'pexels' | 'all';

  @ApiPropertyOptional({ description: '返回数量', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  limit?: number;

  @ApiPropertyOptional({ description: '图片方向', enum: ['landscape', 'portrait', 'squarish'] })
  @IsOptional()
  @IsEnum(['landscape', 'portrait', 'squarish'])
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

/**
 * 图片项 DTO
 */
export class ImageItemDto {
  @ApiProperty({ description: '图片ID', example: 'image-123' })
  id!: string;

  @ApiProperty({ description: '图片URL', example: 'https://example.com/image.jpg' })
  url!: string;

  @ApiPropertyOptional({ description: '缩略图URL', example: 'https://example.com/thumb.jpg' })
  thumbnailUrl?: string;

  @ApiProperty({ description: '宽度', example: 1920 })
  width!: number;

  @ApiProperty({ description: '高度', example: 1080 })
  height!: number;

  @ApiPropertyOptional({ description: '描述', example: '埃菲尔铁塔夜景' })
  description?: string;

  @ApiPropertyOptional({ description: '摄影师', example: 'John Doe' })
  photographer?: string;

  @ApiPropertyOptional({ description: '来源链接', example: 'https://unsplash.com/photos/xxx' })
  sourceUrl?: string;

  @ApiProperty({ description: '提供商', example: 'unsplash' })
  provider!: 'unsplash' | 'pexels';
}

/**
 * 搜索图片响应 DTO
 */
export class SearchImageResponseDto {
  @ApiProperty({ description: '图片列表', type: [ImageItemDto] })
  data!: ImageItemDto[];

  @ApiProperty({ description: '总数量', example: 50 })
  total!: number;
}

/**
 * 搜索视频请求 DTO
 */
export class SearchVideoRequestDto {
  @ApiProperty({ description: '搜索关键词', example: '巴黎旅行' })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiPropertyOptional({
    description: '视频提供商',
    enum: ['pexels', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['pexels', 'all'])
  provider?: 'pexels' | 'all';

  @ApiPropertyOptional({ description: '返回数量', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  limit?: number;
}

/**
 * 视频项 DTO
 */
export class VideoItemDto {
  @ApiProperty({ description: '视频ID', example: 'video-123' })
  id!: string;

  @ApiProperty({ description: '视频URL', example: 'https://example.com/video.mp4' })
  url!: string;

  @ApiPropertyOptional({ description: '缩略图URL', example: 'https://example.com/thumb.jpg' })
  thumbnailUrl?: string;

  @ApiProperty({ description: '宽度', example: 1920 })
  width!: number;

  @ApiProperty({ description: '高度', example: 1080 })
  height!: number;

  @ApiProperty({ description: '时长（秒）', example: 30 })
  duration!: number;

  @ApiPropertyOptional({ description: '描述', example: '巴黎旅行视频' })
  description?: string;

  @ApiPropertyOptional({ description: '摄影师', example: 'John Doe' })
  photographer?: string;

  @ApiPropertyOptional({ description: '来源链接', example: 'https://pexels.com/videos/xxx' })
  sourceUrl?: string;

  @ApiProperty({ description: '提供商', example: 'pexels' })
  provider!: 'pexels';
}

/**
 * 搜索视频响应 DTO
 */
export class SearchVideoResponseDto {
  @ApiProperty({ description: '视频列表', type: [VideoItemDto] })
  data!: VideoItemDto[];

  @ApiProperty({ description: '总数量', example: 20 })
  total!: number;
}

/**
 * 上传媒体请求 DTO
 */
export class UploadMediaRequestDto {
  @ApiProperty({ description: '媒体URL', example: 'https://example.com/image.jpg' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: '媒体类型', enum: ['image', 'video'] })
  @IsOptional()
  @IsEnum(['image', 'video'])
  mediaType?: 'image' | 'video';

  @ApiPropertyOptional({ description: '元数据', example: { title: '我的图片', description: '描述' } })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * 媒体项 DTO
 */
export class MediaItemDto {
  @ApiProperty({ description: '媒体ID', example: 'media-id-123' })
  id!: string;

  @ApiProperty({ description: '媒体URL', example: 'https://example.com/image.jpg' })
  url!: string;

  @ApiPropertyOptional({ description: '媒体类型', example: 'image' })
  mediaType?: string;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间', example: '2025-01-15T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: string;
}

/**
 * 上传媒体响应 DTO
 */
export class UploadMediaResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '媒体数据', type: MediaItemDto })
  data!: MediaItemDto;

  @ApiPropertyOptional({ description: '消息', example: '上传成功' })
  message?: string;
}

/**
 * 获取媒体详情响应 DTO
 */
export class GetMediaResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '媒体数据', type: MediaItemDto })
  data!: MediaItemDto;
}

