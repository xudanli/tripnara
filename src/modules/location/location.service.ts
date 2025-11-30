import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
import Redis from 'ioredis';
import {
  GenerateLocationRequestDto,
  LocationInfoDto,
  BatchActivityDto,
  BatchLocationResultDto,
} from './dto/location.dto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface AiLocationResponse {
  chineseName: string;
  localName: string;
  chineseAddress: string;
  localAddress: string;
  transportInfo: string;
  openingHours: string;
  ticketPrice: string;
  visitTips: string;
  nearbyAttractions?: string;
  contactInfo?: string;
  category: string;
  rating: number;
  visitDuration: string;
  bestTimeToVisit: string;
  accessibility?: string;
  dressingTips?: string;
  culturalTips?: string;
  bookingInfo?: string;
}

interface TypeDefaults {
  category: string;
  openingHours: string;
  ticketPrice: string;
  transportInfo: string;
  visitTips: string;
  rating: number;
  visitDuration: string;
  bestTimeToVisit: string;
  accessibility?: string;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly cache = new Map<string, CacheEntry<LocationInfoDto>>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000; // 24小时
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly redisCacheTtlSeconds = 30 * 24 * 60 * 60; // 30天（Redis 持久化缓存）

  constructor(
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {
    // 初始化 Redis 客户端（如果配置了 REDIS_URL）
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        // 解析 Redis URL
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
          retryStrategy: (times) => {
            // 重试策略：最多重试 3 次
            if (times > 3) {
              return null; // 停止重试
            }
            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 3,
        });

        this.redisClient.on('error', (error) => {
          this.logger.warn('Redis connection error:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for location cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for LocationService');
      } catch (error) {
        this.logger.warn(
          'Failed to initialize Redis client, using in-memory cache only:',
          error instanceof Error ? error.message : error,
        );
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.log('Redis URL not configured, using in-memory cache only');
    }
  }

  // 活动类型默认信息
  private readonly typeDefaults: Record<string, TypeDefaults> = {
    ocean: {
      category: '海洋活动',
      openingHours: '通常 08:00-17:00，受天气和潮汐影响',
      ticketPrice: '包含装备租赁，建议选择专业运营商',
      transportInfo: '建议乘坐专业船只或水上交通',
      visitTips: '建议选择专业潜水中心，注意防晒和海洋保护',
      rating: 4.5,
      visitDuration: '2-4小时',
      bestTimeToVisit: '上午或下午，避开正午强光',
      accessibility: '需确认具体活动项目的无障碍设施',
    },
    attraction: {
      category: '景点',
      openingHours: '通常 09:00-18:00，具体请查询官网',
      ticketPrice: '成人票价格，学生和老人有优惠',
      transportInfo: '建议乘坐公共交通，具体线路请查询当地交通信息',
      visitTips: '建议提前预订门票，避开高峰期游览',
      rating: 4.3,
      visitDuration: '1-3小时',
      bestTimeToVisit: '上午或下午，避开中午时段',
      accessibility: '大部分景点提供无障碍设施',
    },
    meal: {
      category: '餐饮',
      openingHours: '通常 11:00-22:00，具体营业时间请查询',
      ticketPrice: '人均消费，价格因餐厅档次而异',
      transportInfo: '建议使用导航软件查找最近路线',
      visitTips: '建议提前预订，避开用餐高峰期',
      rating: 4.2,
      visitDuration: '1-2小时',
      bestTimeToVisit: '午餐11:30-13:30，晚餐18:00-20:00',
      accessibility: '大部分餐厅提供无障碍通道',
    },
    hotel: {
      category: '住宿',
      openingHours: '24小时前台服务',
      ticketPrice: '房价因季节和房型而异，建议提前预订',
      transportInfo: '建议使用导航软件或联系酒店获取详细路线',
      visitTips: '建议提前预订，关注优惠活动',
      rating: 4.0,
      visitDuration: '住宿',
      bestTimeToVisit: '全年',
      accessibility: '请确认酒店无障碍设施',
    },
    shopping: {
      category: '购物',
      openingHours: '通常 10:00-20:00，具体请查询',
      ticketPrice: '商品价格因品牌和类型而异',
      transportInfo: '建议使用导航软件查找最近路线',
      visitTips: '建议关注促销活动，注意退税政策',
      rating: 4.1,
      visitDuration: '1-2小时',
      bestTimeToVisit: '上午或下午，避开周末高峰期',
      accessibility: '大部分购物场所提供无障碍设施',
    },
    transport: {
      category: '交通',
      openingHours: '根据交通方式而定',
      ticketPrice: '票价因距离和交通方式而异',
      transportInfo: '请查询具体交通线路和时间表',
      visitTips: '建议提前查询时刻表，预留充足时间',
      rating: 4.0,
      visitDuration: '根据行程而定',
      bestTimeToVisit: '避开高峰期',
      accessibility: '大部分公共交通提供无障碍设施',
    },
  };

  async generateLocationInfo(
    dto: GenerateLocationRequestDto,
  ): Promise<LocationInfoDto> {
    // 检查缓存（优先使用 Redis 持久化缓存）
    const cacheKey = this.getCacheKey(
      dto.activityName,
      dto.destination,
      dto.activityType,
    );
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for: ${dto.activityName}`);
      return cached;
    }

    try {
      // 获取语言配置
      const languageConfig = this.getCountryLanguage(dto.destination);

      // 调用AI生成位置信息
      const locationInfo = await this.generateLocationWithAI(
        dto.activityName,
        dto.destination,
        dto.activityType,
        dto.coordinates,
        languageConfig,
      );

      // 保存到缓存（同时写入 Redis 和内存缓存）
      await this.setCache(cacheKey, locationInfo);
      return locationInfo;
    } catch (error) {
      this.logger.error(
        `Failed to generate location info for ${dto.activityName}`,
        error,
      );
      // 使用默认信息回退
      return this.getDefaultLocationInfo(
        dto.activityName,
        dto.destination,
        dto.activityType,
        dto.coordinates,
      );
    }
  }

  async generateLocationBatch(
    activities: BatchActivityDto[],
  ): Promise<BatchLocationResultDto[]> {
    // 性能优化：并发处理所有活动，而不是串行处理
    // 使用 Promise.allSettled 确保单个失败不影响其他请求
    const promises = activities.map(async (activity) => {
      try {
        const locationInfo = await this.generateLocationInfo({
          activityName: activity.activityName,
          destination: activity.destination,
          activityType: activity.activityType,
          coordinates: activity.coordinates,
        });

        return {
          activityName: activity.activityName,
          locationInfo,
        };
      } catch (error) {
        this.logger.error(
          `Failed to generate location for ${activity.activityName}`,
          error,
        );
        // 使用默认信息
        const defaultInfo = this.getDefaultLocationInfo(
          activity.activityName,
          activity.destination,
          activity.activityType,
          activity.coordinates,
        );
        return {
          activityName: activity.activityName,
          locationInfo: defaultInfo,
        };
      }
    });

    // 并发执行所有请求
    // 性能优化：从串行改为并发，20个活动从10分钟降低到约30秒（取决于最慢的请求）
    const results = await Promise.all(promises);
    this.logger.log(
      `Batch location generation completed: ${results.length} activities processed concurrently`,
    );
    return results;
  }

  /**
   * 批量生成位置信息（高级优化：将多个地点打包发给 LLM）
   * 注意：此方法可以进一步减少 API 调用次数，但需要 LLM 支持批量生成
   * 当前实现仍使用并发单个请求，未来可以考虑实现真正的批量生成
   */
  async generateLocationBatchOptimized(
    activities: BatchActivityDto[],
    batchSize: number = 5,
  ): Promise<BatchLocationResultDto[]> {
    // 如果活动数量较少，直接使用并发方式
    if (activities.length <= batchSize) {
      return this.generateLocationBatch(activities);
    }

    // 将活动分批处理
    const batches: BatchActivityDto[][] = [];
    for (let i = 0; i < activities.length; i += batchSize) {
      batches.push(activities.slice(i, i + batchSize));
    }

    // 并发处理所有批次
    const batchPromises = batches.map((batch) =>
      this.generateLocationBatch(batch),
    );

    const batchResults = await Promise.all(batchPromises);
    return batchResults.flat();
  }

  private getCacheKey(
    activityName: string,
    destination: string,
    activityType: string,
  ): string {
    return `${activityName}-${destination}-${activityType}`.toLowerCase();
  }

  /**
   * 从缓存获取位置信息（优先使用 Redis，回退到内存缓存）
   */
  private async getFromCache(key: string): Promise<LocationInfoDto | null> {
    // 优先使用 Redis 缓存（持久化）
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        if (cached) {
          const locationInfo = JSON.parse(cached) as LocationInfoDto;
          this.logger.debug(`Redis cache hit for: ${key}`);
          return locationInfo;
        }
      } catch (error) {
        this.logger.warn(`Redis cache read error for ${key}:`, error);
        // 回退到内存缓存
      }
    }

    // 回退到内存缓存
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

  /**
   * 设置缓存（同时写入 Redis 和内存缓存）
   */
  private async setCache(key: string, value: LocationInfoDto): Promise<void> {
    // 写入 Redis 缓存（持久化，30天）
    if (this.useRedisCache && this.redisClient) {
      try {
        await this.redisClient.setex(
          key,
          this.redisCacheTtlSeconds,
          JSON.stringify(value),
        );
        this.logger.debug(`Redis cache set for: ${key}`);
      } catch (error) {
        this.logger.warn(`Redis cache write error for ${key}:`, error);
        // 继续写入内存缓存
      }
    }

    // 同时写入内存缓存（24小时，用于快速访问）
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private getCountryLanguage(destination: string): {
    primary: string;
    secondary?: string;
  } {
    // 根据目的地匹配语言配置
    const destinationLower = destination.toLowerCase();

    if (destinationLower.includes('瑞士')) {
      return { primary: '德语', secondary: '法语' };
    }
    if (destinationLower.includes('日本')) {
      return { primary: '日语', secondary: '中文' };
    }
    if (destinationLower.includes('法国')) {
      return { primary: '法语' };
    }
    if (destinationLower.includes('德国')) {
      return { primary: '德语' };
    }
    if (destinationLower.includes('意大利')) {
      return { primary: '意大利语' };
    }
    if (destinationLower.includes('西班牙')) {
      return { primary: '西班牙语' };
    }
    if (destinationLower.includes('中国') || destinationLower.includes('台湾')) {
      return { primary: '中文' };
    }
    if (destinationLower.includes('韩国')) {
      return { primary: '韩语' };
    }
    if (destinationLower.includes('泰国')) {
      return { primary: '泰语', secondary: '英语' };
    }

    // 默认返回英语
    return { primary: '英语' };
  }

  private getActivityType(activityName: string): string {
    const nameLower = activityName.toLowerCase();

    const oceanKeywords = [
      '浮潜',
      '潜水',
      '观鲸',
      '海洋',
      '珊瑚',
      '海滩',
      '岛屿',
      'snorkel',
      'dive',
      'whale',
      'ocean',
      'beach',
      'island',
    ];
    const attractionKeywords = [
      '博物馆',
      '美术馆',
      '公园',
      '古迹',
      '遗址',
      '教堂',
      '寺庙',
      'museum',
      'gallery',
      'park',
      'temple',
      'church',
    ];
    const mealKeywords = [
      '餐厅',
      '咖啡厅',
      '美食',
      '小吃',
      '酒吧',
      'restaurant',
      'cafe',
      'food',
      'bar',
    ];
    const hotelKeywords = ['酒店', '旅馆', '民宿', '度假村', 'hotel', 'inn', 'resort'];
    const shoppingKeywords = [
      '购物',
      '商场',
      '市场',
      '商店',
      '商业街',
      'shopping',
      'mall',
      'market',
      'store',
    ];
    const transportKeywords = [
      '车站',
      '机场',
      '港口',
      '地铁',
      '公交',
      '租车',
      'station',
      'airport',
      'port',
      'metro',
    ];

    if (oceanKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'ocean';
    }
    if (attractionKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'attraction';
    }
    if (mealKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'meal';
    }
    if (hotelKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'hotel';
    }
    if (shoppingKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'shopping';
    }
    if (transportKeywords.some((keyword) => nameLower.includes(keyword))) {
      return 'transport';
    }

    return 'attraction'; // 默认类型
  }

  private async generateLocationWithAI(
    activityName: string,
    destination: string,
    activityType: string,
    coordinates: { lat: number; lng: number; region?: string },
    languageConfig: { primary: string; secondary?: string },
  ): Promise<LocationInfoDto> {
    const systemMessage =
      '你是一个专业的旅行助手，擅长提供准确的多语言位置信息和实用的旅行建议。请始终以JSON格式返回数据。';

    const prompt = this.buildLocationPrompt(
      activityName,
      destination,
      activityType,
      coordinates,
      languageConfig,
    );

    this.logger.log(
      `Generating location info with AI for: ${activityName} in ${destination}`,
    );

    const aiResponse = await this.llmService.chatCompletionJson<AiLocationResponse>(
      {
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1500,
        json: true,
      },
    );

    return this.validateAndTransformAiResponse(aiResponse, activityName);
  }

  private buildLocationPrompt(
    activityName: string,
    destination: string,
    activityType: string,
    coordinates: { lat: number; lng: number; region?: string },
    languageConfig: { primary: string; secondary?: string },
  ): string {
    const languageText = languageConfig.secondary
      ? `${languageConfig.primary}和${languageConfig.secondary}`
      : languageConfig.primary;

    return `你是一名专业的旅行助手与目的地情报专家，擅长根据坐标与活动内容生成高度匹配的地点详情。请严格依据输入的活动名称、坐标与目的地，生成完整、准确且可落地的位置信息。

活动名称：${activityName}
目的地：${destination}
活动类型：${activityType}
坐标：${coordinates.lat}, ${coordinates.lng}
区域：${coordinates.region || '市中心区域'}
主要语言：${languageText}

⚠️ **必须满足以下核心约束**：

- 所有地点信息（名称、地址、交通、开放时间等）必须与【活动名称 + 目的地 + 坐标】完全一致。

- 若坐标在偏移区或无官方门牌号，请根据附近地标、建筑或官方登记点提供最接近的可识别地址。

- 内容需"行动导向"，清晰说明"如何到达、怎么进入、怎么使用、需要注意什么"。

【请生成以下内容，并保持专业、具体、无虚构感】

1. **中文名称 + 当地语言名称**

   - 要求：与活动内容精确匹配，不能泛泛地写"某景点""某街区"。

   - 若该地点有官方多语言译名，请全部补充。

2. **具体街道地址**

   - 中文地址 + 当地语言地址

   - 包含门牌号、街道、行政区、邮编

   - 若无门牌，用最近公共建筑或官方入口

3. **交通方式（必须可执行）**

   - 地铁/轻轨：具体站名 + 出口 + 步行时间

   - 公交：线路号 + 下车站名

   - 自驾：停车场名称、费用、入口导航点

   - 步行路线：从最近地标/车站出发的具体步行指引

4. **开放时间 & 最佳游览时间**

   - 按季节/节假日区分（如适用）

   - 特别说明：最不拥挤时段、避暑/避雨建议

5. **门票价格与优惠政策**

   - 成人/儿童/老人

   - 是否需预约、是否有免费时段、是否接受电子票

6. **详细游览建议 & 注意事项**

   - 以行动为主：怎么走、怎么拍、怎么体验

   - 体力需求、携带物品、避坑提示

7. **周边推荐 & 联系方式**

   - 临近景点、服务点、便利店、洗手间、补给点

   - 官方电话、邮箱、官网（如适用）

8. **穿搭建议（结合气候 + 活动类型）**

   - 温度范围、风雨情况、鞋子类型、保暖层级

   - 室内/宗教场所的着装礼仪

9. **当地文化提示 & 特殊注意事项**

   - 小费习惯、排队礼仪、宗教禁忌、拍照限制

   - 与该目的地相关的高频误区提醒

10. **预订信息（强执行性）**

    - 是否需要提前预约

    - 推荐预订渠道（官网、APP、电话）

    - 建议提前多久预订

    - 是否有快速通道、免费取消等政策

⚠️ **最终输出请写入到 LocationDetails 对象的对应字段，确保内容具体、真实、结构清晰。**

请以JSON格式返回：

{
  "chineseName": "准确的中文名称（必须与活动内容精确匹配，不能泛泛）",
  "localName": "当地语言名称（如有官方多语言译名请全部补充）",
  "chineseAddress": "具体街道地址，包含门牌号、街道、行政区、邮编（若无门牌，用最近公共建筑或官方入口）",
  "localAddress": "当地语言详细地址（格式同上）",
  "transportInfo": "详细交通信息（必须可执行）：地铁/轻轨（具体站名+出口+步行时间）、公交（线路号+下车站名）、自驾（停车场名称+费用+入口导航点）、步行路线（从最近地标/车站出发的具体指引）",
  "openingHours": "准确开放时间，按季节/节假日区分（如适用），包含最不拥挤时段、避暑/避雨建议",
  "ticketPrice": "详细价格信息：成人/儿童/老人价格，是否需预约、是否有免费时段、是否接受电子票",
  "visitTips": "详细游览建议（以行动为主）：怎么走、怎么拍、怎么体验，体力需求、携带物品、避坑提示",
  "nearbyAttractions": "周边推荐：临近景点、服务点、便利店、洗手间、补给点",
  "contactInfo": "联系方式：官方电话、邮箱、官网（如适用）",
  "category": "具体景点类型（必须与活动类型匹配）",
  "rating": 评分(1-5),
  "visitDuration": "建议游览时长（分钟）",
  "bestTimeToVisit": "最佳游览时间（结合季节、天气、人群情况）",
  "accessibility": "无障碍设施信息",
  "dressingTips": "穿搭建议：温度范围、风雨情况、鞋子类型、保暖层级，室内/宗教场所的着装礼仪",
  "culturalTips": "当地文化提示：小费习惯、排队礼仪、宗教禁忌、拍照限制，与该目的地相关的高频误区提醒",
  "bookingInfo": "预订信息（强执行性）：是否需要提前预约、推荐预订渠道（官网/APP/电话）、建议提前多久预订、是否有快速通道/免费取消等政策"
}

请确保：
- 位置名称和地址必须与【活动名称 + 目的地 + 坐标】完全一致
- 地址具体到街道和门牌号（若无门牌，用最近公共建筑或官方入口）
- 交通信息必须可执行，包含具体的地铁站名、出口、步行时间等
- 开放时间准确且按季节/节假日区分
- 价格信息详细且包含所有优惠政策
- 游览建议以行动为主，说明具体怎么做
- 所有信息必须真实、具体、无虚构感`;
  }

  private validateAndTransformAiResponse(
    aiResponse: AiLocationResponse,
    activityName: string,
  ): LocationInfoDto {
    // 验证必要字段
    if (!aiResponse.chineseName || !aiResponse.localName) {
      throw new Error('AI响应缺少必要字段：chineseName 或 localName');
    }

    // 确保评分在有效范围内
    const rating = Math.max(1, Math.min(5, aiResponse.rating || 4.0));

    return {
      chineseName: aiResponse.chineseName || activityName,
      localName: aiResponse.localName || activityName,
      chineseAddress: aiResponse.chineseAddress || '地址信息待补充',
      localAddress: aiResponse.localAddress || aiResponse.chineseAddress || '地址信息待补充',
      transportInfo: aiResponse.transportInfo || '交通信息待查询',
      openingHours: aiResponse.openingHours || '开放时间待查询',
      ticketPrice: aiResponse.ticketPrice || '价格信息待查询',
      visitTips: aiResponse.visitTips || '游览建议待补充',
      nearbyAttractions: aiResponse.nearbyAttractions,
      contactInfo: aiResponse.contactInfo,
      category: aiResponse.category || '景点',
      rating,
      visitDuration: aiResponse.visitDuration || '1-2小时',
      bestTimeToVisit: aiResponse.bestTimeToVisit || '全天',
      accessibility: aiResponse.accessibility,
      dressingTips: aiResponse.dressingTips,
      culturalTips: aiResponse.culturalTips,
      bookingInfo: aiResponse.bookingInfo,
    };
  }

  private getDefaultLocationInfo(
    activityName: string,
    destination: string,
    activityType: string,
    coordinates: { lat: number; lng: number; region?: string },
  ): LocationInfoDto {
    // 如果活动类型不匹配，尝试智能识别
    const detectedType = this.getActivityType(activityName);
    const finalType = detectedType !== 'attraction' ? detectedType : activityType;

    const defaults = this.typeDefaults[finalType] || this.typeDefaults.attraction;

    return {
      chineseName: activityName,
      localName: activityName,
      chineseAddress: `${coordinates.region || '市中心区域'}，${destination}`,
      localAddress: `${coordinates.region || 'City Center'}, ${destination}`,
      transportInfo: defaults.transportInfo,
      openingHours: defaults.openingHours,
      ticketPrice: defaults.ticketPrice,
      visitTips: defaults.visitTips,
      category: defaults.category,
      rating: defaults.rating,
      visitDuration: defaults.visitDuration,
      bestTimeToVisit: defaults.bestTimeToVisit,
      accessibility: defaults.accessibility,
    };
  }
}

