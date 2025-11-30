import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ErrorHandler } from '../../utils/errorHandler';
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
import { InspirationService } from '../inspiration/inspiration.service';
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

  constructor(
    private readonly llmService: LlmService,
    private readonly preferencesService: PreferencesService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly templateRepository: JourneyTemplateRepository,
    private readonly currencyService: CurrencyService,
    private readonly inspirationService: InspirationService,
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
      let destination = dto.destination;

      // 如果没有提供目的地，但有其他信息（天数、开始日期、偏好、意图等），先推荐目的地
      if (!destination) {
        this.logger.log('Destination not provided, recommending destinations based on other information');

        // 构建推荐目的地的输入文本
        let inputText = '';
        if (dto.intent?.description) {
          inputText = dto.intent.description;
        } else if (dto.intent?.keywords && dto.intent.keywords.length > 0) {
          inputText = dto.intent.keywords.join('、');
        } else if (dto.preferences?.interests && dto.preferences.interests.length > 0) {
          inputText = `我想去一个${dto.preferences.interests.join('、')}的地方`;
        } else {
          inputText = `我想去一个适合${dto.days}天旅行的地方`;
        }

        // 调用推荐目的地接口
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
          limit: 1, // 只推荐1个，直接使用
        });

        // 使用第一个推荐的目的地
        if (
          recommendResult.success &&
          recommendResult.data.locations &&
          recommendResult.data.locations.length > 0
        ) {
          destination = recommendResult.data.locations[0];
          this.logger.log(`Using recommended destination: ${destination}`);
        } else {
          throw new BadRequestException(
            '无法根据提供的信息推荐目的地，请提供具体的目的地名称',
          );
        }
      }

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
        '你是一名专业的旅行规划师与创意行程编排师，擅长为每个旅行活动设计具有"动作感""可执行性""场景代入"的标题。请严格按照以下要求生成内容，并始终以纯 JSON 格式返回，不要添加任何解释性文字。';

      const prompt = this.buildUserPrompt(
        destination,
        dto.days,
        preferenceText,
        preferenceGuidance,
        dateInstructions,
        dto.startDate,
        dto.intent,
      );

      // 记录提示词长度（用于调试）
      this.logger.debug(
        `Prompt length: ${prompt.length} characters for ${dto.days} days`,
      );

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
            maxOutputTokens: 4000, // 增加token限制，支持更详细的行程
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
        destination: destination,
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
    intent?: {
      intentType: string;
      keywords: string[];
      emotionTone: string;
      description: string;
      confidence?: number;
    },
  ): string {
    let prompt = `你是一个专业的旅行规划师和创意文案师。请为以下需求生成详细且富有吸引力的旅行行程：

目的地：${destination}
天数：${days}天
用户偏好：${preferenceText}
偏好具体要求：${preferenceGuidance}

${dateInstructions}`;

    // 如果提供了意图信息，添加到提示词中
    if (intent) {
      prompt += `\n\n用户意图信息：
用户意图类型：${intent.intentType}
关键词：${intent.keywords.join('、')}
情感倾向：${intent.emotionTone}
意图描述：${intent.description}`;
      if (intent.confidence !== undefined) {
        prompt += `\n意图识别置信度：${(intent.confidence * 100).toFixed(0)}%`;
      }
      prompt += `\n\n请根据用户的意图类型和关键词，优化行程安排和活动推荐。`;
    }

    prompt += `

【实时信息要求】

在生成行程前，请考虑以下实时信息（如果无法获取，请基于常识和一般规律）：

1. **天气信息**：查询 ${destination} 未来一周的天气预报，根据天气情况调整活动安排
2. **安全新闻**：了解 ${destination} 近期的安全状况和旅行建议，确保行程安全

【行程结构要求】

1. 生成 ${days} 天的完整行程
2. 每天安排 **3-4个活动**，确保行程充实但不紧张
3. 活动时间安排要合理，避免冲突，留出适当的休息和用餐时间

【输出格式】

请按照以下格式返回JSON数据：

{
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "activities": [
        {
          "time": "09:00",
          "title": "沿火山步道徒步进入裂谷深处",
          "type": "attraction",
          "duration": 120,
          "location": {"lat": 34.9949, "lng": 135.7850},
          "notes": "从停车场出发，沿标记清晰的火山步道前行约2公里，途中可观察火山岩地貌和地热现象。建议穿着防滑徒步鞋，携带充足饮水和防晒用品。步道前半段较平缓，后半段需小心碎石路面。最佳游览时间为上午9-11点，避开正午高温。适合有一定体力的游客，不适合老人和幼儿。避坑要点：不要偏离标记步道，注意脚下安全。",
          "cost": 400,
          "details": {
            "highlights": ["近距离观察活火山地貌", "体验地热现象", "欣赏裂谷壮丽景观"],
            "insiderTip": "日落时分在观景台拍照最美，光线柔和且游客较少",
            "bookingSignal": "无需预约，但建议避开周末高峰期"
          }
        }
      ]
    }
  ],
  "totalCost": 8000,
  "summary": "行程摘要",
  "practicalInfo": {
    "weather": "未来一周天气预报摘要",
    "safety": "安全提醒和注意事项",
    "plugType": "当地插座类型（如：Type C, 220V）",
    "currency": "当地货币及汇率（如：CHF，1 CHF ≈ 8 CNY）",
    "culturalTaboos": "文化禁忌和注意事项",
    "packingList": "针对性打包清单"
  }
}

【活动字段说明】

每个活动（activities数组中的元素）必须包含以下字段：

1. **"title"**: 活动标题（必须动作导向，见下方详细要求）
2. **"notes"**: 活动体验说明（≥80字，必须描述具体怎么做、体验过程、行动细节）
3. **"time"**: 活动开始时间（HH:mm格式，如 "09:00"）
4. **"duration"**: 活动持续时间（分钟数，如 120）
5. **"location"**: 活动地点坐标（JSON对象，格式：{"lat": 纬度, "lng": 经度}）
6. **"type"**: 活动类型（attraction/meal/hotel/shopping/transport/ocean，对应：景点/美食/住宿/购物/交通/海洋活动）
7. **"cost"**: 预估费用（数字）
8. **"details"**: 详细信息对象（可选，但强烈建议包含，见下方详细要求）

【活动标题（必须动作导向）】

- **以动作为主导**，让用户一眼看到"要做什么"
- **使用能体现行为、方向、节奏的动词**，如：徒步、攀登、穿越、潜入、漫游、追寻、踏入、登顶、探路、寻味、漫步、骑行、划船、攀爬、探索、寻觅、品尝、制作、体验、参与
- **标题必须具体，不得模糊**

  - ✅ 正确示例：
    - "沿火山步道徒步进入裂谷深处"
    - "踏上悬崖步道俯瞰冰川湖"
    - "在老街夜市寻味炭火羊排"
    - "攀登古堡石阶探访千年历史"
    - "潜入珊瑚礁区观赏热带鱼群"
    - "穿越原始森林寻找隐秘瀑布"
    - "在传统工坊亲手制作陶艺作品"
    - "漫步樱花小径捕捉春日光影"

  - ❌ 禁止使用：
    - "经典游览"、"特色美食"、"随便逛逛"、"走走看看"、"体验当地文化"
    - "城市观光"、"必吃美食"、"当地特色"、"文化体验"等空泛标题

【notes（≥80字）】

- **必须描述"具体怎么做、体验过程、行动细节"**
- **包含以下内容**：
  - **路线**：如何到达、具体路线、路径指引
  - **节奏**：活动的时间安排、节奏控制、各阶段时间分配
  - **注意事项**：安全提醒、时间限制、天气影响、人群情况
  - **穿着补给建议**：需要携带的物品、装备、证件、服装要求
  - **适合人群**：适合的年龄段、体力要求、兴趣偏好、技能要求
  - **避坑要点**：如何获得最佳体验、常见误区、省钱技巧、最佳时机

- **内容必须有画面感，但以行为过程为主，而非抒情**
- **字数要求：≥80字**，确保内容充实、可执行
- **禁止出现模板化泛句**，如"体验当地文化"、"感受美景"、"享受美食"等空洞描述
- **语言要有力度、明确、可执行**，让用户知道具体要做什么、怎么做
- **描述要生动诱人，拒绝流水账**，让读者产生身临其境的感受

【活动详细信息（details字段）要求】

每个活动应尽可能包含 **"details"** 对象，包含以下字段：

1. **"highlights"** (必填，数组)：该活动的 **2-3个核心亮点**
   - 示例：["近距离观察活火山地貌", "体验地热现象", "欣赏裂谷壮丽景观"]
   - 要求：亮点要具体、有吸引力，避免泛泛而谈

2. **"insiderTip"** (必填，字符串)：一句**行家视角的私房建议**
   - 示例："日落时分在二楼露台拍照最美，光线柔和且游客较少"
   - 要求：建议要实用、具体，体现本地人或资深旅行者的经验

3. **"bookingSignal"** (必填，字符串)：**明确的预约要求**
   - 示例："无需预约，但建议避开周末高峰期"
   - 示例："需提前3天在官网预约，旺季建议提前1周"
   - 示例："现场购票即可，但建议提前30分钟到达"
   - 要求：明确说明是否需要预约、如何预约、建议提前多久

【行程实用信息（practicalInfo字段）要求】

在返回的JSON根级别，应包含 **"practicalInfo"** 对象，提供以下实用信息：

1. **"weather"**: 未来一周天气预报摘要（基于目的地和旅行日期）
2. **"safety"**: 安全提醒和注意事项（基于目的地当前安全状况）
3. **"plugType"**: 当地插座类型和电压（如："Type C, 220V"）
4. **"currency"**: 当地货币及汇率（如："CHF，1 CHF ≈ 8 CNY"）
5. **"culturalTaboos"**: 文化禁忌和注意事项（针对目的地的文化特点）
6. **"packingList"**: 针对性打包清单（根据目的地、季节、活动类型提供）

【活动类型说明】

- **attraction**：景点（自然景观、历史遗迹、博物馆、地标建筑等）
- **meal**：美食（餐厅、小吃、特色美食体验等）
- **hotel**：住宿（酒店、民宿、特色住宿等）
- **shopping**：购物（市集、商店、手工艺品等）
- **transport**：交通（机场接送、城际交通、市内交通等）
- **ocean**：海洋活动（浮潜、潜水、海上运动等）

【其他要求】

1. 请确保行程合理，时间安排紧凑但不紧张，包含当地特色景点和美食
2. 请务必严格按照JSON格式返回，不要添加任何额外的文字说明
3. 请确保返回完整的JSON数据，包含所有${days}天的行程安排
4. 每个活动都应该有明确的开始时间（time字段），时间安排要合理，避免冲突
5. 坐标（location）应该尽可能准确，如果无法确定精确坐标，可以使用目的地中心坐标
6. 保持语言有力度、明确、可执行`;

    return prompt;
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
      await this.ensureOwnership(journeyId, userId, '修改');
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

    // 处理实用信息（practicalInfo）
    const practicalInfo = aiResponse.practicalInfo || {};

    // 构建行程数据对象
    const itineraryData: ItineraryDataDto = {
      days: validatedDays,
      totalCost,
      summary,
      practicalInfo: Object.keys(practicalInfo).length > 0 ? practicalInfo : undefined,
    };

    // 自动计算总费用（覆盖 AI 返回的值，确保准确性）
    const calculatedTotalCost = CostCalculator.calculateTotalCost(itineraryData);
    
    return {
      days: validatedDays,
      totalCost: calculatedTotalCost > 0 ? calculatedTotalCost : totalCost, // 如果计算出的费用为0，保留AI返回的值
      summary,
      practicalInfo: itineraryData.practicalInfo, // 返回实用信息
    };
  }

  // CRUD 方法
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
      practicalInfo: entity.practicalInfo as any, // 返回实用信息
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
      days: daysArray.map((day) => {
        const activitiesDto: ItineraryActivityDto[] = [];
        const activityIds: string[] = [];
        
        (day.activities || []).forEach((act) => {
          activitiesDto.push({
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
            location: act.location,
            notes: act.notes || '',
            cost: act.cost || 0,
            details: (act as any).details,
          });
          activityIds.push(act.id); // 保存活动ID
        });

        return {
          day: day.day,
          date: formatDayDate(day.date as Date | string),
          timeSlots: this.convertActivitiesToTimeSlots(activitiesDto, day.id, activityIds),
        };
      }),
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
    // 检查所有权
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('无权访问此行程');
    }

    // 添加重试机制，解决偶发的"不存在"报错
    // 可能原因：事务提交延迟、数据库复制延迟、缓存不一致等
    const maxRetries = 3;
    const retryDelay = 100; // 100ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
    const tasks = await this.itineraryRepository.getTasks(journeyId);
    return {
      tasks: tasks as unknown as TaskDto[],
    };
      } catch (error) {
        // 如果是最后一次尝试，重新抛出错误
        if (attempt === maxRetries) {
          this.logger.error(
            `[getJourneyTasks] Failed to get tasks for journey ${journeyId} after ${maxRetries} attempts:`,
            error instanceof Error ? error.message : error,
          );
          throw error;
        }
        // 否则等待后重试
        this.logger.debug(
          `[getJourneyTasks] Error getting tasks for journey ${journeyId}, retrying (attempt ${attempt}/${maxRetries}):`,
          error instanceof Error ? error.message : error,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw new Error('获取行程任务失败');
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

    // 性能优化：查询一次，后续复用
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
        generatedAt: new Date().toISOString(),
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
    await this.ensureOwnership(journeyId, userId, '访问此行程的支出');

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
    await this.ensureOwnership(journeyId, userId, '为此行程添加支出');

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
    await this.ensureOwnership(journeyId, userId, '修改此行程的支出');

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
    await this.ensureOwnership(journeyId, userId, '删除此行程的支出');

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

  /**
   * 生成每日概要
   */
  async generateDailySummaries(
    journeyId: string,
    userId: string,
    day?: number,
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

        const summary = await this.generateDailySummaryWithAI(
          destination,
          {
            day: dayData.day,
            date: dateStr,
            activities,
          },
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

      const response = await this.llmService.chatCompletion({
        provider: 'deepseek',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        maxOutputTokens: 200,
      });

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
    try {
      // 获取行程详情（确保加载关联数据）
      const itinerary = await this.itineraryRepository.findById(journeyId);

      if (!itinerary) {
        throw new NotFoundException(`行程不存在: ${journeyId}`);
      }

      // 检查所有权
      if (itinerary.userId !== userId) {
        throw new ForbiddenException('无权访问此行程');
      }

      // 验证数据完整性（repository 层已经处理了备用查询）
      const hasDays = itinerary.days && Array.isArray(itinerary.days) && itinerary.days.length > 0;
      this.logger.debug(
        `[AI Assistant] 数据加载结果: days是数组=${Array.isArray(itinerary.days)}, days长度=${itinerary.days?.length || 0}`,
      );
      
      if (hasDays) {
        const firstDayActivities = itinerary.days[0].activities?.length || 0;
        this.logger.debug(
          `[AI Assistant] 第1天活动数量: ${firstDayActivities}`,
        );
      } else {
        this.logger.warn(
          `[AI Assistant] 警告：行程 ${journeyId} 没有days数据（repository层已尝试备用查询）`,
        );
      }

      // 转换行程数据为前端格式（包含完整信息）
      const itineraryDetail = await this.entityToDetailWithTimeSlotsDto(itinerary);
      const destinationName = itineraryDetail.destination || '未知目的地';

      // 如果days为空，尝试通过批量获取活动接口获取数据
      if (!itineraryDetail.days || itineraryDetail.days.length === 0) {
        this.logger.warn(
          `[AI Assistant] 行程 ${journeyId} 没有days数据，尝试通过批量接口获取活动`,
        );
        try {
          const activitiesResult = await this.batchGetJourneyActivities(
            journeyId,
            undefined, // 获取所有活动
            userId,
          );
          this.logger.debug(
            `[AI Assistant] 批量接口返回的活动数量: ${activitiesResult.totalCount}, 天数分组数: ${Object.keys(activitiesResult.activities).length}`,
          );
          
          // 如果通过批量接口获取到了活动，说明days数据可能在其他地方
          // 但由于无法重构完整的days结构，我们只能记录警告
          if (activitiesResult.totalCount > 0) {
            this.logger.warn(
              `[AI Assistant] 发现 ${activitiesResult.totalCount} 个活动，但无法关联到days结构。可能需要重建days数据。`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[AI Assistant] 批量获取活动失败: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      // 验证数据完整性（用于调试）
      const daysWithCoordinates = itineraryDetail.days?.filter(
        (day) => day.timeSlots?.some((slot) => slot.coordinates),
      ) || [];
      const totalTimeSlots = itineraryDetail.days?.reduce(
        (sum, day) => sum + (day.timeSlots?.length || 0),
        0,
      ) || 0;
      const timeSlotsWithCoordinates = itineraryDetail.days?.reduce(
        (sum, day) =>
          sum +
          (day.timeSlots?.filter((slot) => slot.coordinates)?.length || 0),
        0,
      ) || 0;

      this.logger.debug(
        `[AI Assistant] 行程数据完整性检查: 目的地=${destinationName}, 天数=${itineraryDetail.daysCount}, 总时间段=${totalTimeSlots}, 有坐标的时间段=${timeSlotsWithCoordinates}, 有坐标的天数=${daysWithCoordinates.length}`,
      );

      // 构建行程 JSON 数据（用于上下文）
      // 添加更详细的日志，帮助调试数据传递问题
      if (totalTimeSlots === 0) {
        this.logger.warn(
          `[AI Assistant] 警告：行程 ${journeyId} 没有时间段数据，可能影响AI分析`,
        );
        // 记录原始实体数据用于调试
        this.logger.debug(
          `[AI Assistant] 原始实体数据: days字段类型=${typeof (itinerary as any).days}, days是数组=${Array.isArray((itinerary as any).days)}, days长度=${(itinerary as any).days?.length || 0}`,
        );
        // 检查是否有活动数据
        if ((itinerary as any).days && Array.isArray((itinerary as any).days)) {
          const totalActivitiesInEntity = (itinerary as any).days.reduce(
            (sum: number, day: any) => sum + (Array.isArray(day.activities) ? day.activities.length : 0),
            0,
          );
          this.logger.debug(
            `[AI Assistant] 实体中的活动总数: ${totalActivitiesInEntity}`,
          );
        }
      }

      const planJson = JSON.stringify(itineraryDetail, null, 2);
      
      // 记录传递给AI的数据大小（用于调试）
      this.logger.debug(
        `[AI Assistant] 传递给AI的JSON数据大小: ${planJson.length} 字符, 天数=${itineraryDetail.daysCount}, 时间段=${totalTimeSlots}`,
      );
      
      // 如果数据为空，记录完整的itineraryDetail结构用于调试
      if (totalTimeSlots === 0) {
        this.logger.warn(
          `[AI Assistant] 完整itineraryDetail结构: ${JSON.stringify(itineraryDetail, null, 2).substring(0, 1000)}`,
        );
      }

      // 生成对话ID（如果未提供）
      const conversationId = dto.conversationId || crypto.randomUUID();
      const language = dto.language || 'zh-CN';

      // 检测是否为首次对话（没有 conversationId 且消息为空或特定欢迎触发词）
      const isFirstMessage = !dto.conversationId && (
        !dto.message.trim() || 
        /^(你好|您好|hi|hello|开始|start)$/i.test(dto.message.trim())
      );

      // 如果是首次对话，返回预设的欢迎语
      if (isFirstMessage) {
        // 检查是否有行程数据
        const hasDaysData = itineraryDetail.days && itineraryDetail.days.length > 0;
        const daysCount = itineraryDetail.daysCount || 0;
        
        let welcomeMessage = `尊敬的贵宾，您好。

我是 **Nara**，您的专属旅行管家。我已审阅了您前往 **${destinationName}** 的行程安排。`;

        if (!hasDaysData || daysCount === 0) {
          welcomeMessage += `\n\n**注意**：当前行程尚未包含具体的日程安排。`;
        } else {
          welcomeMessage += `行程共 **${daysCount}** 天。`;
        }

        welcomeMessage += `\n\n基于我 20 年的高端定制旅行经验，我将为您提供以下专业服务：

**核心服务内容：**

- **路线优化分析**：基于地理位置与交通网络，评估行程效率，提供具体优化方案
- **深度本地洞察**：分享地道游览方式、最佳时间安排、餐厅预约要求等实用信息
- **风险识别与预案**：主动识别潜在问题（如闭馆日、天气影响等），并提供备选方案
- **预算匹配评估**：分析行程安排与预算的匹配度，提供务实建议`;

        if (!hasDaysData || daysCount === 0) {
          welcomeMessage += `\n\n当您完成行程安排后，我可以为您提供更详细的路线优化和实用建议。`;
        } else {
          welcomeMessage += `\n\n您可随时提出任何关于行程的疑问，我将以专业、周到的服务为您解答。`;
        }

        // 保存欢迎消息（作为assistant消息）
        await this.itineraryRepository.saveConversationMessage(
          conversationId,
          journeyId,
          userId,
          'assistant',
          welcomeMessage,
        );

        return {
          success: true,
          response: welcomeMessage,
          conversationId,
          message: '欢迎语已发送',
        };
      }

      // 保存用户消息
      await this.itineraryRepository.saveConversationMessage(
        conversationId,
        journeyId,
        userId,
        'user',
        dto.message,
      );

      // 获取对话历史（用于上下文）
      const historyMessages = await this.itineraryRepository.getConversationHistory(
        conversationId,
        20, // 最多加载最近20条消息
      );

      // 构建系统提示词
      const systemMessage = `身份设定：

你是 **Nara**，一位拥有 20 年高端定制旅行经验的首席旅行管家 (Senior Concierge)。你精通全球地理、复杂的交通物流、米其林餐饮体系以及各地深度的文化禁忌。

**重要**：在任何回复中，你都必须以"Nara"的身份出现。这是你的名字，你可以说"我是 Nara"或"作为您的专属旅行管家 Nara"。严禁使用其他品牌名称或身份。

当前上下文：

用户正在查阅前往 **${destinationName}** 的行程。

完整行程数据：${planJson}

**重要提示**：
- 如果行程数据中的 days 数组为空或所有 timeSlots 为空，说明行程尚未包含具体的活动安排
- 在这种情况下，你可以：
  a. 建议用户先添加活动到行程中
  b. 提供目的地的一般性建议和推荐
  c. 如果用户提出修改需求，礼貌地说明需要先有活动才能进行修改

你的核心职责与服务标准：

1. **专家级路线优化 (Logistical Precision)**：
   - 当用户询问路线是否合理时，严禁使用模棱两可的回答。
   - **必须**基于地理位置分析景点分布。如果发现行程存在"折返跑"或效率低下，请直言不讳地指出，并提供**具体的优化方案**。
   - 在建议路线时，必须附带**具体的交通方式及预估耗时**（例如："建议打车，约 15 分钟，费用约 2000 日元，因为该路段地铁换乘复杂"）。

2. **深度本地洞察 (Insider Knowledge)**：
   - 不要只介绍景点是什么，要告诉用户**怎么玩才地道**（例如："不要上午去，下午 4 点的光线最适合拍照"）。
   - 在推荐餐厅时，需提及预约难度或着装要求。

3. **批判性思维 (Critical Analysis)**：
   - 如果用户的预算与行程不匹配（例如经济型预算想吃顶级怀石料理），请礼貌但务实地提醒。
   - 主动识别行程中的隐形风险（如：该地区周一博物馆闭馆、雨季备选方案等）。

4. **回复格式规范**：
   - **语气**：专业、沉稳、周到、有条理。使用"您"而非"你"。拒绝过度活泼、幼稚或过于随意的语气。保持高端服务管家的专业姿态。
   - **身份一致性**：你的名字是 Nara。可以适当提及"我是 Nara"或"作为您的专属旅行管家 Nara"，但不要过度重复。严禁在回复中自称其他品牌或身份。
   - **排版**：充分使用 Markdown 格式。关键信息（时间、地点、费用、重要提示）必须**加粗**。复杂建议使用有序或无序列表。段落之间适当留白，提高可读性。
   - **路线展示**：使用箭头符号（**地点A → 地点B → 地点C**）清晰展示流线。
   - **回复结构**：对于复杂问题，使用清晰的段落结构，先总结要点，再展开细节。

5. **行程修改能力 (Itinerary Modification)**：
   - 当用户提出修改行程的需求时（如："把第一天的第一个活动改成10点开始"、"优化第一天的路线"、"删除某个活动"等），你需要：
     a. **识别修改意图**：准确理解用户想要修改的内容（活动、时间、地点、顺序等）
     b. **理解修改原因**：分析用户修改的意图和原因
     c. **生成修改建议**：生成结构化的修改建议（JSON格式）
     d. **文本说明**：在文本回复中清晰说明修改内容和原因
   
   - **修改类型**：
     - modify：修改现有活动（时间、标题、地点等）
     - add：在指定天数添加新活动
     - delete：删除指定活动
     - reorder：重新排列活动的顺序（路线优化）
   
   - **修改建议格式**（必须在回复末尾以JSON代码块形式提供）：
     使用三个反引号包裹JSON代码块，格式如下：
     [JSON代码块开始]
     {
       "modifications": [
         {
           "type": "modify",
           "target": {
             "day": 1,
             "activityId": "activity-id-from-plan-json"
           },
           "changes": {
             "time": "10:00"
           },
           "reason": "将活动时间调整为10:00，提供更充足的准备时间"
         }
       ]
     }
     [JSON代码块结束]
   
   - **重要规则**：
     - 必须从提供的行程JSON数据中获取准确的 activityId 或 dayId
     - 如果无法确定具体的ID，使用 day 序号（1-based）和活动在当天的位置
     - 修改建议必须与文本回复一致
     - 在提供修改建议前，先询问用户是否确认执行修改
     - **如果行程中没有活动数据（timeSlots为空）**：
       - 不要生成修改建议
       - 礼貌地说明需要先添加活动才能进行修改
       - 可以提供添加活动的建议

6. **回复示例风格**：
   - ✅ 正确："尊敬的贵宾，我是 Nara。基于您这份 **3天2晚瑞士卢塞恩** 的行程，我为您梳理了以下亮点..."
   - ✅ 正确："作为您的专属旅行管家 Nara，我建议..."
   - ✅ 正确（修改场景）："尊敬的贵宾，我理解您希望将第一天的第一个活动调整为 **10:00** 开始。根据您的行程安排，这可以让您有更充足的准备时间。\n\n**修改建议：**\n\`\`\`json\n{...}\n\`\`\`\n\n请确认是否执行此修改？"
   - ❌ 错误："我是 WanderAI 助手..."（错误品牌）
   - ❌ 错误："哈哈，这个行程不错！"（过于随意）

请始终使用简体中文回答，保持专业、沉稳、周到的管家服务姿态。`;

      // 构建消息数组（包含系统提示、历史对话和当前消息）
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemMessage },
      ];

      // 添加历史消息（排除系统消息和当前用户消息）
      for (const historyMsg of historyMessages) {
        if (historyMsg.role === 'user' || historyMsg.role === 'assistant') {
          messages.push({
            role: historyMsg.role,
            content: historyMsg.content,
          });
        }
      }

      // 添加当前用户消息
      messages.push({ role: 'user', content: dto.message });

      // 调用 LLM 生成回复
      const response = await this.llmService.chatCompletion({
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        maxOutputTokens: 2000, // 增加token限制，支持更详细的格式化回复和修改建议
      });

      const responseText = response.trim();
      
      // 尝试从回复中提取修改建议（JSON格式）
      // 只有在有活动数据时才提取修改建议
      let modifications: ModificationSuggestionDto[] | undefined;
      const hasActivities = totalTimeSlots > 0;

      if (hasActivities) {
        try {
          // 尝试从回复中提取 JSON 代码块
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            const jsonData = JSON.parse(jsonMatch[1].trim());
            if (jsonData.modifications && Array.isArray(jsonData.modifications)) {
              // 验证并转换修改建议
              const validModifications: ModificationSuggestionDto[] = [];
              for (const mod of jsonData.modifications) {
                if (
                  mod.type &&
                  ['modify', 'add', 'delete', 'reorder'].includes(mod.type) &&
                  mod.target
                ) {
                  validModifications.push(mod as ModificationSuggestionDto);
                }
              }
              if (validModifications.length > 0) {
                modifications = validModifications;
                this.logger.debug(
                  `[AI Assistant] 提取到 ${modifications.length} 个修改建议`,
                );
              }
            }
          }
        } catch (error) {
          // 如果解析失败，记录日志但不影响正常回复
          this.logger.debug(
            `[AI Assistant] 未能从回复中提取修改建议: ${error instanceof Error ? error.message : error}`,
          );
        }
      } else {
        this.logger.debug(
          `[AI Assistant] 行程没有活动数据（总时间段=${totalTimeSlots}），跳过修改建议提取`,
        );
      }

      // 保存AI回复
      await this.itineraryRepository.saveConversationMessage(
        conversationId,
        journeyId,
        userId,
        'assistant',
        responseText,
        modifications ? { modifications } : undefined,
      );

      return {
        success: true,
        response: responseText,
        conversationId,
        message: '回复成功',
        modifications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to chat with assistant for journey ${journeyId}`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(
        `助手回复失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 获取对话历史
   */
  async getConversationHistory(
    journeyId: string,
    conversationId: string,
    userId: string,
  ) {
    // 检查行程所有权
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    if (itinerary.userId !== userId) {
      throw new ForbiddenException('无权访问此行程的对话历史');
    }

    // 获取对话历史
    const messages = await this.itineraryRepository.getConversationHistory(
      conversationId,
    );

    // 验证对话属于此行程
    if (messages.length > 0 && messages[0].journeyId !== journeyId) {
      throw new ForbiddenException('对话不属于此行程');
    }

    // 转换为DTO
    return {
      success: true,
      conversationId,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sequence: msg.sequence,
        metadata: msg.metadata || undefined,
        createdAt: msg.createdAt,
      })),
      totalCount: messages.length,
    };
  }
}

