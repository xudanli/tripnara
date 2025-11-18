import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
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

  constructor(
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  async generateLocationInfo(
    dto: GenerateLocationRequestDto,
  ): Promise<LocationInfoDto> {
    // 检查缓存
    const cacheKey = this.getCacheKey(
      dto.activityName,
      dto.destination,
      dto.activityType,
    );
    const cached = this.getFromCache(cacheKey);
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

      // 保存到缓存
      this.setCache(cacheKey, locationInfo);
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
    const results: BatchLocationResultDto[] = [];

    for (const activity of activities) {
      try {
        const locationInfo = await this.generateLocationInfo({
          activityName: activity.activityName,
          destination: activity.destination,
          activityType: activity.activityType,
          coordinates: activity.coordinates,
        });

        results.push({
          activityName: activity.activityName,
          locationInfo,
        });
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
        results.push({
          activityName: activity.activityName,
          locationInfo: defaultInfo,
        });
      }
    }

    return results;
  }

  private getCacheKey(
    activityName: string,
    destination: string,
    activityType: string,
  ): string {
    return `${activityName}-${destination}-${activityType}`.toLowerCase();
  }

  private getFromCache(key: string): LocationInfoDto | null {
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

  private setCache(key: string, value: LocationInfoDto): void {
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

    return `你是一个专业的旅行助手，请为以下活动生成详细且具体的位置信息：

活动名称：${activityName}
目的地：${destination}
活动类型：${activityType}
坐标：${coordinates.lat}, ${coordinates.lng}
区域：${coordinates.region || '市中心区域'}
主要语言：${languageText}

**重要提醒：位置信息必须与活动名称完全匹配！**

例如：
- 如果活动是"珊瑚礁浮潜与观鲸"，位置应该是海洋区域、海滩、潜水中心等
- 如果活动是"历史博物馆参观"，位置应该是博物馆、历史文化区等
- 如果活动是"当地美食体验"，位置应该是餐厅、美食街、市场等

请提供以下详细信息：

1. 准确的中文名称和当地语言名称（必须与活动内容匹配）
2. 具体的街道地址（包含门牌号或地标建筑）
3. 详细的交通方式（地铁站名、公交线路、步行路线）
4. 准确的开放时间和最佳游览时间
5. 详细的门票价格和优惠政策
6. 实用的游览建议和注意事项
7. 周边推荐和联系方式

请以JSON格式返回：

{
  "chineseName": "准确的中文名称（必须与活动内容匹配）",
  "localName": "当地语言名称",
  "chineseAddress": "具体街道地址，包含门牌号或地标",
  "localAddress": "当地语言详细地址",
  "transportInfo": "详细交通信息：地铁站名、公交线路、步行时间",
  "openingHours": "准确开放时间，包含休息日信息",
  "ticketPrice": "详细价格信息，包含优惠和套票",
  "visitTips": "实用游览建议：最佳时间、注意事项、游览时长",
  "nearbyAttractions": "周边推荐景点或设施",
  "contactInfo": "联系方式或官网",
  "category": "具体景点类型（必须与活动类型匹配）",
  "rating": 评分(1-5),
  "visitDuration": "建议游览时长（分钟）",
  "bestTimeToVisit": "最佳游览时间",
  "accessibility": "无障碍设施信息"
}

请确保：
- 位置名称和地址必须与活动内容完全匹配
- 地址具体到街道和门牌号
- 交通信息包含具体的地铁站名和出口
- 开放时间准确且包含特殊情况
- 价格信息详细且包含优惠信息
- 游览建议实用且具体`;
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

