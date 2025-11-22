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
} from './dto/itinerary.dto';
import {
  ItineraryEntity,
  ItineraryDayEntity,
  ItineraryActivityEntity,
} from '../persistence/entities/itinerary.entity';

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

    if (typeof aiResponse.totalCost !== 'number') {
      throw new Error('AI响应totalCost字段格式不正确');
    }

    if (typeof aiResponse.summary !== 'string') {
      throw new Error('AI响应summary字段格式不正确');
    }

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
      totalCost: aiResponse.totalCost,
      summary: aiResponse.summary,
    };
  }

  // CRUD 方法
  async createItinerary(
    dto: CreateItineraryRequestDto,
    userId: string,
  ): Promise<CreateItineraryResponseDto> {
    const itinerary = await this.itineraryRepository.createItinerary({
      userId,
      destination: dto.destination,
      startDate: new Date(dto.startDate),
      daysCount: dto.days,
      summary: dto.data.summary,
      totalCost: dto.data.totalCost,
      preferences: dto.preferences as Record<string, unknown>,
      status: dto.status || 'draft',
      daysData: dto.data.days.map((day) => ({
        day: day.day,
        date: new Date(day.date),
        activities: day.activities.map((act) => ({
          time: act.time,
          title: act.title,
          type: act.type,
          duration: act.duration,
          location: act.location,
          notes: act.notes || '',
          cost: act.cost ?? undefined,
        })),
      })),
    });

    return {
      success: true,
      data: this.entityToDetailDto(itinerary),
    };
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
    userId: string,
  ): Promise<UpdateItineraryResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(id, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程');
    }

    const updateData: any = {};
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.startDate !== undefined)
      updateData.startDate = new Date(dto.startDate);
    if (dto.days !== undefined) updateData.daysCount = dto.days;
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
    userId: string,
  ): Promise<DeleteItineraryResponseDto> {
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(id, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权删除此行程');
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
}

