import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import {
  GeocodeLookupDto,
  GeocodeResponseDto,
  ReverseGeocodeQueryDto,
  ReverseGeocodeResponseDto,
} from '../dto/destination.dto';

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  properties?: Record<string, unknown>;
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly geocodeCacheTtlSeconds = 30 * 24 * 60 * 60; // 30天（地理编码数据长期不变）

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('MAPBOX_BASE_URL') ??
      'https://api.mapbox.com';
    this.accessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');

    // 初始化 Redis 客户端（用于地理编码缓存）
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
          this.logger.warn('Redis connection error in GeocodeService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for geocode cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for GeocodeService');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for GeocodeService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, geocode cache disabled');
    }
  }

  async lookup(dto: GeocodeLookupDto): Promise<GeocodeResponseDto> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    // 💰 优化：优先从 Redis 缓存读取
    const lang = dto.language || 'zh-CN';
    const cacheKey = `geo:search:${dto.query.toLowerCase()}:${lang}`;
    
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.debug(`Geocode cache hit for: ${dto.query}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to read geocode from cache:', error);
        // 缓存读取失败，继续调用 API
      }
    }

    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(dto.query)}.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxGeocodeResponse>(url, {
          params: {
            access_token: this.accessToken,
            limit: dto.limit ?? 5,
            language: dto.language,
          },
        }),
      );

      const features = (response.data.features ?? []).map((feature) => ({
        name: feature.place_name,
        canonicalName: feature.place_name,
        latitude: feature.center[1],
        longitude: feature.center[0],
        countryCode: feature.context?.find((c) => c.id.startsWith('country'))
          ?.text,
        placeType: feature.id.split('.')[0],
      }));

      const result = { features };

      // 💰 写入缓存（异步，不阻塞）
      if (this.useRedisCache && this.redisClient) {
        this.redisClient.setex(
          cacheKey,
          this.geocodeCacheTtlSeconds,
          JSON.stringify(result),
        ).catch((error) => {
          this.logger.warn('Failed to cache geocode result:', error);
        });
      }

      return result;
    } catch (error) {
      this.handleError('geocode', error);
      throw new Error('调用地理编码服务失败');
    }
  }

  async reverseGeocode(
    dto: ReverseGeocodeQueryDto,
  ): Promise<ReverseGeocodeResponseDto> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    // 💰 优化：优先从 Redis 缓存读取（反向地理编码也缓存）
    const lang = dto.language || 'zh-CN';
    const cacheKey = `geo:reverse:${dto.lng.toFixed(6)},${dto.lat.toFixed(6)}:${lang}`;
    
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          this.logger.debug(`Reverse geocode cache hit for: ${dto.lng},${dto.lat}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to read reverse geocode from cache:', error);
        // 缓存读取失败，继续调用 API
      }
    }

    // Mapbox 反向地理编码格式：{lng},{lat}.json
    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${dto.lng},${dto.lat}.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxGeocodeResponse>(url, {
          params: {
            access_token: this.accessToken,
            limit: dto.limit ?? 1,
            language: dto.language ?? 'zh-CN',
            types: 'country,region,place,locality', // 限制返回类型
          },
        }),
      );

      const features = response.data.features ?? [];
      if (features.length === 0) {
        throw new Error('未找到匹配的地点信息');
      }

      // 取第一个结果（最匹配的）
      const feature = features[0];
      const context = feature.context || [];

      // 从 context 中提取国家、省州、城市等信息
      const country = context.find((c) => c.id.startsWith('country'));
      const region = context.find((c) =>
        c.id.startsWith('region') || c.id.startsWith('province'),
      );
      const place = context.find((c) => c.id.startsWith('place'));
      const locality = context.find((c) => c.id.startsWith('locality'));

      const transformed = {
        name: feature.place_name,
        fullAddress: feature.place_name,
        country: country?.text,
        countryCode: country?.short_code?.toUpperCase(),
        region: region?.text,
        regionCode: region?.short_code,
        city: place?.text || locality?.text,
        placeType: feature.id.split('.')[0],
        latitude: feature.center[1],
        longitude: feature.center[0],
      };

      const result = { data: transformed };

      // 💰 写入缓存（异步，不阻塞）
      if (this.useRedisCache && this.redisClient) {
        this.redisClient.setex(
          cacheKey,
          this.geocodeCacheTtlSeconds,
          JSON.stringify(result),
        ).catch((error) => {
          this.logger.warn('Failed to cache reverse geocode result:', error);
        });
      }

      return result;
    } catch (error) {
      this.handleError('reverse geocode', error);
      throw new Error('调用反向地理编码服务失败');
    }
  }

  private handleError(action: string, error: unknown): void {
    if (isAxiosError<MapboxGeocodeResponse>(error)) {
      const { status, data } = error.response ?? {};
      this.logger.error(`调用 Mapbox ${action} 接口失败`, { status, data });
    } else if (error instanceof Error) {
      this.logger.error(`调用 Mapbox ${action} 接口发生未知错误`, error);
    } else {
      this.logger.error(`调用 Mapbox ${action} 接口发生未知错误`, {
        value: error,
      });
    }
  }
}
