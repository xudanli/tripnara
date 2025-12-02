import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LlmService } from '../../llm/llm.service';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import { LocalEssentialsResponseDto } from '../dto/itinerary.dto';

interface LocalEssentialsData {
  language: string;
  currencyRate: string;
  timeZone: string;
  powerOutlet: string;
  emergencyNumber: string;
}

@Injectable()
export class LocalEssentialsService {
  private readonly logger = new Logger(LocalEssentialsService.name);
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly redisCacheTtlSeconds = 30 * 24 * 60 * 60; // 30天缓存

  constructor(
    private readonly llmService: LlmService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly configService: ConfigService,
  ) {
    // 初始化 Redis 客户端
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
          this.logger.warn('Redis connection error in LocalEssentialsService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for local essentials cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for LocalEssentialsService');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for LocalEssentialsService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, local essentials cache disabled');
    }
  }

  /**
   * 获取目的地实用信息
   */
  async getLocalEssentials(
    journeyId: string,
    userId?: string,
  ): Promise<LocalEssentialsResponseDto> {
    // 检查行程是否存在
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 检查权限（如果提供了 userId）
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new NotFoundException('无权访问此行程');
      }
    }

    const destination = itinerary.destination;
    const cacheKey = this.getCacheKey(destination);

    // 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Local essentials cache hit for: ${destination}`);
      return {
        success: true,
        destination,
        localEssentials: cached,
        fromCache: true,
        generatedAt: new Date().toISOString(),
      };
    }

    // 缓存未命中，生成新的实用信息
    this.logger.log(`Generating local essentials for destination: ${destination}`);
    const localEssentials = await this.generateLocalEssentialsWithAI(destination);

    // 保存到缓存
    await this.setCache(cacheKey, localEssentials);

    return {
      success: true,
      destination,
      localEssentials,
      fromCache: false,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 使用 AI 生成实用信息
   */
  private async generateLocalEssentialsWithAI(
    destination: string,
  ): Promise<LocalEssentialsData> {
    const systemMessage = `你是一个专业的旅行信息助手，擅长提供准确的目的地实用信息。请始终以JSON格式返回数据。`;

    const prompt = `请为目的地 **${destination}** 提供以下实用信息，并以JSON格式返回：

{
  "language": "官方语言及常用问候语（不仅要写语言，还要写一句你好/谢谢）",
  "currencyRate": "汇率估算（提供大概的兑换比例，例如：1 USD ≈ 7.2 CNY）",
  "timeZone": "时区（提供 GMT/UTC 格式，例如：GMT+8 或 UTC+0）",
  "powerOutlet": "插座类型（说明是 Type A/B/C 等，例如：Type C, 220V）",
  "emergencyNumber": "报警/急救电话（提供当地的具体号码，例如：110, 119）"
}

请确保返回的是有效的JSON格式，所有字段都是字符串类型。`;

    try {
      const response = await this.llmService.chatCompletion(
        this.llmService.buildChatCompletionOptions({
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          maxOutputTokens: 1000,
          json: false,
        }),
      );

      // 提取JSON
      let jsonString = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const firstOpen = jsonString.indexOf('{');
      const lastClose = jsonString.lastIndexOf('}');

      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonString = jsonString.substring(firstOpen, lastClose + 1);
      }

      const parsed = JSON.parse(jsonString) as LocalEssentialsData;

      // 验证必需字段
      if (
        !parsed.language ||
        !parsed.currencyRate ||
        !parsed.timeZone ||
        !parsed.powerOutlet ||
        !parsed.emergencyNumber
      ) {
        throw new Error('AI返回的数据缺少必需字段');
      }

      return parsed;
    } catch (error) {
      this.logger.error(`生成实用信息失败: ${error}`);
      throw new BadRequestException(
        `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(destination: string): string {
    return `local-essentials:${destination.toLowerCase().trim()}`;
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(key: string): Promise<LocalEssentialsData | null> {
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        if (cached) {
          return JSON.parse(cached) as LocalEssentialsData;
        }
      } catch (error) {
        this.logger.warn(`Redis cache read error for ${key}:`, error);
      }
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, value: LocalEssentialsData): Promise<void> {
    if (this.useRedisCache && this.redisClient) {
      try {
        await this.redisClient.setex(
          key,
          this.redisCacheTtlSeconds,
          JSON.stringify(value),
        );
        this.logger.debug(`Local essentials cached: ${key}`);
      } catch (error) {
        this.logger.warn(`Redis cache write error for ${key}:`, error);
      }
    }
  }
}


