import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  DetectIntentRequestDto,
  DetectIntentResponseDto,
  IntentDataDto,
  RecommendDestinationsRequestDto,
  RecommendDestinationsResponseDto,
  RecommendDestinationsDataDto,
  GenerateInspirationItineraryRequestDto,
  GenerateItineraryResponseDto,
  GenerateItineraryDataDto,
  ExtractDaysRequestDto,
  ExtractDaysResponseDto,
  ExtractDaysDataDto,
} from './dto/inspiration.dto';

interface AiIntentResponse {
  intentType: string;
  keywords: string[];
  emotionTone: string;
  description: string;
  confidence?: number;
}

interface AiRecommendDestinationsResponse {
  locations: string[];
  locationDetails?: Record<string, {
    country?: string;
    description?: string;
    highlights?: string[];
    bestSeason?: string;
    coverImage?: string;
    budget?: {
      low?: number;
      medium?: number;
      high?: number;
      currency?: string;
      description?: string;
    };
  }>;
  reasoning?: string;
}

interface AiGenerateItineraryResponse {
  title: string;
  destination?: string;
  location?: string;
  locations?: string[];
  duration: string | number;
  days?: Array<{
    day: number;
    date: string;
    theme?: string;
    mood?: string;
    summary?: string;
    timeSlots: Array<{
      time: string;
      title?: string;
      activity?: string;
      coordinates?: { lat: number; lng: number };
      type?: string;
      duration?: number;
      cost?: number;
      details?: Record<string, unknown>;
    }>;
  }>;
  hasFullItinerary?: boolean;
  generationMode?: 'full' | 'candidates';
  highlights?: string[];
}

interface AiExtractDaysResponse {
  days: number | null;
  confidence?: number;
}

@Injectable()
export class InspirationService {
  private readonly logger = new Logger(InspirationService.name);

  constructor(private readonly llmService: LlmService) {}

