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
  CreateItineraryFromFrontendDataDto,
  ItineraryTimeSlotDto,
  ItineraryActivityDto,
  ItineraryDayDto,
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
      duration: number;
      location: { lat: number; lng: number };
      notes: string;
      cost: number;
    }>;
  }>;
  totalCost: number;
  summary: string;
}

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly preferencesService: PreferencesService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly templateRepository: JourneyTemplateRepository,
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

      return {
        success: true,
        data: itineraryData,
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

  private validateAndTransformResponse(
    aiResponse: AiItineraryResponse,
  ): ItineraryDataDto {
    // 验证响应结构
    if (!aiResponse.days || !Array.isArray(aiResponse.days)) {
      throw new Error('AI响应缺少days字段或格式不正确');
    }

    // 验证并转换 totalCost：支持数字、字符串或默认值
    let totalCost: number;
    if (typeof aiResponse.totalCost === 'number') {
      totalCost = aiResponse.totalCost;
    } else if (typeof aiResponse.totalCost === 'string') {
      const parsed = parseFloat(aiResponse.totalCost);
      if (!isNaN(parsed)) {
        totalCost = parsed;
      } else {
        this.logger.warn(
          `AI响应totalCost字段无法转换为数字: ${aiResponse.totalCost}，使用默认值0`,
        );
        totalCost = 0;
      }
    } else {
      this.logger.warn(
        `AI响应totalCost字段缺失或格式不正确，使用默认值0`,
      );
      totalCost = 0;
    }

    // 验证 summary：允许缺失时使用默认值
    const summary =
      typeof aiResponse.summary === 'string' && aiResponse.summary.trim()
        ? aiResponse.summary
        : '';

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

      // 验证每个活动
      day.activities.forEach((activity, actIndex) => {
        if (!activity.time || !activity.title || !activity.type) {
          throw new Error(
            `第${day.day}天第${actIndex + 1}个活动缺少必要字段`,
          );
        }

        if (!activity.location || typeof activity.location.lat !== 'number' || typeof activity.location.lng !== 'number') {
          throw new Error(
            `第${day.day}天第${actIndex + 1}个活动location字段格式不正确`,
          );
        }
      });

      return {
        day: day.day,
        date: day.date,
        activities: day.activities.map((act) => ({
          time: act.time,
          title: act.title,
          type: act.type as
            | 'attraction'
            | 'meal'
            | 'hotel'
            | 'shopping'
            | 'transport',
          duration: act.duration || 60,
          location: act.location,
          notes: act.notes || '',
          cost: act.cost || 0,
        })),
      };
    });

    return {
      days: validatedDays,
      totalCost,
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

    const itinerary = await this.itineraryRepository.createItinerary({
      userId,
      destination: dto.destination,
        startDate: parseDate(dto.startDate),
      daysCount: dto.days,
        summary: dto.data.summary || '',
        totalCost: dto.data.totalCost ?? 0,
      preferences: dto.preferences as Record<string, unknown>,
      status: dto.status || 'draft',
      daysData: dto.data.days.map((day) => ({
        day: day.day,
          date: parseDate(day.date),
          activities: (day.activities || []).map((act) => ({
            time: act.time || '09:00',
            title: act.title || '',
            type: act.type || 'attraction',
            duration: act.duration || 60,
            location: act.location || { lat: 0, lng: 0 },
          notes: act.notes || '',
            cost: act.cost ?? 0,
        })),
      })),
    });

    return {
      success: true,
      data: this.entityToDetailDto(itinerary),
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

    return {
      success: true,
      data: this.entityToDetailDto(itinerary),
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
      } else {
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

  // 辅助方法：实体转 DTO
  private entityToDetailDto(entity: ItineraryEntity): ItineraryDetailDto {
    const daysArray = Array.isArray(entity.days) ? entity.days : [];
    
    // 处理 startDate：可能是 Date 对象或字符串
    const formatDate = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      if (typeof date === 'string') {
        // 如果是字符串，尝试解析或直接返回（假设格式正确）
        try {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        } catch {
          // 如果解析失败，返回原字符串（假设已经是 YYYY-MM-DD 格式）
          return date;
        }
        return date;
      }
      return '';
    };

    // 处理 day.date：可能是 Date 对象或字符串
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

    return {
      id: entity.id,
      destination: entity.destination,
      startDate: formatDate(entity.startDate as Date | string),
      daysCount: daysArray.length, // 天数数量
      summary: entity.summary || '',
      totalCost: entity.totalCost ? Number(entity.totalCost) : 0,
      preferences: entity.preferences as any,
      status: entity.status,
      createdAt: entity.createdAt instanceof Date 
        ? entity.createdAt.toISOString() 
        : new Date(entity.createdAt).toISOString(),
      updatedAt: entity.updatedAt instanceof Date 
        ? entity.updatedAt.toISOString() 
        : new Date(entity.updatedAt).toISOString(),
      days: daysArray.map((day) => ({
        day: day.day,
        date: formatDayDate(day.date as Date | string),
        activities: day.activities.map((act) => ({
          time: act.time,
          title: act.title,
          type: act.type as any,
          duration: act.duration,
          location: act.location as { lat: number; lng: number },
          notes: act.notes || '',
          cost: act.cost ? Number(act.cost) : 0,
        })),
      })),
    };
  }

  private entityToListItemDto(entity: ItineraryEntity): ItineraryListItemDto {
    // 处理 startDate：可能是 Date 对象或字符串
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

    return {
      id: entity.id,
      destination: entity.destination,
      startDate: formatDate(entity.startDate as Date | string),
      days: entity.daysCount,
      summary: entity.summary,
      totalCost: entity.totalCost ? Number(entity.totalCost) : undefined,
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

    // 转换 timeSlots 为 activities
    const convertTimeSlotToActivity = (
      timeSlot: ItineraryTimeSlotDto,
    ): ItineraryActivityDto => {
      return {
        time: timeSlot.time,
        title: timeSlot.title || timeSlot.activity || '',
        type: timeSlot.type || 'attraction',
        duration: timeSlot.duration || 60,
        location: timeSlot.coordinates || { lat: 0, lng: 0 },
        notes: timeSlot.notes || '',
        cost: timeSlot.cost || 0,
      };
    };

    // 转换 days（包含 timeSlots）为 days（包含 activities）
    const convertDays = (): ItineraryDayDto[] => {
      return itineraryData.days.map((day) => ({
        day: day.day,
        date: day.date,
        activities: day.timeSlots.map(convertTimeSlotToActivity),
      }));
    };

    // 确定开始日期：优先使用传入的 startDate，否则使用第一天的日期
    const finalStartDate = startDate || itineraryData.days[0]?.date;

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

    // 构建 CreateItineraryRequestDto
    const createRequest: CreateItineraryRequestDto = {
      destination: itineraryData.destination,
      startDate: finalStartDate,
      days: itineraryData.duration,
      data: {
        days: convertDays(),
        totalCost: itineraryData.totalCost || 0,
        summary: itineraryData.summary || '',
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
   * 将 activities 转换为 timeSlots 格式
   */
  private convertActivitiesToTimeSlots(
    activities: ItineraryActivityDto[],
  ): ItineraryTimeSlotDto[] {
    return activities.map((act) => ({
      time: act.time,
      title: act.title,
      activity: act.title,
      type: act.type,
      coordinates: act.location,
      notes: act.notes || '',
      duration: act.duration,
      cost: act.cost || 0,
    }));
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
}

