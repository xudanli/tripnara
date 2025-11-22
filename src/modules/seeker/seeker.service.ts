import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { InspirationService } from '../inspiration/inspiration.service';
import {
  GenerateSeekerTravelPlanRequestDto,
  GenerateSeekerTravelPlanResponseDto,
  GenerateSeekerTravelPlanDataDto,
  DayItineraryDto,
  ActivityDto,
  RecommendationsDto,
  DetectedIntentDto,
} from './dto/seeker.dto';

interface AiSeekerResponse {
  destination: string;
  duration: number;
  itinerary: Array<{
    day: number;
    title: string;
    theme?: string;
    activities: Array<{
      time: string;
      activity: string;
      type: string;
      location?: string;
      notes?: string;
    }>;
  }>;
  recommendations?: {
    accommodation?: string;
    transportation?: string;
    food?: string;
    tips?: string;
  };
}

@Injectable()
export class SeekerService {
  private readonly logger = new Logger(SeekerService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly inspirationService: InspirationService,
  ) {}

  async generateTravelPlan(
    dto: GenerateSeekerTravelPlanRequestDto,
  ): Promise<GenerateSeekerTravelPlanResponseDto> {
    try {
      const language = dto.language || 'zh-CN';

      // 构建用户输入描述
      const userInput = this.buildUserInput(dto);

      // 检测意图
      const intentResult = await this.inspirationService.detectIntent({
        input: userInput,
        language,
      });

      const detectedIntent: DetectedIntentDto = {
        intentType: intentResult.data.intentType,
        keywords: intentResult.data.keywords,
        emotionTone: intentResult.data.emotionTone,
        description: intentResult.data.description,
      };

      // 计算行程天数
      const days = this.calculateDays(dto.duration);

      // 构建系统提示词
      const systemMessage = `你是一个专业的旅行规划助手，专门为 Seeker 模式的用户生成个性化旅行计划。

Seeker 模式特点：
- 用户提供当前心情、期望体验、预算和时长
- 需要推荐适合的目的地
- 生成详细的每日行程安排
- 提供住宿、交通、美食等推荐

请根据用户需求，生成完整的旅行计划，包括：
1. 推荐目的地（符合用户心情和期望体验）
2. 详细的每日行程（每天的活动安排）
3. 推荐信息（住宿、交通、美食、提示）

请以JSON格式返回结果。`;

      const userMessage = this.buildUserMessage(dto, days);

      // 调用 LLM 生成行程
      const response =
        await this.llmService.chatCompletionJson<AiSeekerResponse>({
          provider: 'deepseek',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          json: true,
        });

      // 构建推荐信息
      const recommendations: RecommendationsDto = {
        accommodation: response.recommendations?.accommodation,
        transportation: response.recommendations?.transportation,
        food: response.recommendations?.food,
        tips: response.recommendations?.tips,
      };

      // 转换行程数据
      const itinerary: DayItineraryDto[] = response.itinerary.map((day) => ({
        day: day.day,
        title: day.title,
        theme: day.theme,
        activities: day.activities.map((activity) => ({
          time: activity.time,
          activity: activity.activity,
          type: activity.type,
          location: activity.location,
          notes: activity.notes,
        })),
      }));

      const result: GenerateSeekerTravelPlanDataDto = {
        destination: response.destination,
        duration: response.duration || days,
        itinerary,
        recommendations,
        detectedIntent,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to generate seeker travel plan', error);
      throw error;
    }
  }

  private buildUserInput(dto: GenerateSeekerTravelPlanRequestDto): string {
    const moodMap: Record<string, string> = {
      calm: '平静',
      active: '活跃',
      romantic: '浪漫',
      adventurous: '冒险',
      cultural: '文化',
    };

    const experienceMap: Record<string, string> = {
      sightseeing: '观光',
      nature: '自然',
      food: '美食',
      shopping: '购物',
      nightlife: '夜生活',
      adventure: '探险',
    };

    const budgetMap: Record<string, string> = {
      economy: '经济',
      comfort: '舒适',
      luxury: '奢华',
    };

    const durationMap: Record<string, string> = {
      weekend: '周末',
      week: '一周',
      extended: '长期',
    };

    return `我现在心情${moodMap[dto.currentMood]}，想要${experienceMap[dto.desiredExperience]}的体验，预算是${budgetMap[dto.budget]}，计划${durationMap[dto.duration]}旅行`;
  }

  private buildUserMessage(
    dto: GenerateSeekerTravelPlanRequestDto,
    days: number,
  ): string {
    let message = `用户需求：
- 当前心情：${dto.currentMood}
- 期望体验：${dto.desiredExperience}
- 预算范围：${dto.budget}
- 时长类型：${dto.duration}
- 行程天数：${days}天`;

    if (dto.userCountry) {
      message += `\n- 用户所在国家：${dto.userCountry}`;
    }
    if (dto.userNationality) {
      message += `\n- 用户国籍：${dto.userNationality}`;
    }

    message += `\n\n请生成${days}天的详细旅行计划。`;

    return message;
  }

  private calculateDays(duration: string): number {
    const durationMap: Record<string, number> = {
      weekend: 2,
      week: 7,
      extended: 14,
    };
    return durationMap[duration] || 5;
  }
}

