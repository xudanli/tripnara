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
   */
  async getCoordinates(query: string): Promise<AccurateGeocodeResult | null> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;

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
   */
  async searchComplexLocation(
    userInput: string,
  ): Promise<AccurateGeocodeResult | null> {
    this.logger.log(`Processing complex location query: ${userInput}`);

    try {
      // 1. 使用 AI 提取标准地名
      const standardName = await this.extractLocationNameWithAI(userInput);
      
      if (!standardName) {
        this.logger.warn(`Failed to extract location name from: ${userInput}`);
        return null;
      }

      this.logger.debug(`AI extracted location name: ${standardName}`);

      // 2. 使用标准地名调用 Mapbox
      const result = await this.getCoordinates(standardName);

      if (result) {
        this.logger.log(
          `Successfully geocoded "${userInput}" -> "${standardName}" -> (${result.location.lat}, ${result.location.lng})`,
        );
      } else {
        this.logger.warn(
          `Mapbox could not find coordinates for extracted name: ${standardName}`,
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
   */
  async smartSearch(
    query: string,
  ): Promise<AccurateGeocodeResult | null> {
    // 先尝试直接查询（快速路径）
    const directResult = await this.getCoordinates(query);
    
    if (directResult) {
      this.logger.debug(`Direct geocoding succeeded for: ${query}`);
      return directResult;
    }

    // 直接查询失败，尝试 AI 辅助（复杂路径）
    this.logger.debug(`Direct geocoding failed, trying AI-assisted search for: ${query}`);
    return this.searchComplexLocation(query);
  }

  /**
   * 使用 AI 从自然语言描述中提取标准地点名称
   */
  private async extractLocationNameWithAI(
    userInput: string,
  ): Promise<string | null> {
    try {
      const systemMessage = `你是一个地名提取助手。你的任务是从用户的自然语言描述中提取最可能的标准地点名称。

**规则**：
1. 直接返回标准地点名称，不要任何标点符号、解释或额外文字
2. 如果用户描述的是著名景点/地标，返回官方名称
3. 如果包含国家/城市信息，可以包含在名称中以提高准确性
4. 如果无法确定具体地点，返回空字符串

**示例**：
- 输入："那个有很多鹿的日本公园" -> 输出："奈良公园"
- 输入："哈佛大学附近的那个有名的红砖美术馆" -> 输出："哈佛艺术博物馆"
- 输入："巴黎那个铁塔" -> 输出："埃菲尔铁塔"
- 输入："东京那个看樱花的地方" -> 输出："上野公园"`;

      const response = await this.llmService.chatCompletion({
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userInput },
        ],
        temperature: 0.3, // 降低温度以提高准确性
        maxOutputTokens: 50, // 只需要地点名称，不需要太多 token
      });

      const extractedName = response.trim();
      
      // 如果返回空字符串或太短，认为提取失败
      if (!extractedName || extractedName.length < 2) {
        return null;
      }

      return extractedName;
    } catch (error) {
      this.logger.error('AI location name extraction failed', error);
      return null;
    }
  }
}

