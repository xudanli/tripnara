import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { LlmService } from '../../llm/llm.service';
import { PreferencesService } from '../../preferences/preferences.service';
import { CurrencyService } from '../../currency/currency.service';
import { InspirationService } from '../../inspiration/inspiration.service';
import { PromptService } from './prompt.service';
import {
  GenerateItineraryRequestDto,
  GenerateItineraryResponseDto,
  ItineraryDataDto,
} from '../dto/itinerary.dto';
import { DataValidator } from '../../../utils/dataValidator';
import { CostCalculator } from '../../../utils/costCalculator';

interface AiItineraryResponse {
  days: Array<{
    day: number;
    date: string;
    activities: Array<{
      time: string;
      title: string;
      type: string;
      duration?: number;
      location?: unknown;
      notes?: string;
      cost?: number;
      details?: {
        highlights?: string[];
        insiderTip?: string;
        bookingSignal?: string;
        [key: string]: unknown;
      };
    }>;
  }>;
  totalCost?: number | string;
  summary?: string;
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class ItineraryGenerationService {
  private readonly logger = new Logger(ItineraryGenerationService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly preferencesService: PreferencesService,
    private readonly currencyService: CurrencyService,
    private readonly inspirationService: InspirationService,
    private readonly promptService: PromptService,
  ) {}

  async generateItinerary(
    dto: GenerateItineraryRequestDto,
    userId?: string,
  ): Promise<GenerateItineraryResponseDto> {
    try {
      let destination = dto.destination;

      // 如果没有提供目的地，但有其他信息，先推荐目的地
      if (!destination) {
        destination = await this.recommendDestination(dto);
      }

      // 获取用户偏好并合并
      const mergedPreferences = await this.getMergedPreferences(dto, userId);

      // 构建偏好文本和指导
      const preferenceText = this.buildPreferenceText(mergedPreferences);
      const preferenceGuidance = this.buildPreferenceGuidance(mergedPreferences);
      const dateInstructions = this.buildDateInstructions(
        dto.startDate,
        dto.days,
      );

      // 构建AI提示词
      const systemMessage =
        this.promptService.buildItineraryGenerationSystemMessage();
      const prompt = this.promptService.buildItineraryGenerationUserPrompt({
        destination,
        days: dto.days,
        preferenceText,
        preferenceGuidance,
        dateInstructions,
        startDate: dto.startDate,
        intent: dto.intent,
      });

      this.logger.debug(
        `Prompt length: ${prompt.length} characters for ${dto.days} days`,
      );

      // 性能优化：提前并行执行货币推断（如果目的地已知）
      // 这样可以在 LLM 生成行程的同时进行货币推断，减少总耗时
      const currencyPromise = this.currencyService.inferCurrency({
        destination: destination,
        // 暂时没有坐标，使用目的地名称推断
        coordinates: undefined,
      });

      // 调用AI生成行程
      this.logger.log(
        `Generating itinerary for destination: ${destination}, days: ${dto.days}`,
      );

      const startTime = Date.now();
      let aiResponse: AiItineraryResponse;

      try {
        aiResponse = await this.llmService.chatCompletionJson<AiItineraryResponse>(
          {
            provider: 'deepseek',
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            maxOutputTokens: 8000,
            json: true,
          },
        );

        const duration = Date.now() - startTime;
        this.logger.log(
          `Itinerary generation completed in ${duration}ms for ${destination}`,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `LLM request failed after ${duration}ms for ${destination}`,
          error,
        );

        if (
          error instanceof Error &&
          (error.message.includes('timeout') ||
            error.message.includes('ETIMEDOUT') ||
            duration > 300000)
        ) {
          throw new BadRequestException(
            `行程生成超时（${Math.round(duration / 1000)}秒）。请稍后重试，或减少行程天数。`,
          );
        }

        throw new BadRequestException(
          `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        );
      }

      // 验证和转换响应
      const itineraryData = this.validateAndTransformResponse(
        aiResponse,
        dto.days,
      );

      // 性能优化：如果行程中有坐标，使用坐标重新推断货币（更准确）
      // 否则使用之前并行推断的结果
      let currency;
      if (itineraryData.days?.[0]?.activities?.[0]?.location) {
        // 有坐标，使用坐标重新推断（更准确）
        currency = await this.currencyService.inferCurrency({
          destination: destination,
          coordinates: {
            lat: itineraryData.days[0].activities[0].location.lat,
            lng: itineraryData.days[0].activities[0].location.lng,
          },
        });
      } else {
        // 没有坐标，使用之前并行推断的结果
        currency = await currencyPromise;
      }

      // 为行程数据添加货币信息
      const itineraryDataWithCurrency = {
        ...itineraryData,
        currency: currency.code,
        currencyInfo: currency,
      };

      return {
        success: true,
        data: itineraryDataWithCurrency,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate itinerary for ${dto.destination}`,
        error,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : '未知错误';

      throw new BadRequestException(
        `行程生成失败: ${errorMessage}。请检查网络连接或稍后重试。`,
      );
    }
  }

  /**
   * 推荐目的地
   */
  private async recommendDestination(
    dto: GenerateItineraryRequestDto,
  ): Promise<string> {
    this.logger.log(
      'Destination not provided, recommending destinations based on other information',
    );

    let inputText = '';
    if (dto.intent?.description) {
      inputText = dto.intent.description;
    } else if (dto.intent?.keywords && dto.intent.keywords.length > 0) {
      inputText = dto.intent.keywords.join('、');
    } else if (
      dto.preferences?.interests &&
      dto.preferences.interests.length > 0
    ) {
      inputText = `我想去一个${dto.preferences.interests.join('、')}的地方`;
    } else {
      inputText = `我想去一个适合${dto.days}天旅行的地方`;
    }

    const recommendResult = await this.inspirationService.recommendDestinations({
      input: inputText,
      intent: dto.intent
        ? {
            intentType: dto.intent.intentType,
            keywords: dto.intent.keywords,
            emotionTone: dto.intent.emotionTone,
          }
        : undefined,
      language: 'zh-CN',
      limit: 1,
    });

    if (
      recommendResult.success &&
      recommendResult.data.locations &&
      recommendResult.data.locations.length > 0
    ) {
      const destination = recommendResult.data.locations[0];
      this.logger.log(`Using recommended destination: ${destination}`);
      return destination;
    }

    throw new BadRequestException(
      '无法根据提供的信息推荐目的地，请提供具体的目的地名称',
    );
  }

  /**
   * 获取合并后的用户偏好
   */
  private async getMergedPreferences(
    dto: GenerateItineraryRequestDto,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    const userPreferences = userId
      ? await this.preferencesService.getPreferences(userId)
      : {};

    return {
      ...userPreferences,
      ...dto.preferences,
    };
  }

  /**
   * 构建偏好文本
   */
  private buildPreferenceText(
    preferences: Record<string, unknown>,
  ): string {
    const parts: string[] = [];

    if (preferences.interests && Array.isArray(preferences.interests)) {
      parts.push(`兴趣：${preferences.interests.join('、')}`);
    }

    if (preferences.budget) {
      const budgetMap: Record<string, string> = {
        low: '经济型',
        medium: '中等',
        high: '豪华型',
      };
      parts.push(
        `预算：${budgetMap[preferences.budget as string] || preferences.budget}`,
      );
    }

    if (preferences.travelStyle) {
      const styleMap: Record<string, string> = {
        relaxed: '轻松休闲',
        moderate: '适中节奏',
        intensive: '紧凑充实',
      };
      parts.push(
        `旅行风格：${styleMap[preferences.travelStyle as string] || preferences.travelStyle}`,
      );
    }

    return parts.length > 0 ? parts.join('，') : '无特殊偏好';
  }

  /**
   * 构建偏好指导
   */
  private buildPreferenceGuidance(
    preferences: Record<string, unknown>,
  ): string {
    const guidance: string[] = [];

    if (preferences.interests && Array.isArray(preferences.interests)) {
      guidance.push(
        `请重点安排与${preferences.interests.join('、')}相关的活动和景点`,
      );
    }

    if (preferences.budget === 'low') {
      guidance.push('优先选择性价比高的景点和餐厅，控制整体费用');
    } else if (preferences.budget === 'high') {
      guidance.push('可以选择高端景点、特色餐厅和优质体验');
    }

    if (preferences.travelStyle === 'relaxed') {
      guidance.push('时间安排要宽松，留出充足的休息和自由活动时间');
    } else if (preferences.travelStyle === 'intensive') {
      guidance.push('可以安排更多活动，充分利用每一天的时间');
    }

    return guidance.length > 0 ? guidance.join('；') : '';
  }

  /**
   * 构建日期说明
   */
  private buildDateInstructions(startDate: string, days: number): string {
    const start = new Date(startDate);
    const dates: string[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      dates.push(
        `第${i + 1}天：${currentDate.toISOString().split('T')[0]}`,
      );
    }

    return `日期安排：\n${dates.join('\n')}`;
  }

  /**
   * 验证并转换每一天的数据
   */
  private transformDays(
    days: AiItineraryResponse['days'],
  ): ItineraryDataDto['days'] {
    return days.map((day, index) => {
      if (day.day !== index + 1) {
        this.logger.warn(
          `Day number mismatch: expected ${index + 1}, got ${day.day}`,
        );
      }

      if (!day.activities || !Array.isArray(day.activities)) {
        throw new Error(`第${day.day}天的activities字段格式不正确`);
      }

      const fixedDate = DataValidator.fixDate(day.date);
      const fixedDay = DataValidator.fixNumber(day.day, index + 1, 1);

      return {
        day: fixedDay,
        date: fixedDate,
        activities: day.activities.map((act, actIndex) => {
          if (!act.time || !act.title || !act.type) {
            throw new Error(
              `第${day.day}天第${actIndex + 1}个活动缺少必要字段（time、title或type）`,
            );
          }

          let location = DataValidator.normalizeLocation(
            act.location,
            {
              activityTitle: act.title || '未知活动',
              day: day.day,
              activityIndex: actIndex + 1,
              logger: this.logger,
            },
          );
          if (!location) {
            location = DataValidator.getDefaultLocation();
          }

          return {
            time: DataValidator.fixTime(act.time, '09:00'),
            title: DataValidator.fixString(act.title, '未命名活动'),
            type: DataValidator.fixActivityType(act.type, 'attraction') as
              | 'attraction'
              | 'meal'
              | 'hotel'
              | 'shopping'
              | 'transport'
              | 'ocean',
            duration: DataValidator.fixNumber(act.duration, 60, 1),
            location,
            notes: DataValidator.fixString(act.notes, ''),
            cost: DataValidator.fixNumber(act.cost, 0, 0),
            details: (act as any).details,
          };
        }),
      };
    });
  }


  /**
   * 验证和转换AI响应
   */
  private validateAndTransformResponse(
    aiResponse: AiItineraryResponse,
    expectedDays?: number,
  ): ItineraryDataDto {
    // 验证响应结构
    if (!aiResponse.days || !Array.isArray(aiResponse.days)) {
      throw new Error('AI响应缺少days字段或格式不正确');
    }

    // 验证天数
    if (expectedDays !== undefined && aiResponse.days.length !== expectedDays) {
      this.logger.warn(
        `AI返回的天数不匹配: 期望 ${expectedDays} 天，实际返回 ${aiResponse.days.length} 天`,
      );
      if (aiResponse.days.length < expectedDays) {
        throw new Error(
          `AI返回的行程不完整: 期望 ${expectedDays} 天，但只返回了 ${aiResponse.days.length} 天。可能是 token 限制导致响应被截断，请重试或减少行程天数。`,
        );
      }
      if (aiResponse.days.length > expectedDays) {
        this.logger.warn(
          `AI返回了 ${aiResponse.days.length} 天，但期望 ${expectedDays} 天，将只取前 ${expectedDays} 天`,
        );
        aiResponse.days = aiResponse.days.slice(0, expectedDays);
      }
    }

    // 验证并修复 totalCost
    const totalCost = DataValidator.fixNumber(aiResponse.totalCost, 0, 0);

    // 验证并修复 summary
    const summary = DataValidator.fixString(aiResponse.summary, '');

    // 验证并转换每一天的数据
    const validatedDays = this.transformDays(aiResponse.days);

    // 处理实用信息
    const practicalInfo = aiResponse.practicalInfo || {};

    // 构建行程数据对象
    const itineraryData: ItineraryDataDto = {
      days: validatedDays,
      totalCost,
      summary,
      practicalInfo:
        Object.keys(practicalInfo).length > 0 ? practicalInfo : undefined,
    };

    // 自动计算总费用（覆盖 AI 返回的值，确保准确性）
    const calculatedTotalCost = CostCalculator.calculateTotalCost(itineraryData);

    return {
      days: validatedDays,
      totalCost:
        calculatedTotalCost > 0 ? calculatedTotalCost : totalCost, // 如果计算出的费用为0，保留AI返回的值
      summary,
      practicalInfo: itineraryData.practicalInfo, // 返回实用信息
    };
  }
}

