import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  GenerateTravelSummaryRequestDto,
  TravelSummaryDataDto,
  DayDto,
  ActivityDto,
} from './dto/travel-summary.dto';

interface ActivityStats {
  type: string;
  count: number;
}

interface ActivitySummary {
  day: number;
  title: string;
  description: string;
}

@Injectable()
export class TravelSummaryService {
  private readonly logger = new Logger(TravelSummaryService.name);

  // 目的地专属模板
  private readonly destinationTemplates: Record<string, string> = {
    斐济: '斐济群岛的{days}天之旅，融合了{highlights}，让您在这个南太平洋天堂中感受{experience}。',
    瑞士: '瑞士{days}天的精彩旅程，从{highlights}，体验{experience}，感受{feeling}。',
    日本: '日本{days}天的深度探索，{highlights}，{experience}，领略{feeling}。',
  };

  // 通用模板
  private readonly genericTemplate =
    '{days}天的{destination}之旅，行程包含{activityCount}个精彩活动，涵盖{types}等多种类型，让您{experience}，感受{feeling}。';

  constructor(private readonly llmService: LlmService) {}

  async generateSummary(
    dto: GenerateTravelSummaryRequestDto,
  ): Promise<TravelSummaryDataDto> {
    try {
      // 数据分析
      const analysis = this.analyzeItinerary(dto.itinerary);

      // 尝试使用AI生成摘要
      try {
        const aiSummary = await this.generateSummaryWithAI(
          dto.destination,
          analysis.days,
          analysis.activityTypes,
          analysis.activitySummaries,
        );

        return {
          summary: aiSummary,
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        // 如果是 BadRequestException（超时或AI服务错误），记录警告并使用模板回退
        if (error instanceof BadRequestException) {
          this.logger.warn(
            `AI summary generation failed: ${error.message}, using fallback template`,
          );
        } else {
          this.logger.warn(
            `AI summary generation failed, using fallback template`,
            error,
          );
        }

        // 使用模板回退
        const templateSummary = this.generateSummaryWithTemplate(
          dto.destination,
          analysis.days,
          analysis.activityTypes,
          analysis.activitySummaries,
        );

        return {
          summary: templateSummary,
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error('Failed to generate travel summary', error);
      // 最终回退：生成最基础的摘要
      const basicSummary = this.generateBasicSummary(
        dto.destination,
        dto.itinerary.days.length,
      );
      return {
        summary: basicSummary,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private analyzeItinerary(itinerary: {
    days: DayDto[];
  }): {
    days: number;
    activityTypes: ActivityStats[];
    activitySummaries: ActivitySummary[];
    uniqueActivities: string[];
  } {
    // 边界检查：确保 days 数组存在
    if (!itinerary?.days || itinerary.days.length === 0) {
      this.logger.warn('Empty itinerary days array');
      return {
        days: 0,
        activityTypes: [],
        activitySummaries: [],
        uniqueActivities: [],
      };
    }

    const days = itinerary.days.length;
    const activityTypesMap = new Map<string, number>();
    const uniqueActivitiesSet = new Set<string>();
    const activitySummaries: ActivitySummary[] = [];

    // 遍历所有天数和活动
    itinerary.days.forEach((day) => {
      // 边界检查：确保 activities 数组存在
      if (!day?.activities || day.activities.length === 0) {
        return;
      }

      day.activities.forEach((activity) => {
        // 统计活动类型
        const type = activity.type || 'attraction';
        activityTypesMap.set(type, (activityTypesMap.get(type) || 0) + 1);

        // 收集唯一活动标题
        if (activity.title) {
          uniqueActivitiesSet.add(activity.title);
        }

        // 收集前10个活动的详细信息
        if (activitySummaries.length < 10 && activity.title) {
          activitySummaries.push({
            day: day.day || 1,
            title: activity.title,
            description: activity.notes || activity.title,
          });
        }
      });
    });

    // 转换为数组格式
    const activityTypes: ActivityStats[] = Array.from(
      activityTypesMap.entries(),
    ).map(([type, count]) => ({ type, count }));

    return {
      days,
      activityTypes,
      activitySummaries,
      uniqueActivities: Array.from(uniqueActivitiesSet),
    };
  }

  private async generateSummaryWithAI(
    destination: string,
    days: number,
    activityTypes: ActivityStats[],
    activitySummaries: ActivitySummary[],
  ): Promise<string> {
    // 边界检查：如果没有活动数据，抛出异常使用模板回退
    if (activityTypes.length === 0 || activitySummaries.length === 0) {
      this.logger.warn('No activity data available for AI summary generation');
      throw new BadRequestException(
        '行程数据不足，将使用模板生成摘要。',
      );
    }

    // 构建类型摘要
    const typeSummary = activityTypes
      .map((stat) => `${stat.type}: ${stat.count}个`)
      .join(', ');

    // 构建活动摘要
    const activitySummary = activitySummaries
      .map(
        (act) =>
          `第${act.day}天：${act.title} - ${(act.description || '').substring(0, 30)}...`,
      )
      .join('\n');

    const prompt = `请为以下${days}天的${destination}旅行行程生成一个生动、吸引人的中文摘要，要求：

1. 长度控制在100-150字之间
2. 语言要生动有趣，富有感染力
3. 突出旅行的亮点和特色
4. 体现行程的丰富性和多样性
5. 使用积极正面的词汇

行程信息：
- 目的地：${destination}
- 天数：${days}天
- 活动类型分布：${typeSummary}
- 主要活动：
${activitySummary}

请生成一个吸引人的旅行摘要：`;

    this.logger.log(`Generating AI summary for ${days} days in ${destination}`);
    this.logger.debug(`Prompt length: ${prompt.length} characters`);

    const startTime = Date.now();
    let summary: string;

    try {
      summary = await this.llmService.chatCompletion(
        this.llmService.buildChatCompletionOptions({
          messages: [
            {
              role: 'system',
              content: '你是一个专业的AI助手，能够生成高质量的内容。',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          maxOutputTokens: 1500,
        }),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Summary generation completed in ${duration}ms for ${destination}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `LLM request failed after ${duration}ms for ${destination}`,
        error,
      );

      // 检查是否是超时错误（180秒）
      if (
        error instanceof Error &&
        (error.message.includes('timeout') ||
          error.message.includes('ETIMEDOUT') ||
          duration > 180000)
      ) {
        // 超时错误：抛出异常，让外层回退到模板生成
        throw new BadRequestException(
          `摘要生成超时（${Math.round(duration / 1000)}秒）。将使用模板生成摘要。`,
        );
      }

      // 其他错误：也抛出异常，让外层回退
      throw new BadRequestException(
        `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}。将使用模板生成摘要。`,
      );
    }

    // 验证和调整长度
    return this.adjustSummaryLength(summary.trim());
  }

  private generateSummaryWithTemplate(
    destination: string,
    days: number,
    activityTypes: ActivityStats[],
    activitySummaries: ActivitySummary[],
  ): string {
    // 检查是否有目的地专属模板
    const destinationKey = this.getDestinationKey(destination);
    const template = this.destinationTemplates[destinationKey] || this.genericTemplate;

    // 提取亮点活动（前3个）
    const highlights = activitySummaries
      .slice(0, 3)
      .map((act) => act.title)
      .join('、');

    // 统计活动总数
    const activityCount = activityTypes.reduce((sum, stat) => sum + stat.count, 0);

    // 提取类型名称
    const types = activityTypes
      .map((stat) => this.getTypeName(stat.type))
      .join('、');

    // 生成体验描述
    const experience = this.generateExperienceDescription(activityTypes);
    const feeling = this.generateFeelingDescription(destination, activityTypes);

    // 替换模板变量
    let summary = template
      .replace(/{days}/g, days.toString())
      .replace(/{destination}/g, destination)
      .replace(/{highlights}/g, highlights || '精彩活动')
      .replace(/{activityCount}/g, activityCount.toString())
      .replace(/{types}/g, types || '多种')
      .replace(/{experience}/g, experience)
      .replace(/{feeling}/g, feeling);

    // 调整长度
    return this.adjustSummaryLength(summary);
  }

  private generateBasicSummary(destination: string, days: number): string {
    return `${days}天的${destination}之旅，行程丰富多样，包含多个精彩活动，让您深度体验当地文化和自然风光，感受旅行的美好与难忘。`;
  }

  private adjustSummaryLength(summary: string): string {
    // 目标长度：100-150字
    const minLength = 100;
    const maxLength = 150;

    // 计算中文字符数（排除标点）
    const chineseCharCount = summary.replace(/[^\u4e00-\u9fa5]/g, '').length;

    if (chineseCharCount < minLength) {
      // 如果太短，添加补充描述
      summary += '行程安排合理，时间充裕，让您充分享受每一刻的美好时光。';
    } else if (chineseCharCount > maxLength) {
      // 如果太长，截取到合适长度
      let truncated = '';
      let charCount = 0;
      for (const char of summary) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          charCount++;
        }
        truncated += char;
        if (charCount >= maxLength) {
          break;
        }
      }
      summary = truncated + '...';
    }

    return summary;
  }

  private getDestinationKey(destination: string): string {
    // 提取目的地关键词
    if (destination.includes('斐济')) return '斐济';
    if (destination.includes('瑞士')) return '瑞士';
    if (destination.includes('日本')) return '日本';
    return '';
  }

  private getTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      attraction: '景点',
      meal: '美食',
      hotel: '住宿',
      shopping: '购物',
      transport: '交通',
      ocean: '海洋活动',
    };
    return typeMap[type] || type;
  }

  private generateExperienceDescription(
    activityTypes: ActivityStats[],
  ): string {
    const descriptions: string[] = [];

    activityTypes.forEach((stat) => {
      switch (stat.type) {
        case 'attraction':
          descriptions.push('探索当地著名景点');
          break;
        case 'meal':
          descriptions.push('品尝地道美食');
          break;
        case 'ocean':
          descriptions.push('体验海洋活动');
          break;
        case 'shopping':
          descriptions.push('享受购物乐趣');
          break;
      }
    });

    if (descriptions.length === 0) {
      return '体验丰富多彩的旅行活动';
    }

    return descriptions.slice(0, 3).join('、');
  }

  private generateFeelingDescription(
    destination: string,
    activityTypes: ActivityStats[],
  ): string {
    const feelings = [
      '独特的文化魅力',
      '自然风光的壮美',
      '当地生活的美好',
      '旅行的无限乐趣',
      '难忘的回忆',
    ];

    // 根据活动类型选择合适的感觉描述
    if (activityTypes.some((stat) => stat.type === 'ocean')) {
      return '海洋的广阔与自由';
    }
    if (activityTypes.some((stat) => stat.type === 'attraction')) {
      return '历史文化的深厚底蕴';
    }

    return feelings[Math.floor(Math.random() * feelings.length)];
  }
}

