import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import {
  PlatformSearchRequestDto,
  TravelGuideItemDto,
  TravelGuideResponseDto,
  TravelGuideSearchQueryDto,
} from './dto/travel-guides.dto';
import { AttractionDetailsDto } from './dto/external.dto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class ExternalService {
  private readonly logger = new Logger(ExternalService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  private readonly eventbriteToken: string;
  private readonly eventbriteBaseUrl: string;
  private readonly travelAdvisorApiKey: string;
  private readonly travelAdvisorApiHost: string;
  private readonly travelAdvisorBaseUrl: string;
  private readonly googleApiKey?: string;
  private readonly googleCx?: string;

  constructor(private readonly configService: ConfigService) {
    this.eventbriteToken =
      this.configService.get<string>('EVENTBRITE_API_TOKEN') ?? '';
    this.eventbriteBaseUrl = this.configService.getOrThrow<string>(
      'EVENTBRITE_BASE_URL',
    );
    this.travelAdvisorApiKey =
      this.configService.get<string>('TRAVEL_ADVISOR_API_KEY') ?? '';
    this.travelAdvisorApiHost =
      this.configService.getOrThrow<string>('TRAVEL_ADVISOR_API_HOST');
    this.travelAdvisorBaseUrl = this.configService.getOrThrow<string>(
      'TRAVEL_ADVISOR_BASE_URL',
    );
    this.googleApiKey =
      this.configService.get<string>('GOOGLE_API_KEY') ??
      this.configService.get<string>('GUIDES_GOOGLE_API_KEY');
    this.googleCx =
      this.configService.get<string>('GOOGLE_CX') ??
      this.configService.get<string>('GUIDES_GOOGLE_CX');
    this.maxRetries = this.configService.get<number>('EXTERNAL_API_MAX_RETRIES', 3);
    this.retryDelayMs = this.configService.get<number>('EXTERNAL_API_RETRY_DELAY_MS', 1000);
  }

  async searchEvents(location: string) {
    if (!this.eventbriteToken) {
      throw new HttpException(
        {
          message: 'EVENTBRITE_TOKEN_MISSING',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const cacheKey = `eventbrite:${location.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Ensure base URL includes /v3 if not already present
      let baseUrl = this.eventbriteBaseUrl;
      if (!baseUrl.endsWith('/v3') && !baseUrl.endsWith('/v3/')) {
        baseUrl = baseUrl.endsWith('/') ? `${baseUrl}v3` : `${baseUrl}/v3`;
      }
      
      const searchUrl = new URL('/events/search/', baseUrl).toString();
      const data = await this.executeWithRetry(
        () => axios.get(searchUrl, {
        params: {
          'location.address': location,
          expand: 'venue',
        },
        headers: {
          Authorization: `Bearer ${this.eventbriteToken}`,
        },
        }),
        'Eventbrite',
      );
      
      this.setCache(cacheKey, data.data);
      return data.data;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      const errorMessage = status === 404 
        ? 'EVENTBRITE_ENDPOINT_NOT_FOUND'
        : status === 401 || status === 403
        ? 'EVENTBRITE_AUTH_FAILED'
        : 'EVENTBRITE_SERVICE_UNAVAILABLE';
      
      this.logger.error(
        `Eventbrite API error (status: ${status})`,
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: errorMessage },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async searchLocations(query: string) {
    if (!this.travelAdvisorApiKey || this.travelAdvisorApiKey.trim() === '') {
      this.logger.warn(
        `Travel Advisor API Key is not configured, returning empty result for query: ${query}`,
      );
      // 优雅降级：返回空结果而不是抛出错误
      return {
        data: [],
      };
    }
    const cacheKey = `travel-advisor:${query.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchUrl = new URL(
        '/locations/search',
        this.travelAdvisorBaseUrl,
      ).toString();
      const data = await this.executeWithRetry(
        () => axios.get(searchUrl, {
        params: { query },
        headers: {
          'X-RapidAPI-Key': this.travelAdvisorApiKey,
          'X-RapidAPI-Host': this.travelAdvisorApiHost,
        },
        }),
        'Travel Advisor',
      );
      
      this.setCache(cacheKey, data.data);
      return data.data;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      const errorMessage = status === 429
        ? 'TRAVEL_ADVISOR_RATE_LIMIT_EXCEEDED'
        : status === 401 || status === 403
        ? 'TRAVEL_ADVISOR_AUTH_FAILED'
        : 'TRAVEL_ADVISOR_SERVICE_UNAVAILABLE';
      
      this.logger.error(
        `Travel Advisor API error (status: ${status})`,
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: errorMessage },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getAttractionDetails(
    attractionId: string,
    lang: string = 'zh-CN',
  ): Promise<AttractionDetailsDto> {
    if (!this.travelAdvisorApiKey || this.travelAdvisorApiKey.trim() === '') {
      this.logger.warn(
        `Travel Advisor API Key is not configured, returning empty details for attraction: ${attractionId}`,
      );
      // 优雅降级：返回最小化的默认数据而不是抛出错误
      return {
        id: attractionId,
        name: '',
        rating: {
          rating: 0,
          reviewCount: 0,
        },
      };
    }

    const cacheKey = `travel-advisor:attraction:${attractionId}:${lang}`;
    const cached = this.getFromCache<AttractionDetailsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const detailsUrl = new URL(
        '/attractions/get-details',
        this.travelAdvisorBaseUrl,
      ).toString();
      const response = await this.executeWithRetry(
        () =>
          axios.get(detailsUrl, {
            params: {
              location_id: attractionId,
              lang,
              currency: 'CNY',
            },
            headers: {
              'X-RapidAPI-Key': this.travelAdvisorApiKey,
              'X-RapidAPI-Host': this.travelAdvisorApiHost,
            },
          }),
        'Travel Advisor (Attraction Details)',
      );

      const data = response.data;
      const result = this.transformAttractionDetails(data, attractionId);

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      const errorMessage =
        status === 429
          ? 'TRAVEL_ADVISOR_RATE_LIMIT_EXCEEDED'
          : status === 401 || status === 403
          ? 'TRAVEL_ADVISOR_AUTH_FAILED'
          : status === 404
          ? 'ATTRACTION_NOT_FOUND'
          : 'TRAVEL_ADVISOR_SERVICE_UNAVAILABLE';

      this.logger.error(
        `Travel Advisor attraction details API error (status: ${status})`,
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: errorMessage },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private transformAttractionDetails(data: any, attractionId: string): AttractionDetailsDto {
    const result: any = data?.data?.[0] || data || {};
    const location = result.location_id
      ? result
      : result.result_object || {};

    // 提取评分信息
    const rating = result.rating || location.rating || null;
    const numReviews = result.num_reviews || location.num_reviews || 0;

    // 提取门票价格信息
    const booking = result.booking || {};
    let ticketInfo: any = undefined;
    if (booking.price_range || booking.ticket_price || booking.vendor_url) {
      ticketInfo = {
        requiresTicket: true,
      };
      if (booking.price_range) {
        ticketInfo.priceRange = {
          min: booking.price_range.min,
          max: booking.price_range.max,
          currency: booking.price_range.currency || 'CNY',
          description: booking.price_range.description,
        };
      } else if (booking.ticket_price) {
        ticketInfo.priceRange = {
          description: booking.ticket_price,
        };
      }
      if (booking.vendor_url) {
        ticketInfo.purchaseUrl = booking.vendor_url;
      }
      if (booking.provider) {
        ticketInfo.purchaseMethod = booking.provider;
      }
    }

    // 构建返回对象
    const transformed: AttractionDetailsDto = {
      id: location.location_id?.toString() || attractionId,
      name: result.name || location.name || '未知景点',
      address: location.address || result.address || undefined,
      coordinates:
        location.latitude && location.longitude
          ? {
              lat: parseFloat(location.latitude),
              lng: parseFloat(location.longitude),
            }
          : undefined,
      rating: {
        rating: rating ? parseFloat(rating) : 0,
        reviewCount: parseInt(numReviews?.toString() || '0', 10),
        ratingDistribution: result.rating_histogram || undefined,
      },
      ticketInfo,
      openingHours: result.hours || location.hours || undefined,
      phone: result.phone || location.phone || undefined,
      website: result.website || location.website || undefined,
      description: result.description || location.description || undefined,
      category: result.category?.name || location.category?.name || undefined,
      tripadvisorUrl: result.web_url || location.web_url || undefined,
    };

    return transformed;
  }

  async searchTravelGuides(
    dto: TravelGuideSearchQueryDto,
  ): Promise<TravelGuideResponseDto> {
    const limit = dto.limit ?? 50;
    const language = dto.language ?? 'zh-CN';
    if (!this.travelAdvisorApiKey) {
      return {
        success: true,
        data: [],
        message: 'TripAdvisor API 未配置，返回空结果',
        error: 'TRAVEL_ADVISOR_KEY_MISSING',
      };
    }

    try {
      const searchUrl = new URL(
        '/locations/search',
        this.travelAdvisorBaseUrl,
      ).toString();
      const response = await this.executeWithRetry(
        () => axios.get(searchUrl, {
        params: {
          query: dto.destination,
          limit,
          lang: language,
        },
        headers: {
          'X-RapidAPI-Key': this.travelAdvisorApiKey,
          'X-RapidAPI-Host': this.travelAdvisorApiHost,
        },
        }),
        'Travel Advisor (Guides)',
      );

      const entries =
        Array.isArray((response.data as any)?.data) ? (response.data as any).data : [];
      const guides = entries.slice(0, limit).map(
        (item: any, index: number) => ({
          id:
            item?.result_object?.location_id ??
            `tripadvisor_${Date.now()}_${index}`,
          title: item?.result_object?.name ?? dto.destination,
          excerpt:
            item?.result_object?.geo_description ??
            item?.details ??
            '精彩旅行推荐',
          url: item?.result_object?.web_url ?? '',
          source: 'TripAdvisor',
          publishedAt: item?.result_object?.published_date ?? null,
          tags: [dto.destination],
          imageUrl: item?.result_object?.photo?.images?.large?.url ?? null,
          author: item?.result_object?.write_review ?? null,
          readTime: null,
        }),
      );

      return {
        success: true,
        data: guides,
        message: null,
        error: null,
      };
    } catch (error) {
      this.logger.error(
        'TripAdvisor guide API error',
        (error as any)?.response?.data ?? error,
      );
      return {
        success: true,
        data: [],
        message: 'TripAdvisor 数据暂不可用',
        error: 'TRIPADVISOR_SERVICE_ERROR',
      };
    }
  }

  async searchPlatformGuides(
    dto: PlatformSearchRequestDto,
  ): Promise<TravelGuideResponseDto> {
    const limit = dto.limit ?? 50;

    // 检查 Google Custom Search API 配置
    if (!this.googleApiKey || !this.googleCx) {
      this.logger.warn(
        'Google Custom Search API 未配置，无法进行多平台搜索',
      );
      return {
        success: true,
        data: [],
        message: 'Google Custom Search API 未配置，无法进行多平台搜索',
        error: 'GOOGLE_API_NOT_CONFIGURED',
      };
    }

    try {
      // 并行搜索所有平台
      const searchPromises = dto.platforms.map((platform) =>
        this.searchPlatformViaGoogle(dto.destination, platform),
      );

      const results = await Promise.allSettled(searchPromises);
      const allGuides: TravelGuideItemDto[] = [];

      // 收集所有成功的结果
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allGuides.push(...result.value);
        } else {
          this.logger.warn(
            `搜索平台 ${dto.platforms[index].name} 失败:`,
            result.reason,
          );
        }
      });

      // 去重
      const uniqueGuides = this.deduplicateGuides(allGuides);

      // 排序（按相关性）
      const sortedGuides = this.sortGuidesByRelevance(
        uniqueGuides,
        dto.destination,
      );

      // 限制返回数量
      const limitedGuides = sortedGuides.slice(0, limit);

      return {
        success: true,
        data: limitedGuides,
        message: null,
        error: null,
      };
    } catch (error) {
      this.logger.error('多平台搜索失败', error);
      return {
        success: true,
        data: [],
        message: '多平台搜索失败，请稍后重试',
        error: 'PLATFORM_SEARCH_ERROR',
      };
    }
  }

  private async searchPlatformViaGoogle(
    destination: string,
    platform: { name: string; domain: string; searchUrl?: string },
  ): Promise<TravelGuideItemDto[]> {
    const cacheKey = `platform-search:${destination}:${platform.domain}`;
    const cached = this.getFromCache<TravelGuideItemDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 构建搜索查询：site:domain destination 攻略
      const query = `site:${platform.domain} ${destination} 攻略`;

      const response = await this.executeWithRetry(
        () =>
          axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: this.googleApiKey,
              cx: this.googleCx,
              q: query,
              num: 10, // 每个平台最多返回10个结果
              hl: 'zh-CN',
            },
          }),
        `Google Custom Search (${platform.name})`,
      );

      const items = (response.data as any)?.items || [];
      const guides: TravelGuideItemDto[] = items.map(
        (item: any, index: number) => {
          // 提取发布日期（如果可能）
          let publishedAt: string | null = null;
          try {
            // 尝试从 snippet 或其他字段提取日期
            const dateMatch = item.snippet?.match(/\d{4}[-年]\d{1,2}[-月]\d{1,2}/);
            if (dateMatch) {
              publishedAt = dateMatch[0].replace(/[年月]/g, '-');
            }
          } catch (e) {
            // 忽略日期解析错误
          }

          // 生成唯一ID
          const id = `${platform.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`;

          // 提取图片URL（如果存在）
          let imageUrl: string | null = null;
          if (item.pagemap?.cse_image?.[0]?.src) {
            imageUrl = item.pagemap.cse_image[0].src;
          } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
            imageUrl = item.pagemap.metatags[0]['og:image'];
          }

          return {
            id,
            title: item.title || destination,
            excerpt: item.snippet || '精彩旅行推荐',
            url: item.link || '',
            source: platform.name,
            publishedAt,
            tags: [destination, platform.name],
            imageUrl,
            author: null,
            readTime: this.estimateReadTime(item.snippet),
          };
        },
      );

      // 缓存结果
      this.setCache(cacheKey, guides);
      return guides;
    } catch (error) {
      this.logger.error(
        `搜索平台 ${platform.name} 失败:`,
        (error as any)?.response?.data ?? error,
      );
      // 返回空数组而不是抛出错误，让其他平台继续搜索
      return [];
    }
  }

  /**
   * 去重：基于 URL 去重
   */
  private deduplicateGuides(guides: TravelGuideItemDto[]): TravelGuideItemDto[] {
    const seenUrls = new Set<string>();
    const uniqueGuides: TravelGuideItemDto[] = [];

    for (const guide of guides) {
      const normalizedUrl = guide.url.toLowerCase().trim();
      if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueGuides.push(guide);
      }
    }

    return uniqueGuides;
  }

  /**
   * 按相关性排序
   */
  private sortGuidesByRelevance(
    guides: TravelGuideItemDto[],
    destination: string,
  ): TravelGuideItemDto[] {
    const score = (guide: TravelGuideItemDto): number => {
      let score = 0;
      const titleLower = guide.title.toLowerCase();
      const excerptLower = guide.excerpt.toLowerCase();
      const destLower = destination.toLowerCase();

      // 标题中包含目的地：+10分
      if (titleLower.includes(destLower)) {
        score += 10;
      }

      // 标题中包含"攻略"或"指南"：+5分
      if (titleLower.includes('攻略') || titleLower.includes('指南')) {
        score += 5;
      }

      // 摘要中包含目的地：+3分
      if (excerptLower.includes(destLower)) {
        score += 3;
      }

      // 有图片：+2分
      if (guide.imageUrl) {
        score += 2;
      }

      // 有发布日期：+1分
      if (guide.publishedAt) {
        score += 1;
      }

      return score;
    };

    return guides.sort((a, b) => score(b) - score(a));
  }

  /**
   * 估算阅读时间（分钟）
   */
  private estimateReadTime(snippet?: string): number | null {
    if (!snippet) {
      return null;
    }
    // 简单估算：每250字约1分钟
    const wordCount = snippet.length;
    const minutes = Math.ceil(wordCount / 250);
    return minutes > 0 ? minutes : null;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache<T>(key: string, value: T) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  /**
   * Execute an API request with retry logic for rate limits and server errors
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    serviceName: string,
    attempt = 1,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (this.shouldRetry(error) && attempt < this.maxRetries) {
        const delayMs = attempt * this.retryDelayMs;
        const status = (error as AxiosError)?.response?.status;
        this.logger.warn(
          `${serviceName} API request failed (attempt ${attempt}/${this.maxRetries}, status: ${status}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
        return this.executeWithRetry(requestFn, serviceName, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    // Retry on network errors (no response)
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || status >= 500;
  }

  /**
   * Delay execution for a specified number of milliseconds
   */
  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

