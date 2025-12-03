import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LlmService } from '../../llm/llm.service';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import { CulturalGuideResponseDto } from '../dto/itinerary.dto';
import { PromptService } from './prompt.service';

@Injectable()
export class CulturalGuideService {
  private readonly logger = new Logger(CulturalGuideService.name);
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
          this.logger.warn('Redis connection error in CulturalGuideService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for cultural guide cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for CulturalGuideService');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for CulturalGuideService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, cultural guide cache disabled');
    }
  }

  /**
   * 获取目的地的文化红黑榜
   */
  async getCulturalGuide(
    journeyId: string,
    userId?: string,
    language?: string,
  ): Promise<CulturalGuideResponseDto> {
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
      this.logger.debug(`Cultural guide cache hit for: ${destination} (${userLanguage})`);
      return {
        success: true,
        destination,
        content: cached,
        fromCache: true,
        generatedAt: new Date().toISOString(),
      };
    }

    // 缓存未命中，生成新的文化红黑榜
    this.logger.log(`Generating cultural guide for destination: ${destination} (${userLanguage})`);
    const content = await this.generateCulturalGuideWithAI(itinerary, userId, userLanguage);

    // 保存到缓存
    await this.setCache(cacheKey, content);

    return {
      success: true,
      destination,
      content,
      fromCache: false,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 使用 AI 生成文化红黑榜
   */
  private async generateCulturalGuideWithAI(
    itinerary: any,
    userId?: string, // 可选：用户ID，用于从用户偏好读取模型选择
    language: string = 'zh-CN',
  ): Promise<string> {
    // 使用 PromptService 构建提示词
    const systemMessage = this.promptService.buildCulturalGuideSystemMessage(language);
    const prompt = this.promptService.buildCulturalGuideUserPrompt({
      destination: itinerary.destination,
      summary: itinerary.summary,
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
          maxOutputTokens: 1500, // 精简版内容，减少 token 限制
          provider: 'deepseek', // 强制使用 DeepSeek-V3（文化习俗理解，多语言表现优秀）
          model: 'deepseek-chat', // DeepSeek-V3 模型
        }),
      );

      return response.trim();
    } catch (error) {
      this.logger.error(`生成文化红黑榜失败: ${error}`);
      throw new BadRequestException(
        `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(destination: string, language: string = 'zh-CN'): string {
    return `cultural-guide:${destination.toLowerCase().trim()}:${language}`;
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(key: string): Promise<string | null> {
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        if (cached) {
          return cached;
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
  private async setCache(key: string, value: string): Promise<void> {
    if (this.useRedisCache && this.redisClient) {
      try {
        await this.redisClient.setex(key, this.redisCacheTtlSeconds, value);
        this.logger.debug(`Cultural guide cached: ${key}`);
      } catch (error) {
        this.logger.warn(`Redis cache write error for ${key}:`, error);
      }
    }
  }
}

