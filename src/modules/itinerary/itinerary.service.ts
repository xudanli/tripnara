import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorHandler } from '../../utils/errorHandler';
import { LlmService } from '../llm/llm.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ItineraryRepository } from '../persistence/repositories/itinerary/itinerary.repository';
import { JourneyAssistantService } from './services/journey-assistant.service';
import { ItineraryGenerationService } from './services/itinerary-generation.service';
import { JourneyTaskService } from './services/journey-task.service';
import { JourneyExpenseService } from './services/journey-expense.service';
import { JourneyTemplateRepository } from '../persistence/repositories/journey-template/journey-template.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { PreparationProfileEntity } from '../persistence/entities/reference.entity';
import { AiSafetyNoticeCacheEntity } from '../persistence/entities/ai-log.entity';
import * as crypto from 'crypto';
import { DataValidator } from '../../utils/dataValidator';
import { CostCalculator } from '../../utils/costCalculator';
import { CurrencyService } from '../currency/currency.service';
import { InspirationService } from '../inspiration/inspiration.service';
import { ExternalService } from '../external/external.service';
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
  GeneratePublicSafetyNoticeRequestDto,
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
  JourneyAssistantChatRequestDto,
  JourneyAssistantChatResponseDto,
  ModificationSuggestionDto,
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
      details?: {
        highlights?: string[];
        insiderTip?: string;
        bookingSignal?: string;
        [key: string]: unknown;
      };
    }>;
  }>;
  totalCost?: number | string; // 支持数字或字符串
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
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly safetyNoticeCacheTtlSeconds = 7 * 24 * 60 * 60; // 7天（安全状况可能变化，不宜永久）

  constructor(
    private readonly llmService: LlmService,
    private readonly preferencesService: PreferencesService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly templateRepository: JourneyTemplateRepository,
    private readonly currencyService: CurrencyService,
    private readonly inspirationService: InspirationService,
    private readonly externalService: ExternalService,
    private readonly journeyAssistantService: JourneyAssistantService,
    private readonly itineraryGenerationService: ItineraryGenerationService,
    private readonly journeyTaskService: JourneyTaskService,
    private readonly journeyExpenseService: JourneyExpenseService,
    private readonly configService: ConfigService,
    @InjectRepository(PreparationProfileEntity)
    private readonly preparationProfileRepository: Repository<PreparationProfileEntity>,
    @InjectRepository(AiSafetyNoticeCacheEntity)
    private readonly safetyNoticeCacheRepository: Repository<AiSafetyNoticeCacheEntity>,
  ) {
    // 初始化 Redis 客户端（用于安全提示缓存）
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
          this.logger.warn('Redis connection error in ItineraryService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for safety notice cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for safety notice');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for ItineraryService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, safety notice cache disabled');
    }
  }

  async generateItinerary(
    dto: GenerateItineraryRequestDto,
    userId?: string,
  ): Promise<GenerateItineraryResponseDto> {
    // 委托给 ItineraryGenerationService
    return this.itineraryGenerationService.generateItinerary(dto, userId);
  }

  // ============================================================
  // 重新计算并更新行程总费用（保留，因为被控制器和其他方法调用）
  // ============================================================
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
      await this.ensureOwnership(journeyId, userId, '修改');
    }

    return await this.recalculateAndUpdateTotalCost(journeyId);
  }

  /**
   * 重新计算并更新行程总费用（内部方法）
   * 性能优化：优先使用 SQL 聚合，如果失败则回退到内存计算
   * @param journeyId 行程ID
   * @returns 新的总费用
   */
  private async recalculateAndUpdateTotalCost(journeyId: string): Promise<number> {
    let newTotalCost = 0;

    try {
      // 性能优化：优先使用 SQL 聚合计算（直接从数据库计算，避免加载所有数据）
      newTotalCost = await this.itineraryRepository.calculateTotalCostFromActivities(journeyId);
      this.logger.debug(
        `使用 SQL 聚合计算行程 ${journeyId} 的总费用: ${newTotalCost}`,
      );
    } catch (error) {
      // 如果 SQL 聚合失败，回退到内存计算（处理 details.pricing 等复杂场景）
      this.logger.warn(
        `SQL 聚合计算失败，回退到内存计算: ${journeyId}`,
        error instanceof Error ? error.message : error,
      );

      const itinerary = await this.itineraryRepository.findById(journeyId);
      if (!itinerary) {
        this.logger.warn(`行程不存在，无法重新计算总费用: ${journeyId}`);
        return 0;
      }

      // 转换为 DTO 格式以便计算
      const itineraryDto = this.entityToDetailDto(itinerary);
      
      // 计算总费用（包含 details.pricing 等复杂场景）
      newTotalCost = CostCalculator.calculateTotalCost(itineraryDto);
    }

    // 更新数据库中的总费用
    // ✅ 安全性：updateItineraryWithDays 只更新传入的字段（使用 if (input.xxx !== undefined) 检查）
    // 因此只传 totalCost 不会覆盖其他字段（如 summary、destination 等）
    await this.itineraryRepository.updateItineraryWithDays(journeyId, {
      totalCost: newTotalCost,
    });

    this.logger.debug(
      `重新计算行程 ${journeyId} 的总费用: ${newTotalCost}`,
    );

    return newTotalCost;
  }

  // ============================================================
  // CRUD 方法
  // ============================================================
  async createItinerary(
    dto: CreateItineraryRequestDto,
    userId?: string,
  ): Promise<CreateItineraryResponseDto> {
    try {
      // 详细日志：记录接收到的数据
      this.logger.debug(
        `创建行程请求: destination=${dto.destination}, days=${dto.days}, data=${JSON.stringify(dto.data ? { daysCount: dto.data.days?.length, hasDays: !!dto.data.days } : null)}`,
      );

      // 验证必要字段
      if (!dto.data || !Array.isArray(dto.data.days)) {
        this.logger.warn(
          `行程数据格式不正确: data=${JSON.stringify(dto.data)}, 建议使用 /api/v1/journeys/from-frontend-data 接口`,
        );
        throw new BadRequestException(
          '行程数据格式不正确：缺少 days 数组。如果使用前端数据格式，请使用 /api/v1/journeys/from-frontend-data 接口',
        );
      }

      if (!dto.data.days.length) {
        this.logger.warn('Empty itinerary data', {
          destination: dto.destination,
          days: dto.days,
          daysCount: dto.data.days.length,
          userId,
        });
        throw ErrorHandler.badRequest(
          '行程数据不能为空：至少需要一天的行程。请确保 data.days 数组包含至少一天的行程数据',
          { destination: dto.destination, userId, daysCount: dto.data.days.length },
        );
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
    this.logger.log('Creating itinerary', {
      userId,
      destination: dto.destination,
      daysCount: dto.data.days.length,
      totalActivities,
    });
    
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

    // 自动推断货币并存储到数据库
    let currency: { code: string; symbol: string; name: string } | undefined;
    try {
      // 尝试从第一个活动的坐标推断货币
      const firstActivity = dto.data.days[0]?.activities?.[0];
      if (firstActivity?.location) {
        currency = await this.currencyService.inferCurrency({
          destination: dto.destination,
          coordinates: firstActivity.location,
        });
      } else {
        // 如果没有坐标，使用目的地名称推断
        currency = await this.currencyService.inferCurrency({
          destination: dto.destination,
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

    const itinerary = await this.itineraryRepository.createItinerary({
      userId,
      destination: dto.destination,
        startDate: parseDate(dto.startDate),
      daysCount: dto.days,
      summary: fixedSummary,
      totalCost: calculatedTotalCost, // 使用计算出的总费用
      currency: currency.code, // 存储货币代码
      currencyInfo: currency, // 存储货币详细信息
      preferences: dto.preferences as Record<string, unknown>,
      practicalInfo: dto.data.practicalInfo, // 存储实用信息
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
      
      // 使用统一的错误处理工具
      throw ErrorHandler.wrapError(
        error as Error,
        '创建行程',
        { userId, destination: dto.destination },
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
      throw ErrorHandler.notFound('行程', id, { userId });
    }

    // 检查所有权
    if (itinerary.userId !== userId) {
      throw ErrorHandler.forbidden('访问', '此行程', { journeyId: id, userId });
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

    // 获取当前行程信息，用于判断是否需要重新推断货币
    // 性能优化：查询一次，后续传递给 updateItinerary 复用
    const currentItinerary = await this.itineraryRepository.findById(id);
    if (!currentItinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
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
    if (dto.practicalInfo !== undefined) updateData.practicalInfo = dto.practicalInfo;
    if (dto.status !== undefined) updateData.status = dto.status;

    // 如果目的地改变，重新推断货币（性能优化：只在必要时推断）
    if (dto.destination && dto.destination !== currentItinerary.destination) {
      try {
        const currency = await this.currencyService.inferCurrency({
          destination: dto.destination,
        });
        updateData.currency = currency.code;
        updateData.currencyInfo = currency;
      } catch (error) {
        this.logger.warn('更新行程时推断货币失败:', error);
      }
    }

    // 性能优化：传递已查询的实体，避免重复查询
    const updatedItinerary = await this.itineraryRepository.updateItinerary(
      id,
      updateData,
      currentItinerary, // 传递已查询的实体
    );

    if (!updatedItinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    // 复用已查询的实体，避免重复查询（性能优化）
    return {
      success: true,
      data: this.entityToDetailDto(updatedItinerary),
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

    // 获取当前行程信息，用于判断是否需要重新推断货币
    // 性能优化：查询一次，后续传递给 updateItineraryWithDays 复用
    const currentItinerary = await this.itineraryRepository.findById(id);
    if (!currentItinerary) {
      throw new NotFoundException(`行程不存在: ${id}`);
    }

    const needsCurrencyUpdate = 
      itineraryData.destination && 
      itineraryData.destination !== currentItinerary.destination;

    // 如果目的地改变，重新推断货币（性能优化：只在必要时推断）
    let currency: { code: string; symbol: string; name: string } | undefined;
    if (needsCurrencyUpdate) {
      try {
        // 尝试从第一个活动的坐标推断货币
        const firstActivity = convertDays()[0]?.activities?.[0];
        if (firstActivity?.location) {
          currency = await this.currencyService.inferCurrency({
            destination: itineraryData.destination,
            coordinates: firstActivity.location,
          });
        } else {
          currency = await this.currencyService.inferCurrency({
            destination: itineraryData.destination,
          });
        }
      } catch (error) {
        this.logger.warn('更新行程时推断货币失败:', error);
      }
    }

    // 更新行程（包括 days 和 activities）
    const updateData: any = {
        destination: itineraryData.destination,
        startDate: finalStartDate,
        daysCount: itineraryData.duration,
      summary: fixedSummary,
      totalCost: calculatedTotalCost, // 使用计算出的总费用
        preferences:
          Object.keys(preferences).length > 0 ? preferences : undefined,
        practicalInfo: itineraryData.practicalInfo, // 保存实用信息
        daysData: convertDays(),
    };

    // 如果推断出货币，添加到更新数据中
    if (currency) {
      updateData.currency = currency.code;
      updateData.currencyInfo = currency;
    }

    // 性能优化：传递已查询的实体，避免重复查询
    const itinerary = await this.itineraryRepository.updateItineraryWithDays(
      id,
      updateData,
      currentItinerary, // 传递已查询的实体
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
      await this.ensureOwnership(id, userId, '删除');
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
    await this.ensureOwnership(journeyId, userId, '复制');

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
    await this.ensureOwnership(journeyId, userId, '分享');

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
    await this.ensureOwnership(journeyId, userId, '导出');

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
    await this.ensureOwnership(journeyId, userId, '重置');

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
   * 提取公共的实体验证和转换逻辑
   */
  private validateAndTransformEntity(entity: ItineraryEntity) {
    // 处理 days 数据：确保是数组
    let daysArray: ItineraryDayEntity[] = [];
    if (entity.days) {
      if (Array.isArray(entity.days)) {
        daysArray = entity.days;
      } else {
        // 如果不是数组，记录警告但继续处理
        this.logger.warn(
          `[validateAndTransformEntity] 警告：entity.days 存在但不是数组，类型=${typeof entity.days}, 值=${JSON.stringify(entity.days).substring(0, 200)}`,
        );
      }
    }
    
    const totalCost = DataValidator.fixNumber(entity.totalCost, 0, 0);
    const summary = DataValidator.fixString(entity.summary, '');
    const startDate = DataValidator.fixDate(entity.startDate as Date | string);
    
    // 调试日志：检查数据提取
    if (daysArray.length === 0 && entity.daysCount > 0) {
      this.logger.warn(
        `[validateAndTransformEntity] 警告：行程有 daysCount=${entity.daysCount} 但没有 days 数据，可能数据不一致`,
      );
    }
    
    // 统计活动数量
    const totalActivities = daysArray.reduce(
      (sum, day) => sum + (Array.isArray(day.activities) ? day.activities.length : 0),
      0,
    );
    
    if (daysArray.length > 0) {
      this.logger.debug(
        `[validateAndTransformEntity] 提取数据: 天数=${daysArray.length}, 总活动数=${totalActivities}`,
      );
    }
    
    return { daysArray, totalCost, summary, startDate };
  }

  /**
   * 统一的权限检查方法（减少代码重复）
   */
  private async ensureOwnership(
    journeyId: string,
    userId: string,
    action: string = '访问',
  ): Promise<void> {
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException(`无权${action}此行程`);
    }
  }

  /**
   * 将实体转换为前端格式 DTO（使用 timeSlots）
   * 统一使用前端期望的格式，减少前端数据转换工作
   */
  private async entityToDetailWithTimeSlotsDto(
    entity: ItineraryEntity,
  ): Promise<ItineraryDetailWithTimeSlotsDto> {
    const { daysArray, totalCost, summary, startDate } = this.validateAndTransformEntity(entity);

    // 转换为前端格式（使用 timeSlots）
    // 先将实体活动转换为 DTO 格式，再转换为 timeSlots
    const daysWithTimeSlots: ItineraryDayWithTimeSlotsDto[] = daysArray.map(
      (day, index) => {
        // 将实体活动转换为 DTO 格式，并提取ID
        const activitiesDto: ItineraryActivityDto[] = [];
        const activityIds: string[] = [];
        
        (day.activities || []).forEach((act) => {
          activitiesDto.push({
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
          });
          activityIds.push(act.id); // 保存活动ID
        });

        return {
          id: day.id, // 添加天数ID字段
          day: DataValidator.fixNumber(day.day, index + 1, 1), // 天数从1开始
          date: DataValidator.fixDate(day.date as Date | string),
          timeSlots: this.convertActivitiesToTimeSlots(activitiesDto, day.id, activityIds),
        };
      },
    );

    // 优先使用存储的货币信息，如果没有则推断（性能优化）
    let currency: { code: string; symbol: string; name: string } | undefined;
    if (entity.currencyInfo) {
      // 使用存储的货币信息（性能优化：避免每次查询都推断）
      currency = entity.currencyInfo as { code: string; symbol: string; name: string };
    } else if (entity.currency) {
      // 如果只有货币代码，尝试获取完整信息
      const currencyInfo = this.currencyService.getCurrencyByCountryCode(entity.currency, 'zh');
      if (currencyInfo) {
        currency = currencyInfo;
      } else {
        // 如果无法获取，使用默认货币
        currency = {
          code: entity.currency,
          symbol: '¥',
          name: '人民币',
        };
      }
    } else {
      // 如果没有存储的货币信息，则推断（向后兼容）
      try {
        const firstActivity = daysWithTimeSlots[0]?.timeSlots?.[0];
        if (firstActivity?.coordinates) {
          currency = await this.currencyService.inferCurrency({
            destination: entity.destination,
            coordinates: firstActivity.coordinates,
          });
        } else {
          currency = await this.currencyService.inferCurrency({
            destination: entity.destination,
          });
        }
        // 异步更新数据库中的货币信息（不阻塞响应）
        this.updateCurrencyInfoAsync(entity.id, currency).catch((error) => {
          this.logger.warn(`异步更新货币信息失败: ${entity.id}`, error);
        });
      } catch (error) {
        this.logger.warn('推断货币失败，使用默认货币:', error);
        currency = {
          code: 'CNY',
          symbol: '¥',
          name: '人民币',
        };
      }
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
      practicalInfo: this.filterPracticalInfo(entity.practicalInfo), // 返回实用信息（已移除 plugType 和 currency）
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
    const { daysArray, totalCost, summary, startDate } = this.validateAndTransformEntity(entity);

    // 确保days字段始终是数组，并使用 DataValidator 修复每个字段
    const daysMapped = daysArray.map((day, index) => ({
      id: day.id, // 添加天数ID字段
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
    dayId?: string,
    activityIds?: string[],
  ): ItineraryTimeSlotDto[] {
    return activities.map((act, index) => {
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
        id: activityIds?.[index], // 活动ID（slotId，用于编辑/删除）
        dayId: dayId, // 天数ID（用于编辑/删除）
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
      await this.ensureOwnership(journeyId, userId, '访问');
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
      await this.ensureOwnership(journeyId, userId, '修改');
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
      await this.ensureOwnership(journeyId, userId, '修改');
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
      await this.ensureOwnership(journeyId, userId, '修改');

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
      await this.ensureOwnership(journeyId, userId, '修改');

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
      await this.ensureOwnership(journeyId, userId, '访问');

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
      await this.ensureOwnership(journeyId, userId, '访问');

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
      await this.ensureOwnership(journeyId, userId, '修改');

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
      await this.ensureOwnership(journeyId, userId, '修改');

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
      await this.ensureOwnership(journeyId, userId, '修改');

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
      await this.ensureOwnership(journeyId, userId, '修改');

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
   * 添加重试机制，解决偶发的"不存在"报错
   */
  async getJourneyTasks(
    journeyId: string,
    userId: string,
  ): Promise<TaskListResponseDto> {
    // 委托给 JourneyTaskService
    return this.journeyTaskService.getJourneyTasks(journeyId, userId);
  }

  /**
   * 同步任务（根据目的地/模板重新生成并合并）
   */
  async syncJourneyTasks(
    journeyId: string,
    userId: string,
    dto: SyncTasksRequestDto,
  ): Promise<SyncTasksResponseDto> {
    // 委托给 JourneyTaskService，传入 getItineraryTemplateById 方法
    return this.journeyTaskService.syncJourneyTasks(
      journeyId,
      userId,
      dto,
      (templateId: string) => this.getItineraryTemplateById(templateId),
    );
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
    // 委托给 JourneyTaskService
    return this.journeyTaskService.updateJourneyTask(
      journeyId,
      taskId,
      userId,
      dto,
    );
  }

  /**
   * 删除任务
   */
  async deleteJourneyTask(
    journeyId: string,
    taskId: string,
    userId: string,
  ): Promise<DeleteTaskResponseDto> {
    // 委托给 JourneyTaskService
    return this.journeyTaskService.deleteJourneyTask(journeyId, taskId, userId);
  }

  /**
   * 创建自定义任务
   */
  async createJourneyTask(
    journeyId: string,
    userId: string,
    dto: CreateTaskRequestDto,
  ): Promise<CreateTaskResponseDto> {
    // 委托给 JourneyTaskService
    return this.journeyTaskService.createJourneyTask(journeyId, userId, dto);
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
   * 生成通用安全提示（无需认证）
   */
  async generatePublicSafetyNotice(
    dto: GeneratePublicSafetyNoticeRequestDto,
  ): Promise<GenerateSafetyNoticeResponseDto> {
    const destination = dto.destination || '未知目的地';
    const summary = dto.summary || '';
    const lang = dto.lang || 'zh-CN';
    const forceRefresh = dto.forceRefresh || false;

    // 构建缓存键
    const cacheKey = this.buildSafetyNoticeCacheKey(destination, lang, summary);
    const redisCacheKey = `content:safety:${destination.toLowerCase()}:${lang}`;

    // ⚡ 优化：如果不强制刷新，优先从 Redis 缓存读取
    if (!forceRefresh) {
      if (this.useRedisCache && this.redisClient) {
        try {
          const cached = await this.redisClient.get(redisCacheKey);
          if (cached) {
            const cachedData = JSON.parse(cached);
            this.logger.debug(`Safety notice cache hit from Redis for: ${destination}`);
            return {
              success: true,
              data: {
                noticeText: cachedData.noticeText,
                lang: cachedData.lang,
                fromCache: true,
                generatedAt: cachedData.generatedAt,
              },
              message: '安全提示（来自缓存）',
            };
          }
        } catch (error) {
          this.logger.warn('Failed to read safety notice from Redis cache:', error);
          // 缓存读取失败，继续查询数据库
        }
      }

      // 回退到数据库缓存
      const cached = await this.safetyNoticeCacheRepository.findOne({
        where: { cacheKey },
      });

      if (cached) {
        // 检查缓存是否过期（7天）
        const cacheAge = Date.now() - cached.updatedAt.getTime();
        const cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7天

        if (cacheAge < cacheTTL) {
          // 同时写入 Redis（异步，不阻塞）
          if (this.useRedisCache && this.redisClient) {
            this.cacheSafetyNoticeToRedis(redisCacheKey, {
              noticeText: cached.noticeText,
              lang: cached.lang,
              generatedAt: cached.updatedAt.toISOString(),
            }).catch((error) => {
              this.logger.warn('Failed to cache safety notice to Redis:', error);
            });
          }

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

    // 生成新的安全提示（公开接口，没有 userId，使用环境变量配置）
    const noticeText = await this.generateSafetyNoticeWithAI(destination, summary, lang);
    const generatedAt = new Date().toISOString();

    // ⚡ 写入 Redis 缓存（优先）
    if (this.useRedisCache && this.redisClient) {
      this.cacheSafetyNoticeToRedis(redisCacheKey, {
        noticeText,
        lang,
        generatedAt,
      }).catch((error) => {
        this.logger.warn('Failed to cache safety notice to Redis:', error);
      });
    }

    // 保存或更新数据库缓存（作为备份）
    let cacheEntity = await this.safetyNoticeCacheRepository.findOne({
      where: { cacheKey },
    });

    if (cacheEntity) {
      cacheEntity.noticeText = noticeText;
      cacheEntity.lang = lang;
      await this.safetyNoticeCacheRepository.save(cacheEntity);
    } else {
      cacheEntity = this.safetyNoticeCacheRepository.create({
        cacheKey,
        noticeText,
        lang,
        metadata: {
          destination,
          summary,
        },
      });
      await this.safetyNoticeCacheRepository.save(cacheEntity);
    }

    return {
      success: true,
      data: {
        noticeText,
        lang,
        fromCache: false,
        generatedAt,
      },
      message: '安全提示生成成功',
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
    // 验证行程存在且属于用户（优化：先检查所有权，再查询）
    await this.ensureOwnership(journeyId, userId, '访问');
    
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    const lang = dto.lang || 'zh-CN';
    const forceRefresh = dto.forceRefresh || false;

    // 构建缓存键：目的地 + 语言 + 行程摘要的哈希
    const destination = itinerary.destination || '未知目的地';
    const summary = itinerary.summary || '';
    const cacheKey = this.buildSafetyNoticeCacheKey(destination, lang, summary);
    const redisCacheKey = `content:safety:${destination.toLowerCase()}:${lang}`;

    // ⚡ 优化：如果不强制刷新，优先从 Redis 缓存读取
    if (!forceRefresh) {
      if (this.useRedisCache && this.redisClient) {
        try {
          const cached = await this.redisClient.get(redisCacheKey);
          if (cached) {
            const cachedData = JSON.parse(cached);
            this.logger.debug(`Safety notice cache hit from Redis for: ${destination}`);
            return {
              success: true,
              data: {
                noticeText: cachedData.noticeText,
                lang: cachedData.lang,
                fromCache: true,
                generatedAt: cachedData.generatedAt,
              },
              message: '安全提示（来自缓存）',
            };
          }
        } catch (error) {
          this.logger.warn('Failed to read safety notice from Redis cache:', error);
          // 缓存读取失败，继续查询数据库
        }
      }

      // 回退到数据库缓存
      const cached = await this.safetyNoticeCacheRepository.findOne({
        where: { cacheKey },
      });

      if (cached) {
        // 检查缓存是否过期（7天）
        const cacheAge = Date.now() - cached.updatedAt.getTime();
        const cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7天

        if (cacheAge < cacheTTL) {
          // 同时写入 Redis（异步，不阻塞）
          if (this.useRedisCache && this.redisClient) {
            this.cacheSafetyNoticeToRedis(redisCacheKey, {
              noticeText: cached.noticeText,
              lang: cached.lang,
              generatedAt: cached.updatedAt.toISOString(),
            }).catch((error) => {
              this.logger.warn('Failed to cache safety notice to Redis:', error);
            });
          }

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
    const noticeText = await this.generateSafetyNoticeWithAI(destination, summary, lang, userId);
    const generatedAt = new Date().toISOString();

    // ⚡ 写入 Redis 缓存（优先）
    if (this.useRedisCache && this.redisClient) {
      this.cacheSafetyNoticeToRedis(redisCacheKey, {
        noticeText,
        lang,
        generatedAt,
      }).catch((error) => {
        this.logger.warn('Failed to cache safety notice to Redis:', error);
      });
    }

    // 保存或更新数据库缓存（作为备份）
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
    // 验证行程存在且属于用户（优化：先检查所有权，再查询）
    await this.ensureOwnership(journeyId, userId, '访问');
    
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
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
   * 过滤 practicalInfo，移除已废弃的 plugType 和 currency 字段
   * 这些字段现在由 local-essentials 接口提供
   */
  private filterPracticalInfo(
    practicalInfo?: Record<string, unknown> | null,
  ): Record<string, unknown> | undefined {
    if (!practicalInfo) {
      return undefined;
    }

    // 创建新对象，排除 plugType 和 currency 字段
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(practicalInfo)) {
      if (key !== 'plugType' && key !== 'currency') {
        filtered[key] = value;
      }
    }

    // 如果过滤后对象为空，返回 undefined
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  /**
   * 缓存安全提示到 Redis
   */
  private async cacheSafetyNoticeToRedis(
    cacheKey: string,
    data: { noticeText: string; lang: string; generatedAt: string },
  ): Promise<void> {
    if (!this.useRedisCache || !this.redisClient) {
      return;
    }

    try {
      await this.redisClient.setex(
        cacheKey,
        this.safetyNoticeCacheTtlSeconds,
        JSON.stringify(data),
      );
    } catch (error) {
      this.logger.warn('Failed to cache safety notice to Redis:', error);
    }
  }

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
   * 异步更新行程的货币信息（不阻塞响应）
   */
  private async updateCurrencyInfoAsync(
    itineraryId: string,
    currency: { code: string; symbol: string; name: string },
  ): Promise<void> {
    try {
      await this.itineraryRepository.updateItinerary(itineraryId, {
        currency: currency.code,
        currencyInfo: currency,
      });
      this.logger.debug(`已更新行程 ${itineraryId} 的货币信息: ${currency.code}`);
    } catch (error) {
      this.logger.warn(`更新行程 ${itineraryId} 的货币信息失败:`, error);
    }
  }

  /**
   * 使用 AI 生成安全提示
   */
  private async generateSafetyNoticeWithAI(
    destination: string,
    summary: string,
    lang: string,
    userId?: string, // 可选：用户ID，用于从用户偏好读取模型选择
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
      const noticeText = await this.llmService.chatCompletion(
        await this.llmService.buildChatCompletionOptions({
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1500,
          provider: 'deepseek', // 强制使用 DeepSeek-V3（安全提示基于规则和知识库整合）
          model: 'deepseek-chat', // DeepSeek-V3 模型
        }),
      );

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
    // 委托给 JourneyExpenseService
    return this.journeyExpenseService.getExpenses(journeyId, userId, filters);
  }

  /**
   * 创建支出
   */
  async createExpense(
    journeyId: string,
    dto: CreateExpenseDto,
    userId: string,
  ): Promise<CreateExpenseResponseDto> {
    // 委托给 JourneyExpenseService
    return this.journeyExpenseService.createExpense(journeyId, userId, dto);
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
    // 委托给 JourneyExpenseService
    return this.journeyExpenseService.updateExpense(
      journeyId,
      expenseId,
      userId,
      dto,
    );
  }

  /**
   * 删除支出
   */
  async deleteExpense(
    journeyId: string,
    expenseId: string,
    userId: string,
  ): Promise<DeleteExpenseResponseDto> {
    // 委托给 JourneyExpenseService
    return this.journeyExpenseService.deleteExpense(
      journeyId,
      expenseId,
      userId,
    );
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

  /**
   * 生成每日概要
   */
  async generateDailySummaries(
    journeyId: string,
    userId: string,
    day?: number,
    language?: string,
  ): Promise<{
    success: boolean;
    journeyId: string;
    destination: string;
    data: Array<{
      day: number;
      date: string;
      summary: string;
      generatedAt: string;
    }>;
    message?: string;
  }> {
    // 检查权限
    await this.ensureOwnership(journeyId, userId, '生成每日概要');

    // 获取行程数据（确保加载关联数据）
    const entity = await this.itineraryRepository.findById(journeyId);
    if (!entity) {
      throw new NotFoundException('行程不存在');
    }

    // 验证数据完整性（repository 层已经处理了备用查询）
    const hasDays = entity.days && Array.isArray(entity.days) && entity.days.length > 0;
    this.logger.debug(
      `[generateDailySummaries] 数据加载结果: days是数组=${Array.isArray(entity.days)}, days长度=${entity.days?.length || 0}`,
    );
    
    if (!hasDays) {
      this.logger.warn(
        `[generateDailySummaries] 警告：行程 ${journeyId} 没有days数据（repository层已尝试备用查询）`,
      );
    }

    const destination = entity.destination || '未知目的地';
    const { daysArray } = this.validateAndTransformEntity(entity);

    if (!daysArray || daysArray.length === 0) {
      // 提供更详细的错误信息
      const hasDaysRelation = entity.days !== undefined;
      const daysIsArray = Array.isArray(entity.days);
      const daysLength = entity.days?.length || 0;
      
      const daysCount = entity.daysCount || 0;
      
      this.logger.error(
        `[generateDailySummaries] 行程数据为空: journeyId=${journeyId}, hasDaysRelation=${hasDaysRelation}, daysIsArray=${daysIsArray}, daysLength=${daysLength}, daysCount=${daysCount}`,
      );
      
      // 如果行程有 daysCount 但没有 days 数据，提供修复建议
      let errorMessage = `行程数据为空，无法生成每日概要。`;
      if (daysCount > 0) {
        errorMessage += ` 注意：行程显示有 ${daysCount} 天，但数据库中缺少天数数据。`;
        errorMessage += ` 建议：请重新生成行程或联系技术支持。`;
      } else {
        errorMessage += ` 请确保行程已包含天数数据。`;
      }
      
      throw new BadRequestException(errorMessage);
    }

    // 确定要生成概要的天数
    const daysToGenerate = day
      ? daysArray.filter((d) => d.day === day)
      : daysArray;

    if (daysToGenerate.length === 0) {
      throw new BadRequestException(
        day ? `第 ${day} 天不存在` : '没有可生成概要的天数',
      );
    }

    // 为每一天生成概要
    const summaries = await Promise.all(
      daysToGenerate.map(async (dayData) => {
        // 转换日期格式
        const dateStr =
          dayData.date instanceof Date
            ? dayData.date.toISOString().split('T')[0]
            : typeof dayData.date === 'string'
              ? dayData.date
              : new Date(dayData.date).toISOString().split('T')[0];

        // 转换活动数据格式
        const activities = (dayData.activities || []).map((act) => ({
          time: DataValidator.fixTime(act.time, '09:00'),
          title: DataValidator.fixString(act.title, '未命名活动'),
          type: DataValidator.fixString(act.type, 'attraction'),
          duration: DataValidator.fixNumber(act.duration, 60, 1),
          notes: act.notes,
          cost: act.cost,
        }));

        const userLanguage = language || 'zh-CN';
        const summary = await this.generateDailySummaryWithAI(
          destination,
          {
            day: dayData.day,
            date: dateStr,
            activities,
          },
          userLanguage,
          userId, // 传递 userId 以从用户偏好读取模型选择
        );

        return {
          day: dayData.day,
          date: dateStr,
          summary,
          generatedAt: new Date().toISOString(),
        };
      }),
    );

    return {
      success: true,
      journeyId,
      destination,
      data: summaries,
      message: `成功生成 ${summaries.length} 天的概要`,
    };
  }

  /**
   * 使用 AI 生成单日概要
   */
  private async generateDailySummaryWithAI(
    destination: string,
    dayData: {
      day: number;
      date: string;
      activities: Array<{
        time: string;
        title: string;
        type: string;
        duration: number;
        notes?: string;
        cost?: number;
      }>;
    },
    language: string = 'zh-CN',
    userId?: string, // 可选：用户ID，用于从用户偏好读取模型选择
  ): Promise<string> {
    try {
      // 构建活动列表描述
      const activitiesText = dayData.activities
        .map((act, index) => {
          const time = act.time || '未指定时间';
          const title = act.title || '未命名活动';
          const type = act.type || '未知类型';
          const duration = act.duration ? `${act.duration}分钟` : '';
          const notes = act.notes ? `（${act.notes}）` : '';
          return `${index + 1}. ${time} - ${title} (${type})${duration ? `，持续${duration}` : ''}${notes}`;
        })
        .join('\n');

      const systemMessage = `你是一个专业的旅行文案师，擅长为旅行行程的每一天生成生动有趣的概要。

请根据提供的每日活动安排，生成一段简洁而富有吸引力的概要（80-120字），要求：
1. 突出当天的亮点和特色活动
2. 语言生动有趣，富有感染力
3. 控制长度在80-120字之间
4. 使用中文，风格轻松自然`;

      const userMessage = `目的地：${destination}
第${dayData.day}天（${dayData.date}）的活动安排：

${activitiesText}

请为这一天生成一段概要，突出亮点和特色。`;

      const response = await this.llmService.chatCompletion(
        await this.llmService.buildChatCompletionOptions({
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        maxOutputTokens: 200,
          provider: 'gemini', // 强制使用 Gemini 1.5 Flash（摘要任务，快速响应）
          model: 'gemini-2.0-flash', // Gemini 2.0 Flash 模型
        }),
      );

      // 清理和验证响应
      let summary = response.trim();
      if (summary.length < 50) {
        // 如果太短，使用模板生成
        summary = this.generateDailySummaryTemplate(destination, dayData);
      } else if (summary.length > 200) {
        // 如果太长，截断
        summary = summary.substring(0, 200) + '...';
      }

      return summary;
    } catch (error) {
      this.logger.warn(
        `AI生成每日概要失败（第${dayData.day}天），使用模板回退`,
        error,
      );
      // 使用模板回退
      return this.generateDailySummaryTemplate(destination, dayData);
    }
  }

  /**
   * 使用模板生成每日概要（回退方案）
   */
  private generateDailySummaryTemplate(
    destination: string,
    dayData: {
      day: number;
      date: string;
      activities: Array<{
        time: string;
        title: string;
        type: string;
      }>;
    },
  ): string {
    const activityCount = dayData.activities.length;
    const mainActivities = dayData.activities
      .slice(0, 3)
      .map((act) => act.title)
      .join('、');

    if (activityCount === 0) {
      return `第${dayData.day}天，在${destination}自由探索，享受悠闲时光。`;
    }

    if (activityCount === 1) {
      return `第${dayData.day}天，在${destination}体验${mainActivities}，感受独特的旅行魅力。`;
    }

    return `第${dayData.day}天，在${destination}安排了${activityCount}个精彩活动，包括${mainActivities}等，让您充分体验当地文化和风情。`;
  }

  /**
   * 行程助手聊天
   */
  async journeyAssistantChat(
    journeyId: string,
    userId: string,
    dto: JourneyAssistantChatRequestDto,
  ): Promise<JourneyAssistantChatResponseDto> {
    // 委托给 JourneyAssistantService
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }
    return this.journeyAssistantService.chat(journeyId, userId, dto, itinerary);
  }

  /**
   * 获取对话历史
   */
  async getConversationHistory(
    journeyId: string,
    conversationId: string,
    userId: string,
  ) {
    // 委托给 JourneyAssistantService
    return this.journeyAssistantService.getConversationHistory(
      journeyId,
      conversationId,
      userId,
    );
  }

  // ============================================================
  // 活动完整性检查与富化
  // ============================================================

  /**
   * 检查活动完整性
   * 收紧判断标准：如果活动只有 tripAdvisorId 但没有 location 数据，必须判定为 false（不完整）
   * @param activity 活动实体
   * @returns true 如果活动完整，false 如果不完整
   */
  private checkActivityCompleteness(
    activity: ItineraryActivityEntity,
  ): boolean {
    const details = activity.details as Record<string, unknown> | undefined;
    if (!details) {
      return false;
    }

    // 检查是否有位置信息
    const hasLoc =
      !!(details.location || details.coordinates) ||
      !!(activity.location && typeof activity.location === 'object' && 'lat' in activity.location && 'lng' in activity.location);
    const hasAddr = !!details.address;
    const hasName = !!details.name || !!activity.title;

    // [关键修正] 收紧判断标准
    // 以前：if (details.tripAdvisorId) return true;  <-- 这是导致Bug的根源
    // 现在：即使有ID，如果没有物理位置信息，也视为不完整，需要去爬取/查询
    const tripAdvisorId = details.tripAdvisorId || details.tripadvisorId;
    if (tripAdvisorId) {
      // 如果有 TripAdvisor ID，必须同时有位置信息（location/coordinates）或地址信息才视为完整
      if (hasLoc || hasAddr) {
        return true;
      }
      // 只有 ID 但没有位置信息，判定为不完整
      return false;
    }

    // 其他完整性检查：如果有地址和名称，视为完整
    if (hasAddr && hasName) {
      return true;
    }

    // 如果有位置信息和名称，视为完整
    if (hasLoc && hasName) {
      return true;
    }

    // 默认判定为不完整
    return false;
  }

  /**
   * 获取活动的富化尝试次数
   * @param activity 活动实体
   * @returns 富化尝试次数
   */
  private getEnrichmentAttempts(
    activity: ItineraryActivityEntity,
  ): number {
    const details = activity.details as Record<string, unknown> | undefined;
    if (!details) {
      return 0;
    }
    const attempts = details.enrichmentAttempts;
    if (typeof attempts === 'number') {
      return attempts;
    }
    return 0;
  }

  /**
   * 增加活动的富化尝试次数
   * @param activityId 活动ID
   * @returns 更新后的尝试次数
   */
  private async incrementEnrichmentAttempts(
    activityId: string,
  ): Promise<number> {
    const activity = await this.itineraryRepository['activityRepository'].findOne({
      where: { id: activityId },
      select: ['details'],
    });

    if (!activity) {
      throw new NotFoundException(`活动不存在: ${activityId}`);
    }

    const details = (activity.details as Record<string, unknown>) || {};
    const currentAttempts = this.getEnrichmentAttempts(activity);
    const newAttempts = currentAttempts + 1;

    // 更新 details 中的 enrichmentAttempts
    details.enrichmentAttempts = newAttempts;

    await this.itineraryRepository.updateActivity(activityId, {
      details,
    });

    this.logger.debug(
      `活动 ${activityId} 的富化尝试次数已更新为: ${newAttempts}`,
    );

    return newAttempts;
  }

  /**
   * 触发活动位置信息富化（异步）
   * 检查活动完整性，如果不完整且未超过尝试次数限制，则触发富化流程
   * @param journeyId 行程ID
   * @param dayId 天数ID
   * @param activityId 活动ID
   * @returns true 如果触发了富化，false 如果不需要富化或已超过尝试次数
   */
  async triggerLocationInfoEnrichmentAsync(
    journeyId: string,
    dayId: string,
    activityId: string,
  ): Promise<boolean> {
    try {
      // 获取活动实体
      const activity = await this.itineraryRepository['activityRepository'].findOne({
        where: { id: activityId },
        relations: ['day'],
      });

      if (!activity) {
        this.logger.warn(`活动不存在: ${activityId}`);
        return false;
      }

      // 检查活动完整性
      const isComplete = this.checkActivityCompleteness(activity);
      if (isComplete) {
        this.logger.debug(`活动 ${activityId} 已完整，无需富化`);
        return false;
      }

      // 检查富化尝试次数
      const attempts = this.getEnrichmentAttempts(activity);
      const maxAttempts = 3; // 最多尝试3次

      if (attempts >= maxAttempts) {
        this.logger.warn(
          `活动 ${activityId} 的富化尝试次数已达上限 (${attempts}/${maxAttempts})，放弃富化`,
        );
        return false;
      }

      // 增加尝试次数
      await this.incrementEnrichmentAttempts(activityId);

      // 获取活动的 TripAdvisor ID（如果存在）
      const details = activity.details as Record<string, unknown> | undefined;
      const tripAdvisorId = details?.tripAdvisorId || details?.tripadvisorId;

      if (tripAdvisorId) {
        this.logger.log(
          `触发活动 ${activityId} 的位置信息富化（TripAdvisor ID: ${tripAdvisorId}，尝试次数: ${attempts + 1}/${maxAttempts}）`,
        );

        try {
          // 调用 ExternalService 获取景点详情
          const attractionDetails = await this.externalService.getAttractionDetails(
            tripAdvisorId as string,
            'zh-CN',
          );

          // 更新活动的 details 和 location
          const updatedDetails = { ...details } as Record<string, unknown>;

          // 更新位置信息
          if (attractionDetails.coordinates) {
            updatedDetails.coordinates = attractionDetails.coordinates;
            updatedDetails.location = attractionDetails.coordinates;
          }

          // 更新地址信息
          if (attractionDetails.address) {
            updatedDetails.address = attractionDetails.address;
          }

          // 更新名称信息
          if (attractionDetails.name) {
            updatedDetails.name = attractionDetails.name;
          }

          // 更新其他详细信息
          if (attractionDetails.rating) {
            updatedDetails.rating = attractionDetails.rating;
          }
          if (attractionDetails.openingHours) {
            updatedDetails.openingHours = attractionDetails.openingHours;
          }
          if (attractionDetails.phone) {
            updatedDetails.phone = attractionDetails.phone;
          }
          if (attractionDetails.website) {
            updatedDetails.website = attractionDetails.website;
          }
          if (attractionDetails.description) {
            updatedDetails.description = attractionDetails.description;
          }
          if (attractionDetails.category) {
            updatedDetails.category = attractionDetails.category;
          }
          if (attractionDetails.tripadvisorUrl) {
            updatedDetails.tripadvisorUrl = attractionDetails.tripadvisorUrl;
          }

          // 更新活动的 details 和 location（如果获取到了坐标）
          const updateData: any = {
            details: updatedDetails,
          };

          if (attractionDetails.coordinates) {
            updateData.location = attractionDetails.coordinates;
          }

          await this.itineraryRepository.updateActivity(activityId, updateData);

          this.logger.log(
            `活动 ${activityId} 的位置信息富化成功（已更新坐标和详细信息）`,
          );

          return true;
        } catch (error) {
          this.logger.error(
            `活动 ${activityId} 的位置信息富化失败（TripAdvisor ID: ${tripAdvisorId}）`,
            error instanceof Error ? error.message : error,
          );
          // 即使富化失败，也返回 true，表示已尝试过
          return true;
        }
      } else {
        this.logger.warn(
          `活动 ${activityId} 不完整但没有 TripAdvisor ID，无法进行富化`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `触发活动 ${activityId} 的位置信息富化失败`,
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }
}

