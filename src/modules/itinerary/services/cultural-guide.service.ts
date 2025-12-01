import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LlmService } from '../../llm/llm.service';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import { CulturalGuideResponseDto } from '../dto/itinerary.dto';

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
  async getCulturalGuide(journeyId: string, userId?: string): Promise<CulturalGuideResponseDto> {
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
      this.logger.debug(`Cultural guide cache hit for: ${destination}`);
      return {
        success: true,
        destination,
        content: cached,
        fromCache: true,
        generatedAt: new Date().toISOString(),
      };
    }

    // 缓存未命中，生成新的文化红黑榜
    this.logger.log(`Generating cultural guide for destination: ${destination}`);
    const content = await this.generateCulturalGuideWithAI(itinerary);

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
  private async generateCulturalGuideWithAI(itinerary: any): Promise<string> {
    const systemMessage = `你是 **WanderAI 首席旅行管家 (Senior Concierge)**。你拥有 20 年的高端定制旅行经验，精通全球地理、复杂的交通物流、米其林餐饮体系以及各地深度的文化禁忌。

你的核心职责与服务标准：

1. **专家级路线优化**：
   - **必须**基于地理位置分析景点分布。
   - 在建议路线时，必须附带**具体的交通方式及预估耗时**。

2. **深度本地洞察**：
   - 告诉用户**怎么玩才地道**（例如最佳拍照时间、隐藏入口）。
   - 餐厅推荐需提及预约难度。

3. **格式规范**：
   - 语气：专业、沉稳。
   - **排版**：使用 Markdown。关键信息**加粗**。
   - 路线展示：使用箭头符号（A -> B -> C）。

请始终使用简体中文回答。`;

    const prompt = `当前上下文：

用户正在查阅前往 **${itinerary.destination}** 的行程。

完整行程数据：${JSON.stringify({
      destination: itinerary.destination,
      daysCount: itinerary.daysCount,
      summary: itinerary.summary,
      days: itinerary.days?.map((day: any) => ({
        day: day.day,
        date: day.date,
        activities: day.activities?.map((act: any) => ({
          title: act.title,
          type: act.type,
          location: act.location,
        })),
      })),
    }, null, 2)}

请为这个目的地生成一份**文化红黑榜**，包括：

1. **✅ 推荐做法（红榜）**：
   - 当地文化礼仪和最佳实践
   - 推荐的社交行为
   - 值得体验的文化活动
   - 推荐的用餐礼仪
   - 购物和讨价还价建议

2. **❌ 禁忌行为（黑榜）**：
   - 文化禁忌和不当行为
   - 需要避免的社交错误
   - 宗教和习俗注意事项
   - 拍照和摄影限制
   - 其他重要禁忌

3. **💡 实用建议**：
   - 小费文化
   - 着装要求
   - 时间观念
   - 沟通方式
   - 紧急联系方式

请使用 Markdown 格式，结构清晰，关键信息加粗。`;

    try {
      const response = await this.llmService.chatCompletion({
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 3000,
      });

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
  private getCacheKey(destination: string): string {
    return `cultural-guide:${destination.toLowerCase().trim()}`;
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