  async detectIntent(
    dto: DetectIntentRequestDto,
  ): Promise<DetectIntentResponseDto> {
    try {
      const language = dto.language || 'zh-CN';
      const systemMessage = `你是一个专业的旅行意图分析助手。请分析用户的自然语言输入，识别旅行意图、提取关键词、判断情感倾向。

意图类型包括：
- photography_exploration: 摄影探索
- cultural_exchange: 文化交流
- emotional_healing: 情感疗愈
- mind_healing: 心灵疗愈
- extreme_exploration: 极限探索
- urban_creation: 城市创作

情感倾向包括：calm（平静）、active（活跃）、romantic（浪漫）、adventurous（冒险）、peaceful（平和）等。

请以JSON格式返回结果，包含以下字段：
- intentType: 意图类型
- keywords: 关键词数组
- emotionTone: 情感倾向
- description: 意图描述
- confidence: 置信度（0-1）`;

      let userMessage = `用户输入：${dto.input}`;

      // 如果有兴趣偏好，添加到提示词中
      if (dto.interests && dto.interests.length > 0) {
        userMessage += `\n\n用户兴趣偏好：${dto.interests.join('、')}`;
      }

      // 如果有预算信息，添加到提示词中
      if (dto.budget) {
        const budgetMap: Record<string, string> = {
          low: '经济型',
          medium: '舒适型',
          high: '豪华型',
          economy: '经济型',
          comfort: '舒适型',
          luxury: '豪华型',
        };
        userMessage += `\n预算等级：${budgetMap[dto.budget] || dto.budget}`;
      }

      // 如果有天数信息，添加到提示词中
      if (dto.days) {
        userMessage += `\n旅行天数：${dto.days}天`;
      }

      userMessage += `\n\n请综合考虑用户的输入、兴趣偏好、预算和天数等信息，分析这个输入的旅行意图。`;

      const response = await this.llmService.chatCompletionJson<AiIntentResponse>(
        await this.llmService.buildChatCompletionOptions({
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          json: true,
          provider: 'gemini', // 强制使用 Gemini 1.5 Flash（高频低延迟分类任务）
          model: 'gemini-1.5-flash', // Gemini 1.5 Flash 模型
        }),
      );

      const result: IntentDataDto = {
        intentType: response.intentType || 'cultural_exchange',
        keywords: response.keywords || [],
        emotionTone: response.emotionTone || 'calm',
        description: response.description || '未识别的旅行意图',
        confidence: response.confidence,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to detect intent', error);
      throw error;
    }
  }

  async recommendDestinations(
    dto: RecommendDestinationsRequestDto,
  ): Promise<RecommendDestinationsResponseDto> {
    try {
      const language = dto.language || 'zh-CN';
      let intent = dto.intent;

      // 如果没有提供意图，先识别意图
      if (!intent) {
        const intentResult = await this.detectIntent({
          input: dto.input,
          language,
        });
        intent = {
          intentType: intentResult.data.intentType,
          keywords: intentResult.data.keywords,
          emotionTone: intentResult.data.emotionTone,
        };
      }

      const limit = dto.limit || 10;
      const systemMessage = `你是一个专业的旅行目的地推荐助手。根据用户的旅行意图和需求，推荐${limit}个候选目的地。

请考虑以下因素：
1. 用户的旅行意图和情感倾向
2. 用户所在国家、国籍、签证情况
3. 目的地的特色和亮点
4. 最佳旅行季节
5. 目的地的预算水平
6. 目的地的代表性图片

请以JSON格式返回结果，包含以下字段：
- locations: 推荐的目的地列表（${limit}个）
- locationDetails: 可选，目的地详情对象，key为目的地名称，每个目的地包含：
  * country: 国家名称
  * description: 目的地描述（50-100字）
  * highlights: 亮点列表（3-5个，如：极光、温泉、冰川）
  * bestSeason: 最佳旅行季节
  * coverImage: 目的地封面图片URL（使用Unsplash或Pexels的图片URL，格式：https://images.unsplash.com/photo-xxx 或 https://images.pexels.com/photos/xxx）
  * budget: 预算信息对象，包含：
    - low: 经济型预算（每人每天，人民币）
    - medium: 舒适型预算（每人每天，人民币）
    - high: 豪华型预算（每人每天，人民币）
    - currency: 货币代码（默认CNY）
    - description: 预算说明文字
- reasoning: 推荐理由`;

      let userMessage = `用户输入：${dto.input}
意图类型：${intent.intentType}
关键词：${intent.keywords.join(', ')}
情感倾向：${intent.emotionTone}`;

      if (dto.userCountry) {
        userMessage += `\n用户所在国家：${dto.userCountry}`;
      }
      if (dto.userNationality) {
        userMessage += `\n用户国籍：${dto.userNationality}`;
      }
      if (dto.visaInfoSummary) {
        userMessage += `\n签证信息：${dto.visaInfoSummary}`;
      }
      if (dto.visaFreeDestinations && dto.visaFreeDestinations.length > 0) {
        userMessage += `\n免签目的地：${dto.visaFreeDestinations.join(', ')}`;
      }

      userMessage += `\n\n请推荐${limit}个目的地。`;

      const response =
        await this.llmService.chatCompletionJson<AiRecommendDestinationsResponse>(
          await this.llmService.buildChatCompletionOptions({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            json: true,
            provider: 'gemini', // 强制使用 Gemini 1.5 Pro（推荐需要创造力和联想能力）
            model: 'gemini-1.5-pro', // Gemini 1.5 Pro 模型
          }),
        );

      const result: RecommendDestinationsDataDto = {
        locations: response.locations || [],
        locationDetails: response.locationDetails,
        reasoning: response.reasoning,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to recommend destinations', error);
      throw error;
    }
  }

  async generateItinerary(
    dto: GenerateInspirationItineraryRequestDto,
  ): Promise<GenerateItineraryResponseDto> {
    try {
      const language = dto.language || 'zh-CN';
      const mode = dto.mode || 'full';
      let intent = dto.intent;

      // 如果没有提供意图，先识别意图
      if (!intent) {
        const intentResult = await this.detectIntent({
          input: dto.input,
          language,
        });
        intent = {
          intentType: intentResult.data.intentType,
          keywords: intentResult.data.keywords,
          emotionTone: intentResult.data.emotionTone,
        };
      }

      // 提取天数（如果未提供）
      let days = dto.userRequestedDays;
      if (!days) {
        const daysResult = await this.extractDays({
          input: dto.input,
          language,
        });
        days = daysResult.data.days || 5; // 默认5天
      }

      if (mode === 'candidates') {
        // 候选模式：返回目的地列表
        const destinationsResult = await this.recommendDestinations({
          input: dto.input,
          intent,
          language,
          userCountry: dto.userCountry,
          userNationality: dto.userNationality,
          userPermanentResidency: dto.userPermanentResidency,
          heldVisas: dto.heldVisas,
          visaFreeDestinations: dto.visaFreeDestinations,
          visaInfoSummary: dto.visaInfoSummary,
          limit: 10,
        });

        return {
          success: true,
          data: {
            title: '推荐目的地',
            locations: destinationsResult.data.locations,
            duration: `${days}天`,
            generationMode: 'candidates',
            hasFullItinerary: false,
          },
        };
      }

      // 完整模式：生成详细行程
      const destination = dto.selectedDestination || '未指定目的地';

      const systemMessage = `你是一个专业的旅行规划师。根据用户的旅行意图和需求，生成详细的旅行行程。

请生成包含以下内容的行程：
1. 标题：富有吸引力的行程标题
2. 目的地：明确的目的地
3. 天数详情：每天的活动安排，包括：
   - 日期
   - 主题
   - 情绪/氛围
   - 时间段列表（时间、活动、坐标、类型、持续时间、费用等）

请以JSON格式返回结果。`;

      let userMessage = `用户输入：${dto.input}
目的地：${destination}
天数：${days}天
意图类型：${intent.intentType}
关键词：${intent.keywords.join(', ')}
情感倾向：${intent.emotionTone}`;

      if (dto.transportPreference) {
        userMessage += `\n交通偏好：${dto.transportPreference}`;
      }

      userMessage += `\n\n请生成详细的${days}天行程安排。`;

      const response =
        await this.llmService.chatCompletionJson<AiGenerateItineraryResponse>(
          await this.llmService.buildChatCompletionOptions({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            json: true,
            provider: 'deepseek', // 强制使用 DeepSeek-V3（灵感行程生成，低成本高并发）
            model: 'deepseek-chat', // DeepSeek-V3 模型
          }),
        );

      const result: GenerateItineraryDataDto = {
        title: response.title || `${destination} ${days}天行程`,
        destination: response.destination || destination,
        location: response.location || destination,
        duration: response.duration || `${days}天`,
        days: response.days,
        hasFullItinerary: true,
        generationMode: 'full',
        highlights: response.highlights,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to generate itinerary', error);
      throw error;
    }
  }

  async extractDays(
    dto: ExtractDaysRequestDto,
  ): Promise<ExtractDaysResponseDto> {
    try {
      const language = dto.language || 'zh-CN';

      // 先尝试使用规则提取
      const ruleBasedDays = this.extractDaysByRules(dto.input);
      if (ruleBasedDays !== null) {
        return {
          success: true,
          data: {
            days: ruleBasedDays,
            confidence: 0.9,
          },
        };
      }

      // 如果规则提取失败，使用AI提取
      const systemMessage = `你是一个专业的文本分析助手。请从用户输入中提取旅行天数。

如果输入中包含天数信息（如"5天"、"一周"、"3-5天"等），请提取并返回数字。
如果无法提取，返回null。

请以JSON格式返回结果，包含以下字段：
- days: 天数（数字或null）
- confidence: 置信度（0-1）`;

      const userMessage = `用户输入：${dto.input}

请提取其中的旅行天数。`;

      const response =
        await this.llmService.chatCompletionJson<AiExtractDaysResponse>(
          await this.llmService.buildChatCompletionOptions({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            json: true,
            provider: 'deepseek', // 强制使用 DeepSeek-V3（简单实体抽取，低成本）
            model: 'deepseek-chat', // DeepSeek-V3 模型
          }),
        );

      return {
        success: true,
        data: {
          days: response.days,
          confidence: response.confidence,
        },
      };
    } catch (error) {
      this.logger.error('Failed to extract days', error);
      // 返回默认值
      return {
        success: true,
        data: {
          days: null,
          confidence: 0,
        },
      };
    }
  }

  private extractDaysByRules(input: string): number | null {
    // 数字 + 天
    const dayPattern1 = /(\d+)\s*天/g;
    const match1 = input.match(dayPattern1);
    if (match1) {
      const days = parseInt(match1[0].replace(/\D/g, ''), 10);
      if (days >= 1 && days <= 30) {
        return days;
      }
    }

    // 数字 + 日
    const dayPattern2 = /(\d+)\s*日/g;
    const match2 = input.match(dayPattern2);
    if (match2) {
      const days = parseInt(match2[0].replace(/\D/g, ''), 10);
      if (days >= 1 && days <= 30) {
        return days;
      }
    }

    // 周
    const weekPattern = /(\d+)\s*周/g;
    const match3 = input.match(weekPattern);
    if (match3) {
      const weeks = parseInt(match3[0].replace(/\D/g, ''), 10);
      if (weeks >= 1 && weeks <= 4) {
        return weeks * 7;
      }
    }

    // 月
    const monthPattern = /(\d+)\s*月/g;
    const match4 = input.match(monthPattern);
    if (match4) {
      const months = parseInt(match4[0].replace(/\D/g, ''), 10);
      if (months >= 1 && months <= 1) {
        return months * 30;
      }
    }

    return null;
  }
}

