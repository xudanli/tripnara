import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { LlmService } from '../../llm/llm.service';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import {
  JourneyAssistantChatRequestDto,
  JourneyAssistantChatResponseDto,
  ModificationSuggestionDto,
  GetConversationHistoryResponseDto,
} from '../dto/itinerary.dto';
import { ItineraryEntity } from '../../persistence/entities/itinerary.entity';
import * as crypto from 'crypto';
import { PromptService } from './prompt.service';
import { ItineraryMapper } from './itinerary.mapper';

@Injectable()
export class JourneyAssistantService {
  private readonly logger = new Logger(JourneyAssistantService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly promptService: PromptService,
    private readonly itineraryMapper: ItineraryMapper,
  ) {}

  async chat(
    journeyId: string,
    userId: string,
    dto: JourneyAssistantChatRequestDto,
    itinerary: ItineraryEntity,
  ): Promise<JourneyAssistantChatResponseDto> {
    try {
      // 检查所有权
      if (itinerary.userId !== userId) {
        throw new ForbiddenException('无权访问此行程');
      }

      // 验证数据完整性
      const hasDays =
        itinerary.days &&
        Array.isArray(itinerary.days) &&
        itinerary.days.length > 0;
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
          `[AI Assistant] 警告：行程 ${journeyId} 没有days数据`,
        );
      }

      // 注意：这里需要调用 ItineraryService 的 entityToDetailWithTimeSlotsDto
      // 因为它包含复杂的货币推断逻辑
      // 为了简化，我们暂时直接使用 itinerary 实体，后续可以优化
      // 转换为前端格式（用于计算统计数据）
      // TODO: 将 entityToDetailWithTimeSlotsDto 移到 ItineraryMapper 中
      const itineraryDetail = await this.buildItineraryDetail(itinerary);
      const destinationName = itineraryDetail.destination || '未知目的地';

      // 计算统计数据
      const totalTimeSlots =
        itineraryDetail.days?.reduce(
          (sum, day) => sum + (day.timeSlots?.length || 0),
          0,
        ) || 0;

      this.logger.debug(
        `[AI Assistant] 行程数据完整性检查: 目的地=${destinationName}, 天数=${itineraryDetail.daysCount}, 总时间段=${totalTimeSlots}`,
      );

      // 生成对话ID（如果未提供）
      const conversationId = dto.conversationId || crypto.randomUUID();
      const language = dto.language || 'zh-CN';

      // 检测是否为首次对话
      const isFirstMessage =
        !dto.conversationId &&
        (!dto.message.trim() ||
          /^(你好|您好|hi|hello|开始|start)$/i.test(dto.message.trim()));

      // 如果是首次对话，返回预设的欢迎语
      if (isFirstMessage) {
        const hasDaysData =
          itineraryDetail.days && itineraryDetail.days.length > 0;
        const daysCount = itineraryDetail.daysCount || 0;

        const welcomeMessage = this.promptService.buildWelcomeMessage(
          destinationName,
          hasDaysData,
          daysCount,
        );

        // 保存欢迎消息
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

      // 获取对话历史
      const historyMessages = await this.itineraryRepository.getConversationHistory(
        conversationId,
        20, // 最多加载最近20条消息
      );

      // 优化：简化行程数据以减少 Token 消耗
      const simplifiedContext = this.itineraryMapper.simplifyItineraryForAI(
        itineraryDetail,
      );

      // 构建系统提示词
      const systemMessage = this.promptService.buildAssistantSystemMessage(
        destinationName,
        simplifiedContext,
        totalTimeSlots > 0,
      );

      // 构建消息数组
      const messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }> = [{ role: 'system', content: systemMessage }];

      // 添加历史消息
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
      const response = await this.llmService.chatCompletion(
        await this.llmService.buildChatCompletionOptions({
          messages,
          temperature: 0.7,
          maxOutputTokens: 2000,
          provider: 'gemini', // 强制使用 Gemini 1.5 Flash（极速响应，支持长上下文）
          model: 'gemini-1.5-flash', // Gemini 1.5 Flash 模型
        }),
      );

      const responseText = response.trim();

      // 尝试从回复中提取修改建议
      let modifications: ModificationSuggestionDto[] | undefined;
      const hasActivities = totalTimeSlots > 0;

      if (hasActivities) {
        modifications = this.extractModifications(responseText);
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

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
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
  ): Promise<GetConversationHistoryResponseDto> {
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

  /**
   * 从回复文本中提取修改建议
   */
  private extractModifications(
    responseText: string,
  ): ModificationSuggestionDto[] | undefined {
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
            this.logger.debug(
              `[AI Assistant] 提取到 ${validModifications.length} 个修改建议`,
            );
            return validModifications;
          }
        }
      }
    } catch (error) {
      // 如果解析失败，记录日志但不影响正常回复
      this.logger.debug(
        `[AI Assistant] 未能从回复中提取修改建议: ${error instanceof Error ? error.message : error}`,
      );
    }
    return undefined;
  }

  /**
   * 临时方法：构建行程详情（后续应移到 ItineraryMapper）
   */
  private async buildItineraryDetail(
    itinerary: ItineraryEntity,
  ): Promise<any> {
    // 简化实现：只提取必要字段用于 AI 上下文
    const days = (itinerary.days || []).map((day) => ({
      day: day.day,
      date: day.date.toISOString().split('T')[0],
      timeSlots: (day.activities || []).map((act) => ({
        id: act.id,
        time: act.time,
        title: act.title,
        type: act.type,
        coordinates: act.location as { lat: number; lng: number } | null,
        notes: act.notes,
        cost: act.cost ? Number(act.cost) : undefined,
      })),
    }));

    return {
      id: itinerary.id,
      destination: itinerary.destination,
      daysCount: itinerary.daysCount,
      days,
    };
  }
}

