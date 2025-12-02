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
    const isEnglish = language === 'en-US' || language === 'en';
    
    const systemMessage = isEnglish
      ? `You are **tripnara Senior Concierge Nara**. You have 20 years of experience in high-end customized travel.

Your core ability is to provide users with **"high signal-to-noise ratio"** cultural advice. Users have limited time during travel and don't like reading lengthy articles.

**Your Output Standards:**

1. **Extremely Concise**: Only provide the most critical, essential, and authentic information. No fluff.

2. **Visually Friendly**: Make full use of Emojis and Markdown formatting to create an easy-to-read list similar to "Xiaohongshu" or "high-end magazines".

3. **Clear Structure**: Strictly distinguish between "Red List (Must-Do)" and "Black List (Taboos)".

4. **Tone**: Professional, elegant, direct.

Please always respond in English.`
      : `你是 **tripnara 首席旅行管家 (Senior Concierge) Nara**。你拥有 20 年的高端定制旅行经验。

你的核心能力是为用户提供**"高信噪比"**的文化建议。用户在旅行途中时间宝贵，不喜欢阅读长篇大论。

**你的输出标准：**

1. **极度精简**：只提供最关键、最致命、最地道的信息。拒绝废话。

2. **视觉友好**：充分利用 Emoji 和 Markdown 排版，打造类似"小红书"或"高端杂志"的易读清单。

3. **结构清晰**：严格区分"红榜（必做）"与"黑榜（禁忌）"。

4. **语气**：专业、优雅、直接。

请始终使用简体中文回答。`;

    const prompt = isEnglish
      ? `Current Context:

The user is about to travel to **${itinerary.destination}**.

Trip Summary: ${itinerary.summary || 'None'}

Please generate a **concise "Cultural Red and Black List"** for this destination. Please ignore common sense (such as "don't litter") and focus only on the destination's **unique** cultural pain points and highlights.

Please strictly follow the Markdown format below, without any opening or closing remarks:

### 🔴 Red List: Act Like a Local (Top 4)

*(Please list 4 authentic behaviors/etiquettes that can most enhance the travel experience, each no more than 20 words, with key actions **bolded**)*

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

### ⚫ Black List: Don't Step on Landmines (Top 4)

*(Please list 4 taboos that are most likely to offend locals or cause embarrassment, each no more than 20 words, with key taboos **bolded**)*

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

- [Emoji] **Key Phrase**: Brief explanation.

### 💡 Nara's Survival Guide

*(Please display the following information in short key-value pairs)*

> 💰 **Tipping Rules**: (One sentence explaining how much to tip at restaurants/hotels/taxis)

> 👗 **Dress Code Red Lines**: (The most core dress requirements for this destination, such as religious sites/fine dining restaurants)

> ⚡ **Power Outlet**: (e.g., Type A 110V, adapter needed)

> 🚨 **Emergency Help**: (Local police/ambulance phone number)`
      : `当前上下文：

用户即将前往 **${itinerary.destination}** 旅行。

行程摘要：${itinerary.summary || '暂无'}

请为这个目的地生成一份**精简版「文化红黑榜」**。请忽略通用的常识（如"不要乱扔垃圾"），只专注于该目的地**特有**的文化痛点和亮点。

请严格按照以下 Markdown 格式输出，不要包含任何开场白或结束语：

### 🔴 红榜：像当地人一样 (Top 4)

*(请列出 4 个最能提升旅行体验的地道行为/礼仪，每条不超过 20 字，关键动作**加粗**)*

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

### ⚫ 黑榜：千万别踩雷 (Top 4)

*(请列出 4 个最容易冒犯当地人或导致尴尬的禁忌，每条不超过 20 字，关键雷点**加粗**)*

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

- [Emoji] **关键短语**：简短解释。

### 💡 Nara 的生存指南

*(以下信息请用简短的键值对形式展示)*

> 💰 **小费规则**：(一句话讲清餐厅/酒店/出租车给多少)

> 👗 **着装红线**：(针对该目的地最核心的着装要求，如宗教场所/高级餐厅)

> ⚡ **电压插座**：(如：美标 110V，需转接头)

> 🚨 **紧急求助**：(当地报警/急救电话)`;

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

