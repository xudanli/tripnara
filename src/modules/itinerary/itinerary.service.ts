import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ItineraryRepository } from '../persistence/repositories/itinerary/itinerary.repository';
import { JourneyTemplateRepository } from '../persistence/repositories/journey-template/journey-template.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreparationProfileEntity } from '../persistence/entities/reference.entity';
import { AiSafetyNoticeCacheEntity } from '../persistence/entities/ai-log.entity';
import * as crypto from 'crypto';
import { DataValidator } from '../../utils/dataValidator';
import { CostCalculator } from '../../utils/costCalculator';
import { CurrencyService } from '../currency/currency.service';
import {
  GenerateItineraryRequestDto,
  GenerateItineraryResponseDto,
  ItineraryDataDto,
  CreateItineraryRequestDto,
  UpdateItineraryRequestDto,
  CreateItineraryResponseDto,
  UpdateItineraryResponseDto,
  DeleteItineraryResponseDto,
  ItineraryListResponseDto,
  ItineraryDetailResponseDto,
  ItineraryListItemDto,
  ItineraryDetailDto,
  ItineraryDetailWithTimeSlotsDto,
  CreateItineraryFromFrontendDataDto,
  UpdateItineraryFromFrontendDataDto,
  ItineraryTimeSlotDto,
  ItineraryActivityDto,
  ItineraryDayDto,
  ItineraryDayWithTimeSlotsDto,
  CreateItineraryTemplateDto,
  CreateItineraryTemplateResponseDto,
  ItineraryDataWithTimeSlotsDto,
  TaskDto,
  ItineraryTemplateQueryDto,
  ItineraryTemplateListResponseDto,
  ItineraryTemplateListItemDto,
  ItineraryTemplateDetailResponseDto,
  UpdateItineraryTemplateDto,
  UpdateItineraryTemplateResponseDto,
  DeleteItineraryTemplateResponseDto,
  PublishItineraryTemplateResponseDto,
  CloneItineraryTemplateResponseDto,
  CloneJourneyResponseDto,
  ShareJourneyRequestDto,
  ShareJourneyResponseDto,
  ExportJourneyRequestDto,
  ExportJourneyResponseDto,
  ResetJourneyRequestDto,
  ResetJourneyResponseDto,
  TaskListResponseDto,
  SyncTasksRequestDto,
  SyncTasksResponseDto,
  UpdateTaskRequestDto,
  UpdateTaskResponseDto,
  CreateTaskRequestDto,
  CreateTaskResponseDto,
  DeleteTaskResponseDto,
  PreparationProfileListResponseDto,
  PreparationProfileDetailResponseDto,
  CreatePreparationProfileRequestDto,
  CreatePreparationProfileResponseDto,
  GenerateSafetyNoticeRequestDto,
  GenerateSafetyNoticeResponseDto,
  GetSafetyNoticeResponseDto,
  SafetyNoticeDto,
  ExpenseDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  GetExpenseListResponseDto,
  CreateExpenseResponseDto,
  UpdateExpenseResponseDto,
  DeleteExpenseResponseDto,
} from './dto/itinerary.dto';
import {
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
} from '../persistence/entities/itinerary.entity';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../persistence/entities/journey-template.entity';

interface AiItineraryResponse {
  days: Array<{
    day: number;
    date: string;
    activities: Array<{
      time: string;
      title: string;
      type: string;
      duration?: number;
      location?: unknown; // LLM可能返回各种格式，使用unknown类型
      notes?: string;
      cost?: number;
    }>;
  }>;
  totalCost?: number | string; // 支持数字或字符串
  summary?: string;
}

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly preferencesService: PreferencesService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly templateRepository: JourneyTemplateRepository,
    private readonly currencyService: CurrencyService,
    @InjectRepository(PreparationProfileEntity)
    private readonly preparationProfileRepository: Repository<PreparationProfileEntity>,
    @InjectRepository(AiSafetyNoticeCacheEntity)
    private readonly safetyNoticeCacheRepository: Repository<AiSafetyNoticeCacheEntity>,
  ) {}

  async generateItinerary(
    dto: GenerateItineraryRequestDto,
    userId?: string,
  ): Promise<GenerateItineraryResponseDto> {
    try {
      // 获取用户偏好（如果提供了userId）
      const userPreferences = userId
        ? await this.preferencesService.getPreferences(userId)
        : {};

      // 合并请求中的偏好和用户保存的偏好
      const mergedPreferences = {
        ...userPreferences,
        ...dto.preferences,
      };

      // 构建偏好文本
      const preferenceText = this.buildPreferenceText(mergedPreferences);
      const preferenceGuidance = this.buildPreferenceGuidance(mergedPreferences);

      // 构建日期说明
      const dateInstructions = this.buildDateInstructions(
        dto.startDate,
        dto.days,
      );

      // 构建AI提示词
      const systemMessage =
        '你是一个专业的旅行规划师和创意文案师，擅长制定详细、实用的旅行行程，并为每个活动设计生动有趣的标题。请始终以纯JSON格式返回数据，不要添加任何额外的文字说明或解释，确保标题富有创意和吸引力。';

      const prompt = this.buildUserPrompt(
        dto.destination,
        dto.days,
        preferenceText,
        preferenceGuidance,
        dateInstructions,
        dto.startDate,
      );

      // 记录提示词长度（用于调试）
      this.logger.debug(
        `Prompt length: ${prompt.length} characters for ${dto.days} days`,
      );

      // 调用AI生成行程
      this.logger.log(
        `Generating itinerary for destination: ${dto.destination}, days: ${dto.days}`,
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
            maxOutputTokens: 4000, // 增加token限制，支持更详细的行程
            json: true,
          },
        );

        const duration = Date.now() - startTime;
        this.logger.log(
          `Itinerary generation completed in ${duration}ms for ${dto.destination}`,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `LLM request failed after ${duration}ms for ${dto.destination}`,
          error,
        );

        // 检查是否是超时错误（5分钟 = 300秒）
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

        // 其他错误
        throw new BadRequestException(
          `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        );
      }

      // 验证和转换响应
      const itineraryData = this.validateAndTransformResponse(aiResponse);

      // 自动推断货币
      const currency = await this.currencyService.inferCurrency({
        destination: dto.destination,
        // 如果有坐标信息，也可以传入（从第一个活动的坐标推断）
        coordinates:
          itineraryData.days?.[0]?.activities?.[0]?.location
            ? {
                lat: itineraryData.days[0].activities[0].location.lat,
                lng: itineraryData.days[0].activities[0].location.lng,
              }
            : undefined,
      });

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

      // 如果是 BadRequestException，直接抛出（已经包含详细错误信息）
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 其他错误，提供友好的错误信息
      const errorMessage =
        error instanceof Error ? error.message : '未知错误';
      
      throw new BadRequestException(
        `行程生成失败: ${errorMessage}。请检查网络连接或稍后重试。`,
      );
    }
  }

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
      parts.push(`预算：${budgetMap[preferences.budget as string] || preferences.budget}`);
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

  private buildUserPrompt(
    destination: string,
    days: number,
    preferenceText: string,
    preferenceGuidance: string,
    dateInstructions: string,
    startDate: string,
  ): string {
    return `你是一个专业的旅行规划师和创意文案师。请为以下需求生成详细且富有吸引力的旅行行程：

目的地：${destination}
天数：${days}天
用户偏好：${preferenceText}
偏好具体要求：${preferenceGuidance}

${dateInstructions}

请按照以下格式返回JSON数据：

{
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "activities": [
        {
          "time": "09:00",
          "title": "富有创意的活动标题",
          "type": "attraction",
          "duration": 120,
          "location": {"lat": 34.9949, "lng": 135.7850},
          "notes": "详细的游览建议和体验描述",
          "cost": 400
        }
      ]
    }
  ],
  "totalCost": 8000,
  "summary": "行程摘要"
}

重要要求：

1. 活动标题要生动有趣，避免"经典景点游览"、"当地特色美食"等通用词汇

2. 景点标题要具体化，如"探秘千年古寺"、"漫步胡杨林金色海洋"、"登顶观日出云海"

3. 美食标题要有诱惑力，如"品味正宗手扒羊肉"、"邂逅蒙古奶茶的醇香"、"寻味街头巷尾小吃"

4. 活动类型包括：attraction（景点）、meal（餐饮）、hotel（住宿）、shopping（购物）、transport（交通）

5. 请确保行程合理，时间安排紧凑但不紧张，包含当地特色景点和美食

6. 每个活动的notes要详细描述体验内容和实用建议

7. 请务必严格按照JSON格式返回，不要添加任何额外的文字说明

