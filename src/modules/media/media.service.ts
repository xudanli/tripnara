import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import Redis from 'ioredis';
import { MediaAssetEntity } from '../persistence/entities/reference.entity';
import {
  SearchImageRequestDto,
  SearchImageResponseDto,
  ImageItemDto,
  SearchVideoRequestDto,
  SearchVideoResponseDto,
  VideoItemDto,
  UploadMediaRequestDto,
  UploadMediaResponseDto,
  GetMediaResponseDto,
  MediaItemDto,
} from './dto/media.dto';

// Unsplash API 响应接口
interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  description: string | null;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// Pexels API 响应接口
interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
  }>;
  user: {
    id: number;
    name: string;
    url: string;
  };
}

interface PexelsVideoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly unsplashApiKey?: string;
  private readonly unsplashApiUrl = 'https://api.unsplash.com';
  private readonly pexelsApiKey?: string;
  private readonly pexelsApiUrl = 'https://api.pexels.com/v1';
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly mediaCacheTtlSeconds = 24 * 60 * 60; // 24小时（图片资源缓存）

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetEntity>,
  ) {
    this.unsplashApiKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY');
    this.pexelsApiKey = this.configService.get<string>('PEXELS_API_KEY');
    
    // 仅在开发环境显示配置状态
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'development') {
      if (this.unsplashApiKey) {
        this.logger.debug(`Unsplash API key 已配置`);
      } else {
        this.logger.debug('Unsplash API key 未配置（可选）- 如需使用图片搜索功能，请设置环境变量 UNSPLASH_ACCESS_KEY');
      }
      
      if (this.pexelsApiKey) {
        this.logger.debug(`Pexels API key 已配置`);
      } else {
        this.logger.debug('Pexels API key 未配置（可选）- 如需使用图片/视频搜索功能，请设置环境变量 PEXELS_API_KEY');
      }
    }

    // 初始化 Redis 客户端（用于媒体资源缓存）
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        const password = url.password || undefined;
        const host = url.hostname;
        const port = parseInt(url.port || '6379', 10);

        this.redisClient = new Redis({
          host,
          port,
          password,
          ...(url.username && url.username !== 'default'
            ? { username: url.username }
            : {}),
          keepAlive: 1000,
          connectTimeout: 10000,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });

        this.redisClient.on('error', (error) => {
          this.logger.warn('Redis connection error in MediaService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for media cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for MediaService');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for MediaService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, media cache disabled');
    }
  }

  /**
   * 搜索图片
   * 🛡️ 优化：添加 Redis 缓存，防止 Unsplash 限流
   */
  async searchImage(dto: SearchImageRequestDto): Promise<SearchImageResponseDto> {
    const limit = dto.limit || 10;
    const provider = dto.provider || 'all';
    
    // 🛡️ 优先从 Redis 缓存读取
    const cacheKey = `media:images:${dto.query.toLowerCase()}:${provider}:${limit}:${dto.orientation || 'all'}`;
    
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.debug(`Media cache hit for: ${dto.query}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to read media from cache:', error);
        // 缓存读取失败，继续调用 API
      }
    }

    const images: ImageItemDto[] = [];

    try {
      // 搜索 Unsplash
      if (provider === 'unsplash' || provider === 'all') {
        if (this.unsplashApiKey) {
          const unsplashImages = await this.searchUnsplash(
            dto.query,
            limit,
            dto.orientation,
          );
          images.push(...unsplashImages);
        } else {
          this.logger.debug('Unsplash API key 未配置，跳过 Unsplash 搜索');
        }
      }

      // 搜索 Pexels
      if (provider === 'pexels' || provider === 'all') {
        if (this.pexelsApiKey) {
          const pexelsImages = await this.searchPexels(dto.query, limit);
          images.push(...pexelsImages);
        } else {
          this.logger.debug('Pexels API key 未配置，跳过 Pexels 搜索');
        }
      }

      // 如果都没有配置，返回空结果
      if (images.length === 0) {
        this.logger.debug('图片搜索 API 未配置，返回空结果。如需使用此功能，请配置 UNSPLASH_ACCESS_KEY 或 PEXELS_API_KEY');
        return {
          data: [],
          total: 0,
        };
      }

      // 限制返回数量
      const limitedImages = images.slice(0, limit);

      const result = {
        data: limitedImages,
        total: images.length,
      };

      // 🛡️ 写入缓存（异步，不阻塞）
      if (this.useRedisCache && this.redisClient) {
        this.redisClient.setex(
          cacheKey,
          this.mediaCacheTtlSeconds,
          JSON.stringify(result),
        ).catch((error) => {
          this.logger.warn('Failed to cache media result:', error);
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`图片搜索失败: ${error}`);
      throw new HttpException(
        '图片搜索失败',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 搜索视频
   * 🛡️ 优化：添加 Redis 缓存
   */
  async searchVideo(dto: SearchVideoRequestDto): Promise<SearchVideoResponseDto> {
    const limit = dto.limit || 10;
    const provider = dto.provider || 'all';

    // 🛡️ 优先从 Redis 缓存读取
    const cacheKey = `media:videos:${dto.query.toLowerCase()}:${provider}:${limit}`;
    
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.debug(`Video cache hit for: ${dto.query}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to read video from cache:', error);
        // 缓存读取失败，继续调用 API
      }
    }

    try {
      if (provider === 'pexels' || provider === 'all') {
        if (this.pexelsApiKey) {
          const videos = await this.searchPexelsVideo(dto.query, limit);
          const result = {
            data: videos,
            total: videos.length,
          };

          // 🛡️ 写入缓存（异步，不阻塞）
          if (this.useRedisCache && this.redisClient) {
            this.redisClient.setex(
              cacheKey,
              this.mediaCacheTtlSeconds,
              JSON.stringify(result),
            ).catch((error) => {
              this.logger.warn('Failed to cache video result:', error);
            });
          }

          return result;
        } else {
          this.logger.debug('Pexels API key 未配置，无法搜索视频。如需使用此功能，请设置环境变量 PEXELS_API_KEY');
        }
      }

      return {
        data: [],
        total: 0,
      };
    } catch (error) {
      this.logger.error(`视频搜索失败: ${error}`);
      throw new HttpException(
        '视频搜索失败',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 上传媒体（保存媒体URL到数据库）
   */
  async uploadMedia(
    dto: UploadMediaRequestDto,
    userId?: string,
  ): Promise<UploadMediaResponseDto> {
    const media = this.mediaAssetRepository.create({
      url: dto.url,
      mediaType: dto.mediaType,
      metadata: dto.metadata || {},
    });

    const saved = await this.mediaAssetRepository.save(media);

    return {
      success: true,
      data: {
        id: saved.id,
        url: saved.url,
        mediaType: saved.mediaType,
        metadata: saved.metadata,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
      message: '上传成功',
    };
  }

  /**
   * 获取媒体详情
   */
  async getMediaById(mediaId: string): Promise<GetMediaResponseDto> {
    const media = await this.mediaAssetRepository.findOne({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`媒体不存在: ${mediaId}`);
    }

    return {
      success: true,
      data: {
        id: media.id,
        url: media.url,
        mediaType: media.mediaType,
        metadata: media.metadata,
        createdAt: media.createdAt.toISOString(),
        updatedAt: media.updatedAt.toISOString(),
      },
    };
  }

  /**
   * 搜索 Unsplash 图片
   */
  private async searchUnsplash(
    query: string,
    limit: number,
    orientation?: string,
  ): Promise<ImageItemDto[]> {
    const url = `${this.unsplashApiUrl}/search/photos`;
    const response = await firstValueFrom(
      this.httpService.get<UnsplashSearchResponse>(url, {
        params: {
          query,
          per_page: limit,
          orientation,
        },
        headers: {
          Authorization: `Client-ID ${this.unsplashApiKey}`,
        },
      }),
    );

    return response.data.results.map((photo) => ({
      id: `unsplash-${photo.id}`,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.thumb,
      width: photo.width,
      height: photo.height,
      description: photo.description || undefined,
      photographer: photo.user.name,
      sourceUrl: photo.links.html,
      provider: 'unsplash' as const,
    }));
  }

  /**
   * 搜索 Pexels 图片
   */
  private async searchPexels(
    query: string,
    limit: number,
  ): Promise<ImageItemDto[]> {
    const url = `${this.pexelsApiUrl}/search`;
    const response = await firstValueFrom(
      this.httpService.get<PexelsSearchResponse>(url, {
        params: {
          query,
          per_page: limit,
        },
        headers: {
          Authorization: this.pexelsApiKey,
        },
      }),
    );

    return response.data.photos.map((photo) => ({
      id: `pexels-${photo.id}`,
      url: photo.src.large,
      thumbnailUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      description: photo.alt || undefined,
      photographer: photo.photographer,
      sourceUrl: photo.url,
      provider: 'pexels' as const,
    }));
  }

  /**
   * 搜索 Pexels 视频
   */
  private async searchPexelsVideo(
    query: string,
    limit: number,
  ): Promise<VideoItemDto[]> {
    const url = `${this.pexelsApiUrl.replace('/v1', '/videos')}/search`;
    const response = await firstValueFrom(
      this.httpService.get<PexelsVideoSearchResponse>(url, {
        params: {
          query,
          per_page: limit,
        },
        headers: {
          Authorization: this.pexelsApiKey,
        },
      }),
    );

    return response.data.videos.map((video) => {
      // 选择最高质量的视频文件
      const videoFile = video.video_files
        .filter((f) => f.quality === 'hd' || f.quality === 'sd')
        .sort((a, b) => b.width - a.width)[0] || video.video_files[0];

      return {
        id: `pexels-${video.id}`,
        url: videoFile?.link || '',
        thumbnailUrl: video.image,
        width: video.width,
        height: video.height,
        duration: video.duration,
        description: undefined,
        photographer: video.user.name,
        sourceUrl: video.user.url,
        provider: 'pexels' as const,
      };
    });
  }
}

