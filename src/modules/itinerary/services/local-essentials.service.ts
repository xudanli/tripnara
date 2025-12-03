import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LlmService } from '../../llm/llm.service';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import { LocalEssentialsResponseDto } from '../dto/itinerary.dto';
import { PromptService } from './prompt.service';

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
    private readonly promptService: PromptService,
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
    language?: string,
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
    const userLanguage = language || 'zh-CN';
    const cacheKey = this.getCacheKey(destination, userLanguage);

    // 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Local essentials cache hit for: ${destination} (${userLanguage})`);
      return {
        success: true,
        destination,
        localEssentials: cached,
        fromCache: true,
        generatedAt: new Date().toISOString(),
      };
    }

    // 缓存未命中，生成新的实用信息
    this.logger.log(`Generating local essentials for destination: ${destination} (${userLanguage})`);
    const localEssentials = await this.generateLocalEssentialsWithAI(destination, userLanguage);

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
    language: string = 'zh-CN',
  ): Promise<LocalEssentialsData> {
    // 使用 PromptService 构建提示词
    const systemMessage = this.promptService.buildLocalEssentialsSystemMessage(language);
    const prompt = this.promptService.buildLocalEssentialsUserPrompt({
      destination,
      language,
    });

    try {
      const response = await this.llmService.chatCompletion(
        await this.llmService.buildChatCompletionOptions({
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1000,
        json: false,
          provider: 'deepseek', // 强制使用 DeepSeek-V3（实用信息提取，结构化输出）
          model: 'deepseek-chat', // DeepSeek-V3 模型
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
  private getCacheKey(destination: string, language: string = 'zh-CN'): string {
    return `local-essentials:${destination.toLowerCase().trim()}:${language}`;
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