注意：请确保返回完整的JSON数据，包含所有${days}天的行程安排。`;
  }

  /**
   * 尝试将location字段转换为标准的{lat, lng}格式
   * 支持多种输入格式：数字、字符串、对象等
   */
  private normalizeLocation(
    location: unknown,
    activityTitle: string,
    day: number,
    activityIndex: number,
  ): { lat: number; lng: number } | null {
    // 如果location为空或undefined
    if (!location || typeof location !== 'object') {
      this.logger.warn(
        `第${day}天第${activityIndex + 1}个活动"${activityTitle}"的location字段缺失或格式不正确: ${JSON.stringify(location)}，使用默认坐标`,
      );
      return null;
    }

    // 尝试从对象中提取lat和lng
    const locObj = location as Record<string, unknown>;
    let lat: number | null = null;
    let lng: number | null = null;

    // 尝试获取lat（支持lat、latitude等字段名）
    const latValue =
      locObj.lat ?? locObj.latitude ?? locObj.Lat ?? locObj.Latitude;
    if (latValue !== undefined && latValue !== null) {
      if (typeof latValue === 'number') {
        lat = latValue;
      } else if (typeof latValue === 'string') {
        const parsed = parseFloat(latValue);
        if (!isNaN(parsed)) {
          lat = parsed;
        }
      }
    }

    // 尝试获取lng（支持lng、lng、longitude等字段名）
    const lngValue =
      locObj.lng ??
      locObj.longitude ??
      locObj.Lng ??
      locObj.Longitude ??
      locObj.lon;
    if (lngValue !== undefined && lngValue !== null) {
      if (typeof lngValue === 'number') {
        lng = lngValue;
      } else if (typeof lngValue === 'string') {
        const parsed = parseFloat(lngValue);
        if (!isNaN(parsed)) {
          lng = parsed;
        }
      }
    }

    // 验证坐标范围
    if (lat !== null && lng !== null) {
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      } else {
        this.logger.warn(
          `第${day}天第${activityIndex + 1}个活动"${activityTitle}"的location坐标超出有效范围: lat=${lat}, lng=${lng}，使用默认坐标`,
        );
        return null;
      }
    }

    // 如果无法解析，记录警告并返回null
    this.logger.warn(
      `第${day}天第${activityIndex + 1}个活动"${activityTitle}"的location字段格式不正确: ${JSON.stringify(location)}，使用默认坐标`,
    );
    return null;
  }

  /**
   * 获取默认坐标（基于目的地或通用默认值）
   * 这里返回一个通用默认值，实际应用中可以根据destination进行地理编码
   */
  private getDefaultLocation(): { lat: number; lng: number } {
    // 返回一个默认坐标（可以后续改进为根据destination进行地理编码）
    // 这里使用冰岛的默认坐标作为fallback
    return { lat: 64.9631, lng: -19.0208 };
  }

  /**
   * 重新计算并更新行程总费用（公共方法，供接口调用）
   * @param journeyId 行程ID
   * @param userId 用户ID（用于权限检查）
   * @returns 新的总费用
   */
  async recalculateJourneyTotalCost(
    journeyId: string,
    userId?: string,
  ): Promise<number> {
    // 检查所有权（如果提供了 userId）
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }
    }

    return await this.recalculateAndUpdateTotalCost(journeyId);
  }

  /**
   * 重新计算并更新行程总费用（内部方法）
   * @param journeyId 行程ID
   * @returns 新的总费用
   */
  private async recalculateAndUpdateTotalCost(journeyId: string): Promise<number> {
    // 获取完整的行程数据（包含 days 和 activities）
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      this.logger.warn(`行程不存在，无法重新计算总费用: ${journeyId}`);
      return 0;
    }

    // 转换为 DTO 格式以便计算
    const itineraryDto = this.entityToDetailDto(itinerary);
    
    // 计算总费用
    const newTotalCost = CostCalculator.calculateTotalCost(itineraryDto);

    // 更新数据库中的总费用
    await this.itineraryRepository.updateItineraryWithDays(journeyId, {
      totalCost: newTotalCost,
    });

    this.logger.debug(
      `重新计算行程 ${journeyId} 的总费用: ${newTotalCost}`,
    );

    return newTotalCost;
  }

  private validateAndTransformResponse(
    aiResponse: AiItineraryResponse,
  ): ItineraryDataDto {
    // 验证响应结构
    if (!aiResponse.days || !Array.isArray(aiResponse.days)) {
      throw new Error('AI响应缺少days字段或格式不正确');
    }

    // 验证并修复 totalCost：使用 DataValidator 确保始终是数字类型
    const totalCost = DataValidator.fixNumber(aiResponse.totalCost, 0, 0);

    // 验证并修复 summary：使用 DataValidator 确保始终是字符串类型
    const summary = DataValidator.fixString(aiResponse.summary, '');

    // 验证并转换每一天的数据
    const validatedDays = aiResponse.days.map((day, index) => {
      if (day.day !== index + 1) {
        this.logger.warn(
          `Day number mismatch: expected ${index + 1}, got ${day.day}`,
        );
      }

      if (!day.activities || !Array.isArray(day.activities)) {
        throw new Error(`第${day.day}天的activities字段格式不正确`);
      }

      // 修复日期格式
      const fixedDate = DataValidator.fixDate(day.date);
      
      // 修复天数：确保是正整数，从1开始
      const fixedDay = DataValidator.fixNumber(day.day, index + 1, 1);

      return {
        day: fixedDay,
        date: fixedDate,
        activities: day.activities.map((act, actIndex) => {
          // 验证必要字段
          if (!act.time || !act.title || !act.type) {
          throw new Error(
              `第${day.day}天第${actIndex + 1}个活动缺少必要字段（time、title或type）`,
            );
          }

          // 规范化location字段，如果无效则使用默认值
          let location = this.normalizeLocation(
            act.location,
            act.title || '未知活动',
            day.day,
            actIndex + 1,
          );
          if (!location) {
            location = this.getDefaultLocation();
          }

          // 使用 DataValidator 修复所有字段
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
            duration: DataValidator.fixNumber(act.duration, 60, 1), // 至少1分钟
            location,
            notes: DataValidator.fixString(act.notes, ''),
            cost: DataValidator.fixNumber(act.cost, 0, 0),
          details: (act as any).details,
          };
        }),
      };
    });

    // 构建行程数据对象
    const itineraryData: ItineraryDataDto = {
      days: validatedDays,
      totalCost,
      summary,
    };

    // 自动计算总费用（覆盖 AI 返回的值，确保准确性）
    const calculatedTotalCost = CostCalculator.calculateTotalCost(itineraryData);
    
    return {
      days: validatedDays,
      totalCost: calculatedTotalCost > 0 ? calculatedTotalCost : totalCost, // 如果计算出的费用为0，保留AI返回的值
      summary,
    };
  }

  // CRUD 方法
  async createItinerary(
    dto: CreateItineraryRequestDto,
    userId?: string,
  ): Promise<CreateItineraryResponseDto> {
    try {
      // 验证必要字段
      if (!dto.data || !Array.isArray(dto.data.days)) {
        throw new BadRequestException('行程数据格式不正确：缺少 days 数组');
      }

      if (!dto.data.days.length) {
        throw new BadRequestException('行程数据不能为空：至少需要一天的行程');
      }

      // 安全地解析日期
      const parseDate = (dateString: string): Date => {
        if (!dateString) {
          throw new BadRequestException(`日期字段不能为空`);
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new BadRequestException(`日期格式不正确: ${dateString}`);
        }
        return date;
      };

    const totalActivities = dto.data.days.reduce((sum, d) => sum + (d.activities?.length || 0), 0);
    this.logger.log(
      `Creating itinerary with ${dto.data.days.length} days, total activities: ${totalActivities}`,
    );
    
    // 详细日志：记录每个 day 的信息
    dto.data.days.forEach((day, index) => {
      this.logger.debug(
        `Day ${index + 1}: day=${day.day}, date=${day.date}, activities=${day.activities?.length || 0}`,
      );
    });

    // 使用 DataValidator 修复总费用和摘要
    const fixedSummary = DataValidator.fixString(dto.data.summary, '');

    // 准备行程数据用于计算总费用
    const itineraryDataForCalculation = {
      days: dto.data.days.map((day) => ({
        activities: (day.activities || []).map((act) => ({
          cost: DataValidator.fixNumber(act.cost, 0, 0),
          details: act.details,
          estimatedCost: (act as any).estimatedCost,
        })),
      })),
    };

    // 使用 CostCalculator 自动计算总费用
    const calculatedTotalCost = CostCalculator.calculateTotalCost(itineraryDataForCalculation);

    const itinerary = await this.itineraryRepository.createItinerary({
      userId,
      destination: dto.destination,
        startDate: parseDate(dto.startDate),
      daysCount: dto.days,
      summary: fixedSummary,
      totalCost: calculatedTotalCost, // 使用计算出的总费用
      preferences: dto.preferences as Record<string, unknown>,
      status: dto.status || 'draft',
      daysData: dto.data.days.map((day, index) => ({
        day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
        date: parseDate(DataValidator.fixDate(day.date)), // 先修复日期格式，再解析
          activities: (day.activities || []).map((act) => ({
          time: DataValidator.fixTime(act.time, '09:00'),
          title: DataValidator.fixString(act.title, '未命名活动'),
          type: DataValidator.fixActivityType(act.type, 'attraction') as
            | 'attraction'
            | 'meal'
            | 'hotel'
            | 'shopping'
            | 'transport'
            | 'ocean',
          duration: DataValidator.fixNumber(act.duration, 60, 1), // 至少1分钟
            location: act.location || { lat: 0, lng: 0 },
          notes: DataValidator.fixString(act.notes, ''),
          cost: DataValidator.fixNumber(act.cost, 0, 0),
          details: act.details,
        })),
      })),
    });

    this.logger.log(
      `Created itinerary ${itinerary.id} with ${itinerary.days?.length || 0} days (expected ${dto.data.days.length})`,
    );

    // 返回前端格式（使用 timeSlots），减少前端数据转换工作
    const detailDto = await this.entityToDetailWithTimeSlotsDto(itinerary);
    this.logger.log(
      `Returning itinerary detail with ${detailDto.days?.length || 0} days in DTO`,
    );

    return {
      success: true,
      data: detailDto as any, // 使用前端格式
    };
    } catch (error) {
      this.logger.error(
        `Failed to create itinerary for user ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      
      // 如果是已知的 BadRequestException，直接抛出
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // 其他错误转换为更友好的错误信息
      const errorMessage =
        error instanceof Error ? error.message : '创建行程失败';
      throw new BadRequestException(
        `创建行程时发生错误: ${errorMessage}`,
      );
    }
  }

  async getItineraryList(
    userId: string,
    options?: {
      status?: 'draft' | 'published' | 'archived';
      page?: number;
      limit?: number;
    },
  ): Promise<ItineraryListResponseDto> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const [itineraries, total] = await this.itineraryRepository.findByUserId(
      userId,
      {
        status: options?.status,
        limit,
        offset,
      },
    );

    return {
      success: true,
      data: itineraries.map((it) => this.entityToListItemDto(it)),
      total,
      page,
      limit,
    };
  }

  async getItineraryById(
    id: string,
    userId: string,
  ): Promise<ItineraryDetailResponseDto> {
    const itinerary = await this.itineraryRepository.findById(id);

    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    // 检查所有权
    if (itinerary.userId !== userId) {
      throw new ForbiddenException('无权访问此行程');
    }

    // 返回前端格式（使用 timeSlots），减少前端数据转换工作
    return {
      success: true,
      data: (await this.entityToDetailWithTimeSlotsDto(itinerary)) as any,
    };
  }

  async updateItinerary(
    id: string,
    dto: UpdateItineraryRequestDto,
    userId?: string,
  ): Promise<UpdateItineraryResponseDto> {
    // 检查所有权（如果提供了 userId）
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(id, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }
    }

    const updateData: any = {};
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.startDate !== undefined)
      updateData.startDate = new Date(dto.startDate);
    // 验证 days 字段：如果提供了但值无效，则忽略（不更新）
    if (dto.days !== undefined) {
      if (dto.days >= 1 && dto.days <= 30) {
        updateData.daysCount = dto.days;
      } else if (dto.days !== 0) {
        // 只有当 days 不为 0 时才记录警告（0 可能是前端重置值）
        this.logger.warn(
          `Invalid days value: ${dto.days}, ignoring update for itinerary ${id}`,
        );
      }
    }
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.totalCost !== undefined) updateData.totalCost = dto.totalCost;
    if (dto.preferences !== undefined) updateData.preferences = dto.preferences;
    if (dto.status !== undefined) updateData.status = dto.status;

    const itinerary = await this.itineraryRepository.updateItinerary(
      id,
      updateData,
    );

    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    return {
      success: true,
      data: this.entityToDetailDto(itinerary),
    };
  }

  /**
   * 从前端提供的完整行程数据格式更新行程
   * 支持更新 days 数组的详细内容（activities/timeSlots）
   */
  async updateItineraryFromFrontendData(
    id: string,
    dto: UpdateItineraryFromFrontendDataDto,
    userId?: string,
  ): Promise<UpdateItineraryResponseDto> {
    // 检查所有权（如果提供了 userId）
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(id, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }
    }

    const { itineraryData, startDate } = dto;

    // 转换 timeSlots 为 activities，使用 DataValidator 修复数据格式
    const convertTimeSlotToActivity = (
      timeSlot: ItineraryTimeSlotDto,
    ): ItineraryActivityDto => {
      return {
        time: DataValidator.fixTime(timeSlot.time, '09:00'),
        title: DataValidator.fixString(
          timeSlot.title || timeSlot.activity,
          '未命名活动',
        ),
        type: DataValidator.fixActivityType(
          timeSlot.type,
          'attraction',
        ) as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: DataValidator.fixNumber(timeSlot.duration, 60, 1), // 至少1分钟
        location: timeSlot.coordinates || { lat: 0, lng: 0 },
        notes: DataValidator.fixString(timeSlot.notes, ''),
        cost: DataValidator.fixNumber(timeSlot.cost, 0, 0),
      };
    };

    // 转换 days（包含 timeSlots）为 days（包含 activities），使用 DataValidator 修复数据格式
    const convertDays = (): Array<{
      day: number;
      date: Date;
      activities: Array<{
        time: string;
        title: string;
        type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
      }>;
    }> => {
      return itineraryData.days.map((day, index) => {
        // 修复日期：先转换为字符串验证格式，再转换为Date对象
        const fixedDateStr = DataValidator.fixDate(day.date);
        const fixedDate = new Date(fixedDateStr);
        
        return {
          day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
          date: fixedDate,
        activities: day.timeSlots.map(convertTimeSlotToActivity),
        };
      });
    };

    // 确定开始日期：优先使用传入的 startDate，否则使用第一天的日期
    const finalStartDate = startDate
      ? new Date(startDate)
      : itineraryData.days[0]?.date
        ? new Date(itineraryData.days[0].date)
        : undefined;

    if (!finalStartDate) {
      throw new BadRequestException(
        '缺少开始日期：请提供 startDate 或确保 days 数组的第一天包含 date 字段',
      );
    }

    // 构建 preferences
    const preferences: {
      interests?: string[];
      budget?: 'low' | 'medium' | 'high';
      travelStyle?: 'relaxed' | 'moderate' | 'intensive';
    } = {};

    if (itineraryData.preferences && Array.isArray(itineraryData.preferences)) {
      preferences.interests = itineraryData.preferences;
    }

    if (itineraryData.budget) {
      const budgetMap: Record<string, 'low' | 'medium' | 'high'> = {
        low: 'low',
        medium: 'medium',
        high: 'high',
        economy: 'low',
        comfort: 'medium',
        luxury: 'high',
      };
      preferences.budget =
        budgetMap[itineraryData.budget.toLowerCase()] || 'medium';
    }

    if (itineraryData.travelStyle) {
      const styleMap: Record<string, 'relaxed' | 'moderate' | 'intensive'> = {
        relaxed: 'relaxed',
        moderate: 'moderate',
        intensive: 'intensive',
      };
      preferences.travelStyle =
        styleMap[itineraryData.travelStyle.toLowerCase()] || 'moderate';
    }

    // 使用 DataValidator 修复摘要
    const fixedSummary = DataValidator.fixString(itineraryData.summary, '');

    // 准备行程数据用于计算总费用
    const itineraryDataForCalculation = {
      days: convertDays().map((day) => ({
        activities: day.activities.map((act) => ({
          cost: act.cost,
          details: (act as any).details,
          estimatedCost: (act as any).estimatedCost,
        })),
      })),
    };

    // 使用 CostCalculator 自动计算总费用
    const calculatedTotalCost = CostCalculator.calculateTotalCost(itineraryDataForCalculation);

    // 更新行程（包括 days 和 activities）
    const itinerary = await this.itineraryRepository.updateItineraryWithDays(
      id,
      {
        destination: itineraryData.destination,
        startDate: finalStartDate,
        daysCount: itineraryData.duration,
        summary: fixedSummary,
        totalCost: calculatedTotalCost, // 使用计算出的总费用
        preferences:
          Object.keys(preferences).length > 0 ? preferences : undefined,
        daysData: convertDays(),
      },
    );

    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    // 返回前端格式（使用 timeSlots）
    return {
      success: true,
      data: (await this.entityToDetailWithTimeSlotsDto(itinerary)) as any,
    };
  }

  async deleteItinerary(
    id: string,
    userId?: string,
  ): Promise<DeleteItineraryResponseDto> {
    // 检查所有权（如果提供了 userId）
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(id, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权删除此行程');
      }
    }

    const deleted = await this.itineraryRepository.deleteItinerary(id);

    if (!deleted) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    return {
      success: true,
      message: '行程已删除',
    };
  }

  /**
   * 复制行程
   */
  async cloneJourney(
    journeyId: string,
    userId: string,
  ): Promise<CloneJourneyResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权复制此行程');
    }

    // 获取原行程
    const original = await this.getItineraryById(journeyId, userId);
    if (!original.data) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    const originalEntity = await this.itineraryRepository.findById(journeyId);
    if (!originalEntity) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 构建新的创建请求
    const daysData = originalEntity.days.map((day) => ({
      day: day.day,
      date: day.date,
      activities: day.activities.map((act) => ({
        time: act.time,
        title: act.title,
        type: act.type,
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      })),
    }));

    // 创建新行程
    const newItinerary = await this.itineraryRepository.createItinerary({
      userId,
      destination: originalEntity.destination,
      startDate: originalEntity.startDate,
      daysCount: originalEntity.daysCount,
      summary: originalEntity.summary || '',
      totalCost: originalEntity.totalCost || 0,
      preferences: originalEntity.preferences as Record<string, unknown>,
      status: 'draft', // 复制的行程默认为草稿
      daysData,
    });

    const detailDto = this.entityToDetailDto(newItinerary);
    return {
      success: true,
      data: {
        success: true,
        data: detailDto,
      } as ItineraryDetailResponseDto,
      message: '复制成功',
    };
  }

  /**
   * 分享行程
   */
  async shareJourney(
    journeyId: string,
    userId: string,
    dto: ShareJourneyRequestDto,
  ): Promise<ShareJourneyResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权分享此行程');
    }

    // 检查行程是否存在
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 生成分享码（简单实现：使用行程ID的哈希）
    const shareCode = Buffer.from(journeyId).toString('base64').substring(0, 8).toUpperCase();

    // 计算过期时间
    const expiresInDays = dto.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 生成分享链接（这里使用简单的格式，实际应该根据前端路由配置）
    const shareUrl = `/share/${shareCode}`;

    // TODO: 如果需要保存分享信息到数据库，可以在这里添加
    // 例如：保存 shareCode, password, expiresAt 到数据库

    return {
      success: true,
      shareUrl,
      shareCode,
      password: dto.requirePassword ? dto.password : undefined,
      expiresAt: expiresAt.toISOString(),
      message: '分享成功',
    };
  }

  /**
   * 导出行程
   */
  async exportJourney(
    journeyId: string,
    userId: string,
    dto: ExportJourneyRequestDto,
  ): Promise<ExportJourneyResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权导出行程');
    }

    // 获取行程详情
    const itinerary = await this.getItineraryById(journeyId, userId);
    if (!itinerary.data) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    const { format } = dto;

    if (format === 'json') {
      // JSON 格式：直接返回数据
      const filename = `journey-${journeyId}-${new Date().toISOString().split('T')[0]}.json`;
      return {
        success: true,
        data: itinerary.data as unknown as Record<string, unknown>,
        contentType: 'application/json',
        filename,
        message: '导出成功',
      };
    } else if (format === 'ics') {
      // ICS 格式：生成 iCalendar 文件
      const icsContent = this.generateICS(itinerary.data);
      const filename = `journey-${journeyId}-${new Date().toISOString().split('T')[0]}.ics`;
      return {
        success: true,
        data: icsContent,
        contentType: 'text/calendar',
        filename,
        message: '导出成功',
      };
    } else if (format === 'pdf') {
      // PDF 格式：返回占位符（实际需要 PDF 生成库）
      const filename = `journey-${journeyId}-${new Date().toISOString().split('T')[0]}.pdf`;
      return {
        success: true,
        data: 'PDF generation not implemented yet',
        contentType: 'application/pdf',
        filename,
        message: 'PDF 导出功能待实现',
      };
    }

    throw new BadRequestException(`不支持的导出格式: ${format}`);
  }

  /**
   * 生成 ICS 文件内容
   */
  private generateICS(itinerary: ItineraryDetailDto): string {
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//TripMind//Journey Export//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');

    if (itinerary.days && Array.isArray(itinerary.days)) {
      itinerary.days.forEach((day) => {
        if (day.activities && Array.isArray(day.activities)) {
          day.activities.forEach((activity) => {
            const startDate = day.date ? new Date(day.date) : new Date();
            const [hours, minutes] = activity.time.split(':').map(Number);
            startDate.setHours(hours || 0, minutes || 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + (activity.duration || 60));

            const formatDate = (date: Date): string => {
              return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${itinerary.id}-${day.day}-${activity.time}@tripmind`);
            lines.push(`DTSTART:${formatDate(startDate)}`);
            lines.push(`DTEND:${formatDate(endDate)}`);
            lines.push(`SUMMARY:${activity.title || '活动'}`);
            if (activity.notes) {
              lines.push(`DESCRIPTION:${activity.notes.replace(/\n/g, '\\n')}`);
            }
            if (activity.location) {
              lines.push(`LOCATION:${activity.location.lat},${activity.location.lng}`);
            }
            lines.push('END:VEVENT');
          });
        }
      });
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * 重置行程
   */
  async resetJourney(
    journeyId: string,
    userId: string,
    dto: ResetJourneyRequestDto,
  ): Promise<ResetJourneyResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权重置此行程');
    }

    // 获取原行程
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // TODO: 如果 keepHistory 为 true，保存历史版本到数据库
    let historyVersionId: string | undefined;
    if (dto.keepHistory !== false) {
      // 这里应该保存历史版本，暂时使用占位符
      historyVersionId = `history-${journeyId}-${Date.now()}`;
    }

    // 重置行程状态为 draft
    const updated = await this.itineraryRepository.updateItinerary(journeyId, {
      status: 'draft',
    });

    if (!updated) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 重新获取更新后的行程
    const resetItinerary = await this.itineraryRepository.findById(journeyId);
    if (!resetItinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    const detailDto = this.entityToDetailDto(resetItinerary);
    return {
      success: true,
      data: {
        success: true,
        data: detailDto,
      } as ItineraryDetailResponseDto,
      historyVersionId,
      message: '重置成功',
    };
  }

  /**
   * 将实体转换为前端格式 DTO（使用 timeSlots）
   * 统一使用前端期望的格式，减少前端数据转换工作
   */
  private async entityToDetailWithTimeSlotsDto(
    entity: ItineraryEntity,
  ): Promise<ItineraryDetailWithTimeSlotsDto> {
    const daysArray = Array.isArray(entity.days) ? entity.days : [];
    
    // 使用 DataValidator 修复总费用
    const totalCost = DataValidator.fixNumber(entity.totalCost, 0, 0);

    // 使用 DataValidator 修复摘要
    const summary = DataValidator.fixString(entity.summary, '');

    // 使用 DataValidator 修复开始日期
    const startDate = DataValidator.fixDate(entity.startDate as Date | string);

    // 转换为前端格式（使用 timeSlots）
    // 先将实体活动转换为 DTO 格式，再转换为 timeSlots
    const daysWithTimeSlots: ItineraryDayWithTimeSlotsDto[] = daysArray.map(
      (day, index) => {
        // 将实体活动转换为 DTO 格式
        const activitiesDto: ItineraryActivityDto[] = (day.activities || []).map(
          (act) => ({
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
            location: act.location as { lat: number; lng: number },
            notes: DataValidator.fixString(act.notes, ''),
            cost: DataValidator.fixNumber(act.cost, 0, 0),
            details: act.details,
          }),
        );

        return {
          day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
          date: DataValidator.fixDate(day.date as Date | string),
          timeSlots: this.convertActivitiesToTimeSlots(activitiesDto),
        };
      },
    );

    // 推断货币（异步操作，但这里同步返回，货币信息会在后续查询时补充）
    // 为了性能，这里先返回，货币信息可以在需要时通过单独接口获取
    // 或者可以在保存行程时存储货币信息到数据库
    let currency: { code: string; symbol: string; name: string } | undefined;
    try {
      // 尝试从第一个活动的坐标推断货币
      const firstActivity = daysWithTimeSlots[0]?.timeSlots?.[0];
      if (firstActivity?.coordinates) {
        currency = await this.currencyService.inferCurrency({
          destination: entity.destination,
          coordinates: firstActivity.coordinates,
        });
      } else {
        // 如果没有坐标，使用目的地名称推断
        currency = await this.currencyService.inferCurrency({
          destination: entity.destination,
        });
      }
    } catch (error) {
      this.logger.warn('推断货币失败，使用默认货币:', error);
      currency = {
        code: 'CNY',
        symbol: '¥',
        name: '人民币',
      };
    }

    return {
      id: entity.id,
      destination: entity.destination,
      startDate,
      daysCount: daysArray.length,
      summary,
      totalCost,
      currency: currency?.code,
      currencyInfo: currency,
      preferences: entity.preferences as any,
      status: entity.status,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : new Date(entity.createdAt).toISOString(),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : new Date(entity.updatedAt).toISOString(),
      days: daysWithTimeSlots,
      hasDays: daysWithTimeSlots.length > 0,
    };
  }

  // 辅助方法：实体转 DTO（保留用于向后兼容）
  private entityToDetailDto(entity: ItineraryEntity): ItineraryDetailDto {
    const daysArray = Array.isArray(entity.days) ? entity.days : [];
    
    // 使用 DataValidator 修复总费用
    const totalCost = DataValidator.fixNumber(entity.totalCost, 0, 0);

    // 使用 DataValidator 修复摘要
    const summary = DataValidator.fixString(entity.summary, '');

    // 使用 DataValidator 修复开始日期
    const startDate = DataValidator.fixDate(
      entity.startDate as Date | string,
    );

    // 确保days字段始终是数组，并使用 DataValidator 修复每个字段
    const daysMapped = daysArray.map((day, index) => ({
      day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
      date: DataValidator.fixDate(day.date as Date | string),
      activities: (day.activities || []).map((act) => ({
        time: DataValidator.fixTime(act.time, '09:00'),
        title: DataValidator.fixString(act.title, '未命名活动'),
        type: DataValidator.fixActivityType(act.type, 'attraction') as any,
        duration: DataValidator.fixNumber(act.duration, 60, 1), // 至少1分钟
        location: act.location as { lat: number; lng: number },
        notes: DataValidator.fixString(act.notes, ''),
        cost: DataValidator.fixNumber(act.cost, 0, 0),
        details: act.details,
      })),
    }));

    return {
      id: entity.id,
      destination: entity.destination,
      startDate,
      daysCount: daysArray.length, // 天数数量
      summary,
      totalCost,
      preferences: entity.preferences as any,
      status: entity.status,
      createdAt:
        entity.createdAt instanceof Date
        ? entity.createdAt.toISOString() 
        : new Date(entity.createdAt).toISOString(),
      updatedAt:
        entity.updatedAt instanceof Date
        ? entity.updatedAt.toISOString() 
        : new Date(entity.updatedAt).toISOString(),
      days: daysMapped,
      hasDays: daysMapped.length > 0, // 添加hasDays辅助字段
    };
  }

  private entityToListItemDto(entity: ItineraryEntity): ItineraryListItemDto {
    // 使用 DataValidator 修复所有字段
    const startDate = DataValidator.fixDate(entity.startDate as Date | string);
    const summary = DataValidator.fixString(entity.summary, '');
    const totalCost = DataValidator.fixNumber(entity.totalCost, 0, 0);

    return {
      id: entity.id,
      destination: entity.destination,
      startDate,
      days: entity.daysCount,
      summary,
      totalCost: totalCost > 0 ? totalCost : undefined, // 如果为0，返回undefined以保持向后兼容
      status: entity.status,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : new Date(entity.createdAt).toISOString(),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : new Date(entity.updatedAt).toISOString(),
    };
  }

  /**
   * 将前端提供的完整行程数据格式转换为 CreateItineraryRequestDto
   */
  convertFrontendDataToCreateRequest(
    dto: CreateItineraryFromFrontendDataDto,
  ): CreateItineraryRequestDto {
    const { itineraryData, tasks, startDate } = dto;

    // 转换 timeSlots 为 activities，使用 DataValidator 修复数据格式
    const convertTimeSlotToActivity = (
      timeSlot: ItineraryTimeSlotDto,
    ): ItineraryActivityDto => {
      return {
        time: DataValidator.fixTime(timeSlot.time, '09:00'),
        title: DataValidator.fixString(
          timeSlot.title || timeSlot.activity,
          '未命名活动',
        ),
        type: DataValidator.fixActivityType(
          timeSlot.type,
          'attraction',
        ) as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: DataValidator.fixNumber(timeSlot.duration, 60, 1), // 至少1分钟
        location: timeSlot.coordinates || { lat: 0, lng: 0 },
        notes: DataValidator.fixString(timeSlot.notes, ''),
        cost: DataValidator.fixNumber(timeSlot.cost, 0, 0),
        details: timeSlot.details,
      };
    };

    // 转换 days（包含 timeSlots）为 days（包含 activities），使用 DataValidator 修复数据格式
    const convertDays = (): ItineraryDayDto[] => {
      if (!itineraryData.days || !Array.isArray(itineraryData.days)) {
        this.logger.warn(`Invalid days data: ${JSON.stringify(itineraryData.days)}`);
        return [];
      }
      
      return itineraryData.days.map((day, index) => {
        const timeSlots = day.timeSlots || [];
        this.logger.debug(`Converting day ${day.day} with ${timeSlots.length} timeSlots`);
        return {
          day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
          date: DataValidator.fixDate(day.date),
          activities: timeSlots.map(convertTimeSlotToActivity),
        };
      });
    };

    // 确定开始日期：优先使用传入的 startDate，否则使用第一天的日期
    // 使用 DataValidator 修复日期格式
    const finalStartDate = DataValidator.fixDate(
      startDate || itineraryData.days[0]?.date,
    );

    if (!finalStartDate) {
      throw new BadRequestException('缺少开始日期：请提供 startDate 或确保 days 数组的第一天包含 date 字段');
    }

    // 构建 preferences
    const preferences: {
      interests?: string[];
      budget?: 'low' | 'medium' | 'high';
      travelStyle?: 'relaxed' | 'moderate' | 'intensive';
    } = {};

    if (itineraryData.preferences && Array.isArray(itineraryData.preferences)) {
      preferences.interests = itineraryData.preferences;
    }

    if (itineraryData.budget) {
      const budgetMap: Record<string, 'low' | 'medium' | 'high'> = {
        low: 'low',
        medium: 'medium',
        high: 'high',
        economy: 'low',
        comfort: 'medium',
        luxury: 'high',
      };
      preferences.budget = budgetMap[itineraryData.budget.toLowerCase()] || 'medium';
    }

    if (itineraryData.travelStyle) {
      const styleMap: Record<string, 'relaxed' | 'moderate' | 'intensive'> = {
        relaxed: 'relaxed',
        moderate: 'moderate',
        intensive: 'intensive',
      };
      preferences.travelStyle = styleMap[itineraryData.travelStyle.toLowerCase()] || 'moderate';
    }

    // 转换 days
    const convertedDays = convertDays();
    
    // 验证 days 数据
    if (!convertedDays || convertedDays.length === 0) {
      this.logger.error(`No days data converted from frontend data. Original days: ${JSON.stringify(itineraryData.days)}`);
      throw new BadRequestException(
        '无法创建行程：days 数据为空或格式不正确。请确保提供有效的 days 数组，每个 day 包含 timeSlots 数组。',
      );
    }
    
    this.logger.log(
      `Converted ${convertedDays.length} days from frontend data. Total activities: ${convertedDays.reduce((sum, d) => sum + (d.activities?.length || 0), 0)}`,
    );

    // 使用 DataValidator 修复总费用和摘要
    const fixedTotalCost = DataValidator.fixNumber(itineraryData.totalCost, 0, 0);
    const fixedSummary = DataValidator.fixString(itineraryData.summary, '');

    // 构建 CreateItineraryRequestDto
    const createRequest: CreateItineraryRequestDto = {
      destination: itineraryData.destination,
      startDate: finalStartDate,
      days: itineraryData.duration,
      data: {
        days: convertedDays,
        totalCost: fixedTotalCost,
        summary: fixedSummary,
      },
      preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
      status: 'draft',
    };

    // 注意：tasks 暂时不处理，如果需要可以保存到任务系统或作为元数据存储
    if (tasks && tasks.length > 0) {
      this.logger.log(`Received ${tasks.length} tasks, but tasks are not yet integrated into itinerary creation`);
    }

    return createRequest;
  }

  /**
   * 从前端提供的完整行程数据格式创建行程
   */
  async createItineraryFromFrontendData(
    dto: CreateItineraryFromFrontendDataDto,
    userId?: string,
  ): Promise<CreateItineraryResponseDto> {
    const createRequest = this.convertFrontendDataToCreateRequest(dto);
    return this.createItinerary(createRequest, userId);
  }

  /**
   * 创建行程模版（用于 /api/v1/itineraries 接口）
   * 接受顶层格式的数据，包含 title、language 等字段
   * 也支持 itineraryData 嵌套格式（用于导入）
   */
  async createItineraryTemplate(
    dto: CreateItineraryTemplateDto,
  ): Promise<CreateItineraryTemplateResponseDto> {
    try {
      // 检测是否是 itineraryData 嵌套格式
      const requestBody = dto as any;
      let actualDto = dto;
      let tasks = dto.tasks;

      // 如果存在 itineraryData 字段，说明是嵌套格式，需要提取数据
      if (requestBody.itineraryData && typeof requestBody.itineraryData === 'object') {
        this.logger.debug('Detected itineraryData nested format, extracting data');
        const itineraryData = requestBody.itineraryData;
        
        // 从 itineraryData 中提取数据，构建顶层格式的 DTO
        actualDto = {
          ...dto,
          title: dto.title || itineraryData.title || '',
          destination: dto.destination || itineraryData.destination,
          duration: dto.duration || itineraryData.duration,
          budget: dto.budget || itineraryData.budget,
          preferences: dto.preferences || itineraryData.preferences,
          travelStyle: dto.travelStyle || itineraryData.travelStyle,
          recommendations: dto.recommendations || itineraryData.recommendations,
          days: dto.days || itineraryData.days,
          totalCost: dto.totalCost || itineraryData.totalCost,
          summary: dto.summary || itineraryData.summary,
        } as CreateItineraryTemplateDto;
        
        // 提取 tasks（如果存在）
        if (requestBody.tasks && !tasks) {
          tasks = requestBody.tasks;
        }
      }

      // 构建 preferences JSON
      const preferences: Record<string, unknown> = {};
      if (actualDto.preferences) {
        preferences.interests = actualDto.preferences;
      }
      if (actualDto.budget) {
        preferences.budget = actualDto.budget;
      }
      if (actualDto.travelStyle) {
        preferences.travelStyle = actualDto.travelStyle;
      }
      if (actualDto.recommendations) {
        preferences.recommendations = actualDto.recommendations;
      }

      // 转换 days 数据为模版格式
      // 处理前端可能发送的多种格式：
      // 1. actualDto.days 是数组（正常情况）
      // 2. actualDto.days 是字符串（前端错误格式）
      // 3. 请求体中可能有 daysDetail 字段（前端使用的字段名）
      let daysInput = actualDto.days;
      
      // 如果 days 不是数组，尝试从请求体获取 daysDetail
      if (!Array.isArray(daysInput) || daysInput.length === 0) {
        if (Array.isArray(requestBody.daysDetail) && requestBody.daysDetail.length > 0) {
          this.logger.warn(
            `days field is not an array or empty, using daysDetail instead. days type: ${typeof daysInput}, daysDetail length: ${requestBody.daysDetail.length}`,
          );
          daysInput = requestBody.daysDetail;
        } else {
          this.logger.warn(
            `days field is not an array or empty. days type: ${typeof daysInput}, value: ${JSON.stringify(daysInput)}`,
          );
        }
      }

      this.logger.debug(
        `Creating template with ${Array.isArray(daysInput) ? daysInput.length : 0} days from DTO`,
      );
      const daysData = (Array.isArray(daysInput) ? daysInput : []).map((day, index) => ({
        dayNumber: day.day || index + 1,
        title: day.title || undefined,
        summary: day.summary || undefined,
        detailsJson: day.detailsJson || undefined,
        timeSlots: (day.timeSlots || []).map((slot, slotIndex) => {
          // 从 details 中提取可能的字段
          const slotDetails = slot.details as Record<string, unknown> | undefined;
          return {
            sequence: slotIndex + 1,
            startTime: slot.time,
            durationMinutes: slot.duration,
            type: slot.type,
            title: slot.title || slot.activity,
            activityHighlights: slotDetails?.activityHighlights as Record<string, unknown> | undefined,
            scenicIntro: slotDetails?.scenicIntro as string | undefined,
            notes: slot.notes,
            cost: slot.cost,
            currencyCode: slotDetails?.currencyCode as string | undefined,
            locationJson: slot.coordinates,
            detailsJson: slot.details,
          };
        }),
      }));

      this.logger.debug(
        `Converted ${daysData.length} days with total ${daysData.reduce((sum, d) => sum + d.timeSlots.length, 0)} timeSlots`,
      );

      // 创建模版
      const template = await this.templateRepository.createTemplate({
        title: actualDto.title,
        coverImage: undefined,
        destination: actualDto.destination,
        durationDays: actualDto.duration || daysData.length,
        summary: actualDto.summary,
        description: undefined,
        coreInsight: undefined,
        safetyNotice: undefined,
        journeyBackground: undefined,
        preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
        language: actualDto.language || 'zh-CN',
        status: (actualDto.status as 'draft' | 'published' | 'archived') || 'draft',
        daysData,
      });

      // 转换为响应格式
      this.logger.debug(
        `Template entity after creation: id=${template.id}, days loaded=${!!template.days}, days count=${template.days?.length || 0}`,
      );
      if (template.days && template.days.length > 0) {
        this.logger.debug(
          `First day: dayNumber=${template.days[0].dayNumber}, timeSlots count=${template.days[0].timeSlots?.length || 0}`,
        );
      }

      const responseData = this.templateEntityToDetailDto(template, tasks);

      // 调试日志：检查返回的数据结构
      this.logger.debug(
        `Created template ${template.id}, days count: ${template.days?.length || 0}`,
      );
      this.logger.debug(
        `Response data itineraryData.days count: ${responseData.itineraryData.days?.length || 0}`,
      );
      this.logger.debug(
        `Response data top-level days count: ${responseData.days?.length || 0}`,
      );
      this.logger.debug(
        `Response data structure: ${JSON.stringify({
          hasItineraryData: !!responseData.itineraryData,
          hasDays: !!responseData.itineraryData.days,
          daysLength: responseData.itineraryData.days?.length || 0,
          hasTopLevelDays: !!responseData.days,
          topLevelDaysLength: responseData.days?.length || 0,
        })}`,
      );

      // 确保 days 字段始终存在（即使是空数组）
      if (!responseData.itineraryData.days) {
        responseData.itineraryData.days = [];
      }

      return {
        success: true,
        data: responseData,
        message: '创建成功',
      };
    } catch (error) {
      this.logger.error('Failed to create itinerary template', error);
      throw error;
    }
  }

  /**
   * 将 activities 转换为 timeSlots 格式（统一前端格式）
   * 使用 DataValidator 确保所有字段格式正确
   */
  private convertActivitiesToTimeSlots(
    activities: ItineraryActivityDto[],
  ): ItineraryTimeSlotDto[] {
    return activities.map((act) => {
      // 使用 DataValidator 修复所有字段
      const fixedTitle = DataValidator.fixString(act.title, '未命名活动');
      const fixedNotes = DataValidator.fixString(act.notes, '');
      
      // 构建 details 对象（包含 notes 和 description，用于前端兼容）
      const details: Record<string, unknown> = {
        notes: fixedNotes,
        description: fixedNotes,
        ...(act.details || {}),
      };

      return {
        time: DataValidator.fixTime(act.time, '09:00'),
        title: fixedTitle,
        activity: fixedTitle, // 与 title 相同，保留以兼容前端
        type: DataValidator.fixActivityType(act.type, 'attraction') as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        coordinates: act.location || null, // 统一使用 coordinates 而不是 location
        notes: fixedNotes,
        duration: DataValidator.fixNumber(act.duration, 60, 1), // 至少1分钟
        cost: DataValidator.fixNumber(act.cost, 0, 0),
        details,
      };
    });
  }

  /**
   * 将模版实体转换为模版详情格式
   */
  private templateEntityToDetailDto(
    entity: JourneyTemplateEntity,
    tasks?: TaskDto[],
  ): ItineraryTemplateDetailResponseDto {
    const preferences = (entity.preferences as Record<string, unknown>) || {};

    const itineraryData: ItineraryDataWithTimeSlotsDto = {
      title: entity.title,
      destination: entity.destination || '',
      duration: entity.durationDays || 0,
      budget: (preferences.budget as string) || undefined,
      preferences: (preferences.interests as string[]) || [],
      travelStyle: (preferences.travelStyle as string) || undefined,
      itinerary: [],
      recommendations: (preferences.recommendations as {
        accommodation?: string;
        transportation?: string;
        food?: string;
        tips?: string;
      }) || undefined,
      days: Array.isArray(entity.days) && entity.days.length > 0
        ? entity.days.map((day) => ({
            day: day.dayNumber,
            date: '', // 模版没有具体日期
            title: day.title || undefined,
            summary: day.summary || undefined,
            detailsJson: day.detailsJson || undefined,
            timeSlots: Array.isArray(day.timeSlots) && day.timeSlots.length > 0
              ? day.timeSlots.map((slot) => ({
                  time: slot.startTime || '',
                  title: slot.title || '',
                  activity: slot.title || '',
                  type: (slot.type as 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport') || 'attraction',
                  coordinates: slot.locationJson || { lat: 0, lng: 0 },
                  notes: slot.notes || '',
                  duration: slot.durationMinutes || 60,
                  cost: slot.cost ? Number(slot.cost) : 0,
                  details: slot.detailsJson,
                }))
              : [],
          }))
        : [],
      totalCost: 0, // 模版不存储总费用
      summary: entity.summary || '',
    };

    // 为了兼容前端期望 data.days，在顶层也添加 days 字段（指向 itineraryData.days）
    const result: ItineraryTemplateDetailResponseDto = {
      id: entity.id,
      status: entity.status,
      language: entity.language,
      itineraryData,
      days: itineraryData.days, // 在顶层也添加 days 字段，方便前端访问
      tasks,
      createdBy: undefined,
      updatedBy: undefined,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : new Date(entity.createdAt).toISOString(),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : new Date(entity.updatedAt).toISOString(),
    };

    return result;
  }

  /**
   * 将行程实体转换为模版详情格式（已废弃，保留用于兼容）
   */
  private entityToTemplateDetailDto(
    entity: ItineraryEntity,
    language: string = 'zh-CN',
    tasks?: TaskDto[],
  ): ItineraryTemplateDetailResponseDto {
    const formatDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      if (typeof date === 'string') {
        try {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        } catch {
          return date;
        }
        return date;
      }
      return '';
    };

    const formatDayDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      if (typeof date === 'string') {
        try {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        } catch {
          return date;
        }
        return date;
      }
      return '';
    };

    const daysArray = Array.isArray(entity.days) ? entity.days : [];
    const preferences = (entity.preferences as Record<string, unknown>) || {};

    // 从 summary 或 preferences 中提取 title（如果没有存储 title，使用 destination）
    const title = (preferences.title as string) || entity.destination || '';

    const itineraryData: ItineraryDataWithTimeSlotsDto = {
      title,
      destination: entity.destination,
      duration: entity.daysCount,
      budget: (preferences.budget as string) || undefined,
      preferences: (preferences.interests as string[]) || [],
      travelStyle: (preferences.travelStyle as string) || undefined,
      itinerary: [],
      recommendations: (preferences.recommendations as {
        accommodation?: string;
        transportation?: string;
        food?: string;
        tips?: string;
      }) || undefined,
      days: daysArray.map((day) => ({
        day: day.day,
        date: formatDayDate(day.date as Date | string),
        timeSlots: this.convertActivitiesToTimeSlots(
          (day.activities || []).map((act) => ({
            time: act.time,
            title: act.title,
            type: act.type as
              | 'attraction'
              | 'meal'
              | 'hotel'
              | 'shopping'
              | 'transport',
            duration: act.duration,
            location: act.location,
            notes: act.notes || '',
            cost: act.cost || 0,
            details: (act as any).details,
          })),
        ),
      })),
      totalCost: entity.totalCost ? Number(entity.totalCost) : 0,
      summary: entity.summary || '',
    };

    return {
      id: entity.id,
      status: entity.status,
      language,
      itineraryData,
      tasks,
      createdBy: entity.userId,
      updatedBy: entity.userId,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : new Date(entity.createdAt).toISOString(),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : new Date(entity.updatedAt).toISOString(),
    };
  }

  /**
   * 获取行程模版列表（支持多种筛选条件）
   */
  async getItineraryTemplateList(
    query: ItineraryTemplateQueryDto,
  ): Promise<ItineraryTemplateListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const statusFilter: 'draft' | 'published' | 'archived' | undefined =
      query.status && query.status !== 'all'
        ? (query.status as 'draft' | 'published' | 'archived')
        : undefined;

    // 使用模版 Repository 查询
    const [templates, total] = await this.templateRepository.findAll({
        status: statusFilter,
      language: query.language,
      destination: query.destination,
      keyword: query.keyword,
      limit,
      offset,
    });

    // 转换为列表项格式
    const listItems: ItineraryTemplateListItemDto[] = templates.map((template) => {
      const preferences = (template.preferences as Record<string, unknown>) || {};

      return {
        id: template.id,
        status: template.status,
        language: template.language,
        itineraryData: {
          title: template.title,
          destination: template.destination || '',
          duration: template.durationDays || 0,
          budget: (preferences.budget as string) || undefined,
          totalCost: undefined,
          summary: template.summary || undefined,
        },
        createdAt:
          template.createdAt instanceof Date
            ? template.createdAt.toISOString()
            : new Date(template.createdAt).toISOString(),
        updatedAt:
          template.updatedAt instanceof Date
            ? template.updatedAt.toISOString()
            : new Date(template.updatedAt).toISOString(),
      };
    });

    return {
      data: listItems,
      total,
      page,
      limit,
    };
  }

  /**
   * 根据ID获取行程模版详情
   */
  async getItineraryTemplateById(
    id: string,
    language?: string,
  ): Promise<ItineraryTemplateDetailResponseDto> {
    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(`行程模版不存在: ${id}`);
    }

    return this.templateEntityToDetailDto(template);
  }

  /**
   * 更新行程模版
   */
  async updateItineraryTemplate(
    id: string,
    dto: UpdateItineraryTemplateDto,
  ): Promise<UpdateItineraryTemplateResponseDto> {
    // 获取现有模版
    const existing = await this.templateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`行程模版不存在: ${id}`);
    }

    // 构建更新数据
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.duration !== undefined) updateData.durationDays = dto.duration;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.language !== undefined) updateData.language = dto.language;

    // 更新 preferences
    const preferences: Record<string, unknown> = {
      ...((existing.preferences as Record<string, unknown>) || {}),
    };
    if (dto.budget !== undefined) preferences.budget = dto.budget;
    if (dto.preferences !== undefined) preferences.interests = dto.preferences;
    if (dto.travelStyle !== undefined) preferences.travelStyle = dto.travelStyle;
    if (dto.recommendations !== undefined)
      preferences.recommendations = dto.recommendations;
    if (Object.keys(preferences).length > 0) {
      updateData.preferences = preferences;
    }

    // 更新模版
    await this.templateRepository.updateTemplate(id, updateData);

    // 获取更新后的数据
    const updated = await this.getItineraryTemplateById(id);

    return {
      success: true,
      data: updated,
      message: '更新成功',
    };
  }

  /**
   * 删除行程模版
   */
  async deleteItineraryTemplate(
    id: string,
  ): Promise<DeleteItineraryTemplateResponseDto> {
    const deleted = await this.templateRepository.deleteTemplate(id);
    if (!deleted) {
      throw new NotFoundException(`行程模版不存在: ${id}`);
    }
    return {
      success: true,
      message: '删除成功',
    };
  }

  /**
   * 发布行程模版
   */
  async publishItineraryTemplate(
    id: string,
  ): Promise<PublishItineraryTemplateResponseDto> {
    // 更新状态为 published
    await this.templateRepository.updateTemplate(id, {
      status: 'published',
    });

    // 获取更新后的数据
    const updated = await this.getItineraryTemplateById(id);

    return {
      success: true,
      data: updated,
      message: '发布成功',
    };
  }

  /**
   * 复制行程模版
   */
  async cloneItineraryTemplate(
    id: string,
  ): Promise<CloneItineraryTemplateResponseDto> {
    // 获取原模版
    const original = await this.getItineraryTemplateById(id);

    // 构建新的创建请求
    const createDto: CreateItineraryTemplateDto = {
      title: original.itineraryData.title.includes('（副本）')
        ? original.itineraryData.title
        : `${original.itineraryData.title}（副本）`,
      destination: original.itineraryData.destination,
      duration: original.itineraryData.duration,
      budget: original.itineraryData.budget,
      preferences: original.itineraryData.preferences,
      travelStyle: original.itineraryData.travelStyle,
      recommendations: original.itineraryData.recommendations,
      days: original.itineraryData.days,
      totalCost: original.itineraryData.totalCost,
      summary: original.itineraryData.summary,
      status: 'draft',
      language: original.language,
      tasks: original.tasks,
    };

    // 创建新模版
    const created = await this.createItineraryTemplate(createDto);

    return {
      success: true,
      data: created.data,
      message: '复制成功',
    };
  }

  /**
   * 获取行程的所有天数
   */
  async getJourneyDays(
    journeyId: string,
    userId?: string,
  ): Promise<Array<ItineraryDayDto & { id: string }>> {
    try {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权访问此行程');
      }
    }

    const formatDayDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
        if (typeof date === 'string') {
      return date.split('T')[0];
        }
        return '';
    };

    const days = await this.itineraryRepository.findDaysByItineraryId(journeyId);
      
      this.logger.debug(
        `Found ${days.length} days for journey ${journeyId}`,
      );

    return days.map((day) => ({
      id: day.id,
      day: day.day,
      date: formatDayDate(day.date as Date | string),
      activities: (day.activities || []).map((act) => ({
        id: act.id,
        time: act.time,
        title: act.title,
        type: act.type as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      })),
    }));
    } catch (error) {
      this.logger.error(
        `Failed to get journey days for ${journeyId}`,
        error instanceof Error ? error.stack : error,
      );
      // 如果是ForbiddenException或NotFoundException，直接抛出
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      // 其他错误，返回空数组而不是抛出异常（更友好的错误处理）
      this.logger.warn(
        `Error fetching days for journey ${journeyId}, returning empty array`,
      );
      return [];
    }
  }

  /**
   * 为行程添加天数（支持同时创建activities）
   */
  async createJourneyDay(
    journeyId: string,
    dto: {
      day: number;
      date: string;
      activities?: Array<{
        time: string;
        title: string;
        type: string;
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
      }>;
    },
    userId?: string,
  ): Promise<ItineraryDayDto & { id: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }
    }

    const formatDayDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      return date.split('T')[0];
    };

    // 使用批量创建方法，即使只有一个天数
    const days = await this.itineraryRepository.createDays(journeyId, [
      {
      day: dto.day,
      date: new Date(dto.date),
        activities: dto.activities
          ? dto.activities.map((act) => ({
              time: act.time,
              title: act.title,
              type: act.type as
                | 'attraction'
                | 'meal'
                | 'hotel'
                | 'shopping'
                | 'transport'
                | 'ocean',
              duration: act.duration || 60,
              location: act.location || { lat: 0, lng: 0 },
              notes: act.notes || '',
              cost: act.cost || 0,
              details: (act as any).details,
            }))
          : undefined,
      },
    ]);

    if (days.length === 0) {
      throw new Error('Failed to create day');
    }

    const day = days[0];
    
    // 更新行程的 daysCount（取最大的 day 值，表示行程总天数）
    const allDays = await this.itineraryRepository.findDaysByItineraryId(journeyId);
    const maxDay = Math.max(...allDays.map((d) => d.day), 0);
    await this.itineraryRepository.updateItinerary(journeyId, {
      daysCount: maxDay,
    });

    return {
      id: day.id,
      day: day.day,
      date: formatDayDate(day.date as Date | string),
      activities: (day.activities || []).map((act) => ({
        time: act.time,
        title: act.title,
        type: act.type as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      })),
    };
  }

  /**
   * 批量为行程添加天数（支持同时创建activities）
   */
  async createJourneyDays(
    journeyId: string,
    dtos: Array<{
      day: number;
      date: string;
      activities?: Array<{
        time: string;
        title: string;
        type: string;
        duration: number;
        location: { lat: number; lng: number };
        notes?: string;
        cost?: number;
      }>;
    }>,
    userId?: string,
  ): Promise<Array<ItineraryDayDto & { id: string }>> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }
    }

    const formatDayDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      if (typeof date === 'string') {
        return date.split('T')[0];
      }
      return '';
    };

    // 转换activities格式
    let daysInput = dtos.map((dto) => ({
      day: dto.day,
      date: new Date(dto.date),
      activities: dto.activities
        ? dto.activities.map((act) => ({
            time: act.time,
            title: act.title,
            type: act.type as
              | 'attraction'
              | 'meal'
              | 'hotel'
              | 'shopping'
              | 'transport'
              | 'ocean',
            duration: act.duration || 60,
            location: act.location || { lat: 0, lng: 0 },
            notes: act.notes || '',
            cost: act.cost || 0,
          }))
        : undefined,
    }));

    // 检查是否已有相同的 day 值，避免重复创建
    const existingDays = await this.itineraryRepository.findDaysByItineraryId(journeyId);
    const existingDayNumbers = new Set(existingDays.map((d) => d.day));
    const duplicateDays = daysInput.filter((d) => existingDayNumbers.has(d.day));
    
    if (duplicateDays.length > 0) {
      this.logger.warn(
        `发现重复的天数 day 值: ${duplicateDays.map((d) => d.day).join(', ')}，将跳过这些天数`,
      );
      // 过滤掉重复的天数
      const uniqueDaysInput = daysInput.filter((d) => !existingDayNumbers.has(d.day));
      if (uniqueDaysInput.length === 0) {
        // 如果所有天数都重复，返回现有天数
        return existingDays.map((day) => ({
          id: day.id,
          day: day.day,
          date: formatDayDate(day.date as Date | string),
          activities: (day.activities || []).map((act) => ({
            time: act.time,
            title: act.title,
            type: act.type as
              | 'attraction'
              | 'meal'
              | 'hotel'
              | 'shopping'
              | 'transport'
              | 'ocean',
            duration: act.duration,
            location: act.location as { lat: number; lng: number },
            notes: act.notes || '',
            cost: act.cost || 0,
            details: act.details,
          })),
        }));
      }
      // 只创建不重复的天数
      daysInput = uniqueDaysInput;
    }

    const days = await this.itineraryRepository.createDays(journeyId, daysInput);

    // 更新行程的 daysCount（取最大的 day 值，表示行程总天数）
    const allDaysAfterCreate = await this.itineraryRepository.findDaysByItineraryId(journeyId);
    const maxDay = Math.max(...allDaysAfterCreate.map((d) => d.day), 0);
    
    await this.itineraryRepository.updateItinerary(journeyId, {
      daysCount: maxDay,
    });

    // 返回包含activities的数据
    return days.map((day) => ({
      id: day.id,
      day: day.day,
      date: formatDayDate(day.date as Date | string),
      activities: (day.activities || []).map((act) => ({
        time: act.time,
        title: act.title,
        type: act.type as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      })),
    }));
  }

  /**
   * 更新指定天数
   */
  async updateJourneyDay(
    journeyId: string,
    dayId: string,
    dto: { day?: number; date?: string },
    userId?: string,
  ): Promise<ItineraryDayDto & { id: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }
    }

    const formatDayDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      return date.split('T')[0];
    };

    const updateData: { day?: number; date?: Date } = {};
    if (dto.day !== undefined) updateData.day = dto.day;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);

    const updated = await this.itineraryRepository.updateDay(dayId, updateData);
    if (!updated) {
      throw new NotFoundException(`天数不存在: ${dayId}`);
    }

    return {
      id: updated.id,
      day: updated.day,
      date: formatDayDate(updated.date as Date | string),
      activities: (updated.activities || []).map((act) => ({
        id: act.id,
        time: act.time,
        title: act.title,
        type: act.type as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      })),
    };
  }

  /**
   * 删除指定天数
   */
  async deleteJourneyDay(
    journeyId: string,
    dayId: string,
    userId?: string,
  ): Promise<{ success: boolean; message?: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }
    }

    const deleted = await this.itineraryRepository.deleteDay(dayId);
    if (!deleted) {
      throw new NotFoundException(`天数不存在: ${dayId}`);
    }

    return {
      success: true,
      message: '删除成功',
    };
  }

  /**
   * 获取指定天数的所有活动
   */
  async getJourneyDayActivities(
    journeyId: string,
    dayId: string,
    userId?: string,
  ): Promise<Array<ItineraryActivityDto & { id: string }>> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权访问此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }
    }

    const activities = await this.itineraryRepository.findActivitiesByDayId(dayId);
    return activities.map((act) => ({
      id: act.id,
      time: act.time,
      title: act.title,
      type: act.type as
        | 'attraction'
        | 'meal'
        | 'hotel'
        | 'shopping'
        | 'transport'
        | 'ocean',
      duration: act.duration,
      location: act.location as { lat: number; lng: number },
      notes: act.notes || '',
      cost: act.cost || 0,
      details: act.details,
    }));
  }

  /**
   * 批量获取多个天数的活动详情
   */
  async batchGetJourneyActivities(
    journeyId: string,
    dayIds: string[] | undefined,
    userId?: string,
  ): Promise<{
    activities: Record<string, Array<ItineraryActivityDto & { id: string }>>;
    totalCount: number;
  }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权访问此行程');
      }

      // 如果指定了 dayIds，验证这些天数是否属于此行程
      if (dayIds && dayIds.length > 0) {
        for (const dayId of dayIds) {
          const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
          if (!dayOwnership) {
            throw new ForbiddenException(`天数 ${dayId} 不属于此行程`);
          }
        }
      }
    }

    // 批量查询活动
    const activitiesMap = await this.itineraryRepository.findActivitiesByDayIds(dayIds, journeyId);

    // 转换为 DTO 格式
    const result: Record<string, Array<ItineraryActivityDto & { id: string }>> = {};
    let totalCount = 0;

    for (const [dayId, activities] of Object.entries(activitiesMap)) {
      result[dayId] = activities.map((act) => ({
        id: act.id,
        time: act.time,
        title: act.title,
        type: act.type as
          | 'attraction'
          | 'meal'
          | 'hotel'
          | 'shopping'
          | 'transport'
          | 'ocean',
        duration: act.duration,
        location: act.location as { lat: number; lng: number },
        notes: act.notes || '',
        cost: act.cost || 0,
        details: act.details,
      }));
      totalCount += result[dayId].length;
    }

    return {
      activities: result,
      totalCount,
    };
  }

  /**
   * 为指定天数添加活动
   */
  async createJourneyDayActivity(
    journeyId: string,
    dayId: string,
    dto: {
      time: string;
      title: string;
      type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration: number;
      location: { lat: number; lng: number };
      notes?: string;
      cost?: number;
      locationDetails?: {
        chineseName?: string;
        localName?: string;
        chineseAddress?: string;
        localAddress?: string;
        transportInfo?: string;
        openingHours?: string;
        ticketPrice?: string;
        visitTips?: string;
        nearbyAttractions?: string;
        contactInfo?: string;
        category?: string;
        rating?: number;
        visitDuration?: string;
        bestTimeToVisit?: string;
        accessibility?: string;
        dressingTips?: string;
        culturalTips?: string;
        bookingInfo?: string;
      };
    },
    userId?: string,
  ): Promise<ItineraryActivityDto & { id: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }
    }

    // 将 locationDetails 存储到 details 字段中
    const details = dto.locationDetails ? { locationDetails: dto.locationDetails } : undefined;

    // 使用 DataValidator 修复创建数据格式
    const activity = await this.itineraryRepository.createActivity(dayId, {
      time: DataValidator.fixTime(dto.time, '09:00'),
      title: DataValidator.fixString(dto.title, '未命名活动'),
      type: DataValidator.fixActivityType(dto.type, 'attraction') as
        | 'attraction'
        | 'meal'
        | 'hotel'
        | 'shopping'
        | 'transport'
        | 'ocean',
      duration: DataValidator.fixNumber(dto.duration, 60, 1), // 至少1分钟
      location: dto.location,
      notes: DataValidator.fixString(dto.notes, ''),
      cost: DataValidator.fixNumber(dto.cost, 0, 0),
      details,
    });

    // 重新计算并更新总费用
    await this.recalculateAndUpdateTotalCost(journeyId);

    // 使用 DataValidator 修复返回数据格式
    return {
      id: activity.id,
      time: DataValidator.fixTime(activity.time, '09:00'),
      title: DataValidator.fixString(activity.title, '未命名活动'),
      type: DataValidator.fixActivityType(activity.type, 'attraction') as
        | 'attraction'
        | 'meal'
        | 'hotel'
        | 'shopping'
        | 'transport'
        | 'ocean',
      duration: DataValidator.fixNumber(activity.duration, 60, 1),
      location: activity.location as { lat: number; lng: number },
      notes: DataValidator.fixString(activity.notes, ''),
      cost: DataValidator.fixNumber(activity.cost, 0, 0),
    };
  }

  /**
   * 更新指定活动
   */
  async updateJourneyDayActivity(
    journeyId: string,
    dayId: string,
    activityId: string,
    dto: {
      time?: string;
      title?: string;
      type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
      duration?: number;
      location?: { lat: number; lng: number };
      notes?: string;
      cost?: number;
      locationDetails?: {
        chineseName?: string;
        localName?: string;
        chineseAddress?: string;
        localAddress?: string;
        transportInfo?: string;
        openingHours?: string;
        ticketPrice?: string;
        visitTips?: string;
        nearbyAttractions?: string;
        contactInfo?: string;
        category?: string;
        rating?: number;
        visitDuration?: string;
        bestTimeToVisit?: string;
        accessibility?: string;
        dressingTips?: string;
        culturalTips?: string;
        bookingInfo?: string;
      };
    },
    userId?: string,
  ): Promise<ItineraryActivityDto & { id: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }

      const activityOwnership = await this.itineraryRepository.checkActivityOwnership(
        activityId,
        dayId,
      );
      if (!activityOwnership) {
        throw new ForbiddenException('活动不属于此天数');
      }
    }

    // 处理 locationDetails：如果提供了，需要合并到 details 中
    // 先获取现有活动以获取当前的 details
    const existingActivity = await this.itineraryRepository['activityRepository'].findOne({
      where: { id: activityId },
      select: ['details'],
    });

    let detailsUpdate: Record<string, unknown> | undefined;
    if (dto.locationDetails !== undefined) {
      const existingDetails = (existingActivity?.details as Record<string, unknown>) || {};
      
      // 合并 locationDetails
      detailsUpdate = {
        ...existingDetails,
        locationDetails: dto.locationDetails,
      };
    } else if (existingActivity?.details) {
      // 如果没有提供 locationDetails，但存在现有的 details，保持原样
      detailsUpdate = existingActivity.details as Record<string, unknown>;
    }

    // 从 dto 中提取 locationDetails，避免传递给 updateActivity
    const { locationDetails, ...updateDto } = dto;
    
    // 使用 DataValidator 修复更新数据格式
    const validatedUpdateDto: any = {};
    if (updateDto.time !== undefined) {
      validatedUpdateDto.time = DataValidator.fixTime(updateDto.time, '09:00');
    }
    if (updateDto.title !== undefined) {
      validatedUpdateDto.title = DataValidator.fixString(updateDto.title, '未命名活动');
    }
    if (updateDto.type !== undefined) {
      validatedUpdateDto.type = DataValidator.fixActivityType(updateDto.type, 'attraction');
    }
    if (updateDto.duration !== undefined) {
      validatedUpdateDto.duration = DataValidator.fixNumber(updateDto.duration, 60, 1);
    }
    if (updateDto.location !== undefined) {
      validatedUpdateDto.location = updateDto.location;
    }
    if (updateDto.notes !== undefined) {
      validatedUpdateDto.notes = DataValidator.fixString(updateDto.notes, '');
    }
    if (updateDto.cost !== undefined) {
      validatedUpdateDto.cost = DataValidator.fixNumber(updateDto.cost, 0, 0);
    }

    const updated = await this.itineraryRepository.updateActivity(activityId, {
      ...validatedUpdateDto,
      ...(detailsUpdate !== undefined && { details: detailsUpdate }),
    });
    if (!updated) {
      throw new NotFoundException(`活动不存在: ${activityId}`);
    }

    // 如果更新了费用相关字段，重新计算并更新总费用
    // 检查 cost 或 locationDetails（可能包含 pricing 信息）
    if (updateDto.cost !== undefined || dto.locationDetails !== undefined) {
      await this.recalculateAndUpdateTotalCost(journeyId);
    }

    // 使用 DataValidator 修复返回数据格式
    return {
      id: updated.id,
      time: DataValidator.fixTime(updated.time, '09:00'),
      title: DataValidator.fixString(updated.title, '未命名活动'),
      type: DataValidator.fixActivityType(updated.type, 'attraction') as
        | 'attraction'
        | 'meal'
        | 'hotel'
        | 'shopping'
        | 'transport'
        | 'ocean',
      duration: DataValidator.fixNumber(updated.duration, 60, 1),
      location: updated.location as { lat: number; lng: number },
      notes: DataValidator.fixString(updated.notes, ''),
      cost: DataValidator.fixNumber(updated.cost, 0, 0),
    };
  }

  /**
   * 删除指定活动
   */
  async deleteJourneyDayActivity(
    journeyId: string,
    dayId: string,
    activityId: string,
    userId?: string,
  ): Promise<{ success: boolean; message?: string }> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }

      const activityOwnership = await this.itineraryRepository.checkActivityOwnership(
        activityId,
        dayId,
      );
      if (!activityOwnership) {
        throw new ForbiddenException('活动不属于此天数');
      }
    }

    const deleted = await this.itineraryRepository.deleteActivity(activityId);
    if (!deleted) {
      throw new NotFoundException(`活动不存在: ${activityId}`);
    }

    // 重新计算并更新总费用
    await this.recalculateAndUpdateTotalCost(journeyId);

    return {
      success: true,
      message: '删除成功',
    };
  }

  /**
   * 重新排序活动
   */
  async reorderJourneyDayActivities(
    journeyId: string,
    dayId: string,
    dto: { activityIds: string[] },
    userId?: string,
  ): Promise<Array<ItineraryActivityDto & { id: string }>> {
    // 检查所有权
    if (userId) {
      const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
      if (!isOwner) {
        throw new ForbiddenException('无权修改此行程');
      }

      const dayOwnership = await this.itineraryRepository.checkDayOwnership(dayId, journeyId);
      if (!dayOwnership) {
        throw new ForbiddenException('天数不属于此行程');
      }
    }

    const activities = await this.itineraryRepository.reorderActivities(dayId, dto.activityIds);
    return activities.map((act) => ({
      id: act.id,
      time: act.time,
      title: act.title,
      type: act.type as
        | 'attraction'
        | 'meal'
        | 'hotel'
        | 'shopping'
        | 'transport'
        | 'ocean',
      duration: act.duration,
      location: act.location as { lat: number; lng: number },
      notes: act.notes || '',
      cost: act.cost || 0,
      details: act.details,
    }));
  }

  // ========== 任务管理方法 ==========

  /**
   * 获取行程任务列表
   */
  async getJourneyTasks(
    journeyId: string,
    userId: string,
  ): Promise<TaskListResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权访问此行程');
    }

    const tasks = await this.itineraryRepository.getTasks(journeyId);
    return {
      tasks: tasks as unknown as TaskDto[],
    };
  }

  /**
   * 同步任务（根据目的地/模板重新生成并合并）
   */
  async syncJourneyTasks(
    journeyId: string,
    userId: string,
    dto: SyncTasksRequestDto,
  ): Promise<SyncTasksResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程');
    }

    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    let newTasks: TaskDto[] = [];

    // 如果指定了模板ID，从模板获取任务
    if (dto.templateId) {
      const templateDetail = await this.getItineraryTemplateById(dto.templateId);
      if (templateDetail && templateDetail.tasks) {
        newTasks = templateDetail.tasks || [];
      }
    }

    // 根据目的地生成任务（如果强制重新生成或没有任务）
    if (dto.forceRegenerate || newTasks.length === 0) {
      // TODO: 调用 AI 生成任务（这里先使用占位符）
      const aiGeneratedTasks: TaskDto[] = [
        {
          title: `确认护照有效期及前往 ${itinerary.destination} 是否需要签证/入境许可`,
          completed: false,
          category: 'preparation',
          destination: itinerary.destination,
          links: [
            {
              label: 'IATA 入境政策查询',
              url: 'https://www.iatatravelcentre.com/',
            },
          ],
        },
        {
          title: `预订往返 ${itinerary.destination} 的核心交通（机票/火车），并关注托运行李政策`,
          completed: false,
          category: 'preparation',
          destination: itinerary.destination,
          links: [
            {
              label: 'OAG 行李政策汇总',
              url: 'https://www.oag.com/baggage-allowance',
            },
          ],
        },
      ];

      // 合并 AI 生成的任务
      newTasks = [...newTasks, ...aiGeneratedTasks];
    }

    // 获取现有任务
    const existingTasks = (await this.itineraryRepository.getTasks(journeyId)) as unknown as TaskDto[];

    // 合并任务（去重，基于 title 或 autoKey）
    const taskMap = new Map<string, TaskDto>();
    
    // 先添加现有任务
    existingTasks.forEach((task) => {
      const key = task.autoKey || task.title;
      if (key && !taskMap.has(key)) {
        taskMap.set(key, task);
      }
    });

    // 添加新任务（如果不存在）
    newTasks.forEach((task) => {
      const key = task.autoKey || task.title;
      if (key && !taskMap.has(key)) {
        task.autoGenerated = true;
        taskMap.set(key, task);
      }
    });

    const mergedTasks = Array.from(taskMap.values());
    await this.itineraryRepository.updateTasks(journeyId, mergedTasks as unknown as Array<Record<string, unknown>>);

    return {
      success: true,
      tasks: mergedTasks,
      message: '同步成功',
    };
  }

  /**
   * 更新任务
   */
  async updateJourneyTask(
    journeyId: string,
    taskId: string,
    userId: string,
    dto: UpdateTaskRequestDto,
  ): Promise<UpdateTaskResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程');
    }

    const updates: Partial<TaskDto> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.completed !== undefined) updates.completed = dto.completed;
    if (dto.links !== undefined) updates.links = dto.links;

    const tasks = await this.itineraryRepository.updateTask(
      journeyId,
      taskId,
      updates as Partial<Record<string, unknown>>,
    );

    const updatedTask = tasks.find((t) => (t as unknown as TaskDto).id === taskId) as unknown as TaskDto;
    if (!updatedTask) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }

    return {
      success: true,
      task: updatedTask,
      message: '更新成功',
    };
  }

  /**
   * 删除任务
   */
  async deleteJourneyTask(
    journeyId: string,
    taskId: string,
    userId: string,
  ): Promise<DeleteTaskResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程');
    }

    await this.itineraryRepository.deleteTask(journeyId, taskId);

    return {
      success: true,
      message: '删除成功',
    };
  }

  /**
   * 创建自定义任务
   */
  async createJourneyTask(
    journeyId: string,
    userId: string,
    dto: CreateTaskRequestDto,
  ): Promise<CreateTaskResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程');
    }

    const newTask: TaskDto = {
      title: dto.title,
      completed: false,
      category: dto.category,
      destination: dto.destination,
      links: dto.links,
      autoGenerated: false,
      createdAt: Date.now(),
    };

    const tasks = await this.itineraryRepository.addTask(
      journeyId,
      newTask as unknown as Record<string, unknown>,
    );

    const createdTask = tasks[tasks.length - 1] as unknown as TaskDto;

    return {
      success: true,
      task: createdTask,
      message: '创建成功',
    };
  }

  // ========== 准备任务模板管理方法 ==========

  /**
   * 获取准备任务模板列表
   */
  async getPreparationProfiles(): Promise<PreparationProfileListResponseDto> {
    const profiles = await this.preparationProfileRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      data: profiles.map((profile) => ({
        id: profile.id,
        code: profile.code,
        title: profile.title,
        taskCount: Array.isArray(profile.tasks) ? profile.tasks.length : 0,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })),
      total: profiles.length,
    };
  }

  /**
   * 获取准备任务模板详情
   */
  async getPreparationProfileById(id: string): Promise<PreparationProfileDetailResponseDto> {
    const profile = await this.preparationProfileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`准备任务模板不存在: ${id}`);
    }

    return {
      id: profile.id,
      code: profile.code,
      title: profile.title,
      tasks: (profile.tasks as unknown as TaskDto[]) || [],
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  /**
   * 创建准备任务模板（仅管理员）
   */
  async createPreparationProfile(
    dto: CreatePreparationProfileRequestDto,
  ): Promise<CreatePreparationProfileResponseDto> {
    // 检查 code 是否已存在
    const existing = await this.preparationProfileRepository.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`模板代码已存在: ${dto.code}`);
    }

    const profile = this.preparationProfileRepository.create({
      code: dto.code,
      title: dto.title,
      tasks: dto.tasks as unknown as Array<Record<string, unknown>>,
    });

    const saved = await this.preparationProfileRepository.save(profile);

    return {
      success: true,
      data: {
        id: saved.id,
        code: saved.code,
        title: saved.title,
        tasks: (saved.tasks as unknown as TaskDto[]) || [],
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
      message: '创建成功',
    };
  }

  /**
   * 生成安全提示
   */
  async generateSafetyNotice(
    journeyId: string,
    userId: string,
    dto: GenerateSafetyNoticeRequestDto,
  ): Promise<GenerateSafetyNoticeResponseDto> {
    // 验证行程存在且属于用户
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }
    if (itinerary.userId !== userId) {
      throw new ForbiddenException('无权访问此行程');
    }

    const lang = dto.lang || 'zh-CN';
    const forceRefresh = dto.forceRefresh || false;

    // 构建缓存键：目的地 + 语言 + 行程摘要的哈希
    const destination = itinerary.destination || '未知目的地';
    const summary = itinerary.summary || '';
    const cacheKey = this.buildSafetyNoticeCacheKey(destination, lang, summary);

    // 如果不强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = await this.safetyNoticeCacheRepository.findOne({
        where: { cacheKey },
      });

      if (cached) {
        // 检查缓存是否过期（7天）
        const cacheAge = Date.now() - cached.updatedAt.getTime();
        const cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7天

        if (cacheAge < cacheTTL) {
          return {
            success: true,
            data: {
              noticeText: cached.noticeText,
              lang: cached.lang,
              fromCache: true,
              generatedAt: cached.updatedAt.toISOString(),
            },
            message: '安全提示（来自缓存）',
          };
        }
      }
    }

    // 生成新的安全提示
    const noticeText = await this.generateSafetyNoticeWithAI(destination, summary, lang);

    // 保存或更新缓存
    let cacheEntity = await this.safetyNoticeCacheRepository.findOne({
      where: { cacheKey },
    });

    if (cacheEntity) {
      cacheEntity.noticeText = noticeText;
      cacheEntity.lang = lang;
      cacheEntity.updatedAt = new Date();
      await this.safetyNoticeCacheRepository.save(cacheEntity);
    } else {
      cacheEntity = this.safetyNoticeCacheRepository.create({
        cacheKey,
        noticeText,
        lang,
        metadata: {
          destination,
          journeyId,
        },
      });
      await this.safetyNoticeCacheRepository.save(cacheEntity);
    }

    // 更新行程的安全提示字段
    await this.itineraryRepository.updateSafetyNotice(journeyId, {
      noticeText,
      lang,
      generatedAt: new Date().toISOString(),
      cacheKey,
    });

    return {
      success: true,
      data: {
        noticeText,
        lang,
        fromCache: false,
        generatedAt: new Date().toISOString(),
      },
      message: '安全提示生成成功',
    };
  }

  /**
   * 获取安全提示
   */
  async getSafetyNotice(
    journeyId: string,
    userId: string,
  ): Promise<GetSafetyNoticeResponseDto> {
    // 验证行程存在且属于用户
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }
    if (itinerary.userId !== userId) {
      throw new ForbiddenException('无权访问此行程');
    }

    // 从行程中获取安全提示
    const safetyNotice = itinerary.safetyNotice as
      | { noticeText: string; lang: string; generatedAt: string; cacheKey?: string }
      | undefined;

    if (safetyNotice && safetyNotice.noticeText) {
      return {
        success: true,
        data: {
          noticeText: safetyNotice.noticeText,
          lang: safetyNotice.lang || 'zh-CN',
          fromCache: false,
          generatedAt: safetyNotice.generatedAt,
        },
      };
    }

    // 如果没有安全提示，返回空提示
    return {
      success: true,
      data: {
        noticeText: '暂无安全提示，请先生成安全提示。',
        lang: 'zh-CN',
        fromCache: false,
      },
    };
  }

  /**
   * 构建安全提示缓存键
   */
  private buildSafetyNoticeCacheKey(
    destination: string,
    lang: string,
    summary: string,
  ): string {
    // 使用目的地、语言和摘要的前100个字符构建哈希
    const summaryHash = crypto
      .createHash('md5')
      .update(summary.substring(0, 100))
      .digest('hex')
      .substring(0, 8);
    return `safety:${destination}:${lang}:${summaryHash}`;
  }

  /**
   * 使用 AI 生成安全提示
   */
  private async generateSafetyNoticeWithAI(
    destination: string,
    summary: string,
    lang: string,
  ): Promise<string> {
    const systemMessage = `你是一个专业的旅行安全顾问，擅长为不同目的地提供详细、实用的安全提示和建议。

请根据目的地信息和行程摘要，生成一份全面的安全提示，包括：
1. 当地安全状况
2. 常见风险和注意事项
3. 紧急联系方式
4. 健康和安全建议
5. 文化礼仪提醒

请用${lang === 'zh-CN' ? '中文' : '英文'}回复，内容要详细、实用，字数控制在500-800字。`;

    const prompt = `目的地：${destination}

行程摘要：${summary || '无'}

请为这个目的地生成详细的安全提示。`;

    try {
      const noticeText = await this.llmService.chatCompletion({
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1500,
      });

      return noticeText.trim();
    } catch (error) {
      this.logger.error(`生成安全提示失败: ${error}`);
      throw new BadRequestException(
        `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 获取行程的支出列表
   */
  async getExpenses(
    journeyId: string,
    userId: string,
    filters?: {
      category?: string;
      startDate?: string;
      endDate?: string;
      payerId?: string;
    },
  ): Promise<GetExpenseListResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权访问此行程的支出');
    }

    // 转换日期字符串为 Date 对象
    const startDate = filters?.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

    // 获取支出列表
    const expenses = await this.itineraryRepository.findExpensesByItineraryId(
      journeyId,
      {
        category: filters?.category as any,
        startDate,
        endDate,
        payerId: filters?.payerId,
      },
    );

    // 转换为 DTO
    const expenseDtos: ExpenseDto[] = expenses.map((expense) =>
      this.entityToExpenseDto(expense),
    );

    // 计算总支出（使用行程的主要货币，如果需要可以按货币分组）
    const total = await this.itineraryRepository.calculateTotalExpenses(journeyId);

    return {
      success: true,
      data: expenseDtos,
      total: Number(total),
    };
  }

  /**
   * 创建支出
   */
  async createExpense(
    journeyId: string,
    dto: CreateExpenseDto,
    userId: string,
  ): Promise<CreateExpenseResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权为此行程添加支出');
    }

    // 验证自定义分摊详情
    if (dto.splitType === 'custom' && (!dto.splitDetails || Object.keys(dto.splitDetails).length === 0)) {
      throw new BadRequestException('当分摊方式为custom时，必须提供splitDetails');
    }

    // 验证分摊详情总和等于金额
    if (dto.splitType === 'custom' && dto.splitDetails) {
      const totalSplit = Object.values(dto.splitDetails).reduce((sum, amount) => sum + amount, 0);
      if (Math.abs(totalSplit - dto.amount) > 0.01) {
        throw new BadRequestException('分摊详情的总和必须等于支出金额');
      }
    }

    // 获取行程信息，确定默认货币
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 确定支出日期（默认为今天）
    const expenseDate = dto.date ? new Date(dto.date) : new Date();

    // 创建支出
    const expense = await this.itineraryRepository.createExpense(journeyId, {
      title: dto.title,
      amount: dto.amount,
      currencyCode: dto.currencyCode || 'USD',
      category: dto.category,
      location: dto.location,
      payerId: dto.payerId,
      payerName: dto.payerName,
      splitType: dto.splitType || 'none',
      splitDetails: dto.splitDetails,
      date: expenseDate,
      notes: dto.notes,
    });

    return {
      success: true,
      data: this.entityToExpenseDto(expense),
      message: '支出创建成功',
    };
  }

  /**
   * 更新支出
   */
  async updateExpense(
    journeyId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
    userId: string,
  ): Promise<UpdateExpenseResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程的支出');
    }

    // 检查支出是否属于该行程
    const expenseOwnership = await this.itineraryRepository.checkExpenseOwnership(
      expenseId,
      journeyId,
    );
    if (!expenseOwnership) {
      throw new NotFoundException(`支出不存在或不属于此行程: ${expenseId}`);
    }

    // 验证自定义分摊详情
    if (dto.splitType === 'custom' && (!dto.splitDetails || Object.keys(dto.splitDetails).length === 0)) {
      throw new BadRequestException('当分摊方式为custom时，必须提供splitDetails');
    }

    // 验证分摊详情总和等于金额
    if (dto.splitType === 'custom' && dto.splitDetails && dto.amount) {
      const totalSplit = Object.values(dto.splitDetails).reduce((sum, amount) => sum + amount, 0);
      if (Math.abs(totalSplit - dto.amount) > 0.01) {
        throw new BadRequestException('分摊详情的总和必须等于支出金额');
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.currencyCode !== undefined) updateData.currencyCode = dto.currencyCode;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.payerId !== undefined) updateData.payerId = dto.payerId;
    if (dto.payerName !== undefined) updateData.payerName = dto.payerName;
    if (dto.splitType !== undefined) updateData.splitType = dto.splitType;
    if (dto.splitDetails !== undefined) updateData.splitDetails = dto.splitDetails;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // 更新支出
    const updated = await this.itineraryRepository.updateExpense(expenseId, updateData);
    if (!updated) {
      throw new NotFoundException(`支出不存在: ${expenseId}`);
    }

    return {
      success: true,
      data: this.entityToExpenseDto(updated),
      message: '支出更新成功',
    };
  }

  /**
   * 删除支出
   */
  async deleteExpense(
    journeyId: string,
    expenseId: string,
    userId: string,
  ): Promise<DeleteExpenseResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权删除此行程的支出');
    }

    // 检查支出是否属于该行程
    const expenseOwnership = await this.itineraryRepository.checkExpenseOwnership(
      expenseId,
      journeyId,
    );
    if (!expenseOwnership) {
      throw new NotFoundException(`支出不存在或不属于此行程: ${expenseId}`);
    }

    // 删除支出
    const deleted = await this.itineraryRepository.deleteExpense(expenseId);
    if (!deleted) {
      throw new NotFoundException(`支出不存在: ${expenseId}`);
    }

    return {
      success: true,
      message: '支出删除成功',
    };
  }

  /**
   * 将 Expense 实体转换为 DTO
   */
  private entityToExpenseDto(expense: any): ExpenseDto {
    return {
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      currencyCode: expense.currencyCode,
      category: expense.category,
      location: expense.location,
      payerId: expense.payerId,
      payerName: expense.payerName,
      splitType: expense.splitType || 'none',
      splitDetails: expense.splitDetails,
      date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date,
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}

