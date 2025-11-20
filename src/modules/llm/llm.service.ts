import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type LlmProvider = 'openai' | 'deepseek';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatCompletionOptions {
  provider: LlmProvider;
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
  metadata?: Record<string, unknown>;
}

interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  supportsJsonMode: boolean;
}

interface ChatResponseChoice {
  message?: { content?: string };
  delta?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatResponseChoice[];
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // 默认超时：5分钟（300秒），适用于行程生成等长时间任务
    this.timeoutMs = this.configService.get<number>('LLM_TIMEOUT_MS', 300000);
    this.maxRetries = this.configService.get<number>('LLM_MAX_RETRIES', 3);
  }

  async chatCompletion(options: LlmChatCompletionOptions): Promise<string> {
    const response = await this.executeRequest(options);
    const content = this.extractContent(response);

    if (!content) {
      throw new Error('Empty completion response received from LLM provider');
    }

    return content;
  }

  async chatCompletionJson<T = unknown>(
    options: LlmChatCompletionOptions,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const text = await this.chatCompletion({ ...options, json: true });
        const preprocessed = this.preprocessJsonResponse(text);
        return this.parseJson<T>(preprocessed);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // 等待后重试
        const delayMs = 1000 * attempt;
        this.logger.warn(
          `JSON parsing failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
      }
    }
    throw new Error('Failed to parse JSON after retries');
  }

  private async executeRequest(
    options: LlmChatCompletionOptions,
    attempt = 1,
  ): Promise<ChatCompletionResponse> {
    const providerConfig = this.buildProviderConfig(options.provider);
    if (!providerConfig.apiKey) {
      throw new Error(`Missing API key for provider "${options.provider}"`);
    }

    const payload = this.buildPayload(options, providerConfig);

    try {
      const response = await firstValueFrom(
        this.httpService.post<ChatCompletionResponse>(
          `${providerConfig.baseUrl}/chat/completions`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${providerConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeoutMs,
          },
        ),
      );

      return response.data;
    } catch (error: unknown) {
      if (this.shouldRetry(error) && attempt < this.maxRetries) {
        const delayMs = attempt * 500;
        this.logger.warn(
          `LLM request failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
        return this.executeRequest(options, attempt + 1);
      }

      throw error;
    }
  }

  private buildProviderConfig(provider: LlmProvider): ProviderConfig {
    if (provider === 'deepseek') {
      return {
        baseUrl:
          this.configService.get<string>('DEEPSEEK_BASE_URL') ??
          'https://api.deepseek.com/v1',
        apiKey: this.configService.get<string>('DEEPSEEK_API_KEY'),
        defaultModel: 'deepseek-chat',
        supportsJsonMode: true,
      };
    }

    return {
      baseUrl:
        this.configService.get<string>('OPENAI_BASE_URL') ??
        'https://api.openai.com/v1',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      defaultModel: 'gpt-4o-mini',
      supportsJsonMode: true,
    };
  }

  private buildPayload(
    options: LlmChatCompletionOptions,
    providerConfig: ProviderConfig,
  ) {
    const payload: Record<string, unknown> = {
      model: options.model ?? providerConfig.defaultModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
    };

    // 限制响应长度，默认最大 4000 tokens
    const maxTokens = options.maxOutputTokens ?? 4000;
    payload.max_tokens = maxTokens;

    if (options.json && providerConfig.supportsJsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    if (options.metadata) {
      payload.metadata = options.metadata;
    }

    return payload;
  }

  private extractContent(response: ChatCompletionResponse): string | undefined {
    const choice = response.choices?.[0];
    return choice?.message?.content ?? choice?.delta?.content ?? undefined;
  }

  private shouldRetry(error: unknown): boolean {
    if (!isAxiosError(error)) {
      return false;
    }

    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseJson<T>(payload: string): T {
    try {
      // 尝试直接解析
      return JSON.parse(payload) as T;
    } catch (error: unknown) {
      // 如果是字符串未终止错误，尝试修复
      if (
        error instanceof SyntaxError &&
        error.message.includes('Unterminated string')
      ) {
        try {
          // 添加缺失的引号和括号
          const repairedJson = this.repairJson(payload);
          return JSON.parse(repairedJson) as T;
        } catch (repairError: unknown) {
          this.logger.error('Failed to repair JSON with unterminated string', {
            original: payload,
            error: this.formatUnknownError(error),
            repairError: this.formatUnknownError(repairError),
          });
          throw new Error('Unable to parse JSON response from LLM');
        }
      }

      // 其他错误，尝试通用修复
      try {
        const repaired = this.repairJson(payload);
        return JSON.parse(repaired) as T;
      } catch (innerError: unknown) {
        this.logger.error('Failed to parse JSON response from LLM', {
          original: payload,
          error: this.formatUnknownError(error),
          innerError: this.formatUnknownError(innerError),
        });
        throw new Error('Unable to parse JSON response from LLM');
      }
    }
  }

  private repairJson(jsonString: string): string {
    // 简单的 JSON 修复逻辑
    let repaired = jsonString.trim();

    // 确保以 } 或 ] 结尾
    if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
      // 查找最后一个完整对象
      const lastCompleteBrace = repaired.lastIndexOf('}');
      const lastCompleteBracket = repaired.lastIndexOf(']');
      const lastComplete = Math.max(lastCompleteBrace, lastCompleteBracket);

      if (lastComplete !== -1) {
        repaired = repaired.substring(0, lastComplete + 1);
      }
    }

    // 添加可能的缺失括号
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;

    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    // 处理数组括号
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    return repaired;
  }

  private preprocessJsonResponse(response: string): string {
    // 移除可能的控制字符
    return response.replace(/[\x00-\x1F\x7F]/g, '').trim();
  }

  private formatUnknownError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    return { value: error };
  }
}
