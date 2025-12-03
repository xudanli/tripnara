import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LlmService } from '../../llm/llm.service';

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
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

export interface AccurateGeocodeResult {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  countryCode?: string;
  placeType?: string;
}

interface AIExtractionResult {
  standard_name: string | null;
  location_hint: string | null;
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class AccurateGeocodingService {
  private readonly logger = new Logger(AccurateGeocodingService.name);
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
  ) {
    this.baseUrl =
      this.configService.get<string>('MAPBOX_BASE_URL') ??
      'https://api.mapbox.com';
    this.accessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');

    if (!this.accessToken) {
      this.logger.warn('MAPBOX_ACCESS_TOKEN 未配置，准确地理编码功能将受限');
    }
  }

  /**
   * 基础方法：直接调用 Mapbox Geocoding API
   * 适用于标准地名查询
   * @param query 查询文本
   * @param locationHint 位置提示（城市、国家等），用于提高搜索准确度
   */
  async getCoordinates(
    query: string,
    locationHint?: string,
  ): Promise<AccurateGeocodeResult | null> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    // 如果有位置提示，拼接到查询中以提高准确度
    const mapboxQuery = locationHint
      ? `${query}, ${locationHint}`
      : query;

    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(mapboxQuery)}.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxGeocodeResponse>(url, {
          params: {
            access_token: this.accessToken,
            limit: 1,
            language: 'zh', // 返回中文结果
          },
        }),
      );

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        
        // Mapbox 返回的是 [lng, lat] (经度, 纬度)
        return {
          name: feature.text,
          address: feature.place_name,
          location: {
            lat: feature.center[1],
            lng: feature.center[0],
          },
          countryCode: feature.context?.find((c) => c.id.startsWith('country'))
            ?.short_code?.toUpperCase(),
          placeType: feature.id.split('.')[0],
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Mapbox geocoding failed', error);
      return null;
    }
  }

  /**
   * 进阶方法：结合 AI 处理复杂查询
   * 适用于自然语言描述的地点查询
   * 例如："那个有很多鹿的日本公园" -> "奈良公园" -> 坐标
   * @param userInput 用户输入的自然语言描述
   * @param context 位置上下文（行程目的地或当前城市）
   */
  async searchComplexLocation(
    userInput: string,
    context?: string,
  ): Promise<AccurateGeocodeResult | null> {
    this.logger.log(
      `Processing complex location query: ${userInput}${context ? ` (context: ${context})` : ''}`,
    );

    try {
      // 1. 使用 AI 提取标准地名和位置提示
      const aiResult = await this.extractLocationNameWithAI(userInput, context);
      
      if (!aiResult || !aiResult.standard_name) {
        this.logger.warn(`Failed to extract location name from: ${userInput}`);
        return null;
      }

      this.logger.debug(
        `AI extracted: name="${aiResult.standard_name}", hint="${aiResult.location_hint}", confidence=${aiResult.confidence}`,
      );

      // 2. 确定 Mapbox 查询的位置提示
      // 优先使用 AI 提取的 location_hint，其次使用传入的 context
      const locationHint = aiResult.location_hint || context;

      // 3. 使用标准地名和位置提示调用 Mapbox
      const result = await this.getCoordinates(
        aiResult.standard_name,
        locationHint,
      );

      if (result) {
        this.logger.log(
          `Successfully geocoded "${userInput}" -> "${aiResult.standard_name}" (hint: ${locationHint || 'none'}) -> (${result.location.lat}, ${result.location.lng})`,
        );
      } else {
        this.logger.warn(
          `Mapbox could not find coordinates for "${aiResult.standard_name}" with hint "${locationHint || 'none'}"`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Complex location search failed for: ${userInput}`, error);
      return null;
    }
  }

  /**
   * 智能搜索：自动判断是否需要 AI 处理
   * 如果直接 Mapbox 查询失败，则尝试 AI 提取后再查询
   * @param query 查询文本
   * @param context 位置上下文（行程目的地或当前城市）
   */
  async smartSearch(
    query: string,
    context?: string,
  ): Promise<AccurateGeocodeResult | null> {
    // 先尝试直接查询（快速路径）
    // 如果有 context，也尝试拼接查询
    const directResult = context
      ? await this.getCoordinates(query, context) || await this.getCoordinates(query)
      : await this.getCoordinates(query);
    
    if (directResult) {
      this.logger.debug(`Direct geocoding succeeded for: ${query}`);
      return directResult;
    }

    // 直接查询失败，尝试 AI 辅助（复杂路径）
    this.logger.debug(
      `Direct geocoding failed, trying AI-assisted search for: ${query}${context ? ` (context: ${context})` : ''}`,
    );
    return this.searchComplexLocation(query, context);
  }

  /**
   * 使用 AI 从自然语言描述中提取标准地点名称和位置提示
   * @param userInput 用户输入的自然语言描述
   * @param context 位置上下文（行程目的地或当前城市）
   */
  private async extractLocationNameWithAI(
    userInput: string,
    context?: string,
  ): Promise<AIExtractionResult | null> {
    try {
      const systemMessage = `你是一个地理位置意图识别专家 (Geo-Intent Resolver)。

你的任务是将用户的自然语言描述转换为最可能的**标准地名**和**位置线索**。

【输入】
用户的模糊描述（可能包含形容词、别名、或者"附近的"等相对位置）。

【输出要求】
必须返回严格的 JSON 格式，包含以下字段：
- "standard_name": (string | null) 地点的官方标准名称（用于地图搜索）。如果无法确定具体地点，返回 null。
- "location_hint": (string | null) 隐含的城市、国家或区域信息。如果无法确定，返回 null。
- "confidence": (string) "high" | "medium" | "low"。

【规则】
1. 去除无用的修饰词（如"那个"、"网红"、"很多人的"）。
2. 修正错别字或口语化称呼（如"川普大楼"->"特朗普大厦"）。
3. 如果用户描述的是一类地点（如"附近的加油站"），standard_name 返回类别关键词（如"加油站"）。
4. 如果完全无法识别具体地点，standard_name 返回 null。
5. location_hint 应该包含城市、国家或区域信息，格式如"奈良, 日本"或"Cambridge, MA, USA"。

【示例】
User: "那个有很多鹿的日本公园"
Assistant: {"standard_name": "奈良公园", "location_hint": "奈良, 日本", "confidence": "high"}

User: "哈佛大学附近的那个有名的红砖美术馆"
Assistant: {"standard_name": "哈佛艺术博物馆", "location_hint": "Cambridge, MA, USA", "confidence": "high"}

User: "巴黎那个铁塔"
Assistant: {"standard_name": "埃菲尔铁塔", "location_hint": "巴黎, 法国", "confidence": "high"}

User: "冰岛看钻石的地方"
Assistant: {"standard_name": "钻石沙滩", "location_hint": "冰岛", "confidence": "medium"}`;

      // 构建用户消息，包含上下文信息
      let userMessage = `描述: ${userInput}`;
      if (context) {
        userMessage += `\n当前行程背景: ${context}`;
      } else {
        userMessage += `\n当前行程背景: 未知`;
      }

      const response = await this.llmService.chatCompletionJson<AIExtractionResult>(
        await this.llmService.buildChatCompletionOptions({
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1, // 降低温度以提高准确性（事实提取任务）
          maxOutputTokens: 100, // JSON 稍微占点字符
          json: true,
          provider: 'deepseek', // 明确使用 DeepSeek（适合结构化 JSON 输出）
          model: 'deepseek-chat', // DeepSeek-V3 模型
          // 注意：此服务没有用户上下文，明确指定 provider 避免使用错误的默认配置
        }),
      );

      // 验证响应
      if (!response || typeof response !== 'object') {
        this.logger.warn('AI returned invalid response format');
        return null;
      }

      if (!response.standard_name || response.standard_name.length < 2) {
        this.logger.debug('AI could not extract valid location name');
        return {
          standard_name: null,
          location_hint: response.location_hint || null,
          confidence: response.confidence || 'low',
        };
      }

      return {
        standard_name: response.standard_name,
        location_hint: response.location_hint || null,
        confidence: response.confidence || 'medium',
      };
    } catch (error) {
      this.logger.error('AI location name extraction failed', error);
      return null;
    }
  }
}

