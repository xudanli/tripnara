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
    let repaired = jsonString.trim();

    // 移除尾随逗号（在对象和数组的最后一个元素之后）
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 尝试修复未闭合的字符串
    repaired = this.repairUnclosedStrings(repaired);

    // 修复缺失的括号和方括号（在修复字符串之后）
    repaired = this.balanceBrackets(repaired);

    // 修复数组中的缺失逗号
    repaired = this.repairMissingCommas(repaired);

    // 最后尝试：如果仍然无效，尝试找到最后一个有效位置并截断
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      // 如果修复后仍然无效，尝试截断到最后一个有效位置
      const lastValidPosition = this.findLastValidJsonPosition(repaired);
      if (lastValidPosition > 0 && lastValidPosition < repaired.length) {
        const truncated = repaired.substring(0, lastValidPosition);
        const balanced = this.balanceBrackets(truncated);
        try {
          JSON.parse(balanced);
          return balanced;
        } catch {
          // 如果截断后仍然无效，返回原始修复结果
          return repaired;
        }
      }
      return repaired;
    }
  }

  private repairUnclosedStrings(json: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      result += char;
    }

    // 如果字符串未闭合，直接闭合它
    if (inString) {
      result += '"';
    }

    return result;
  }

  private findLastValidJsonPosition(json: string): number {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidPos = 0;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{' || char === '[') {
        depth++;
        lastValidPos = i + 1;
      } else if (char === '}' || char === ']') {
        if (depth > 0) {
          depth--;
          lastValidPos = i + 1;
        } else {
          // 不匹配的闭合括号，返回之前的位置
          return lastValidPos;
        }
      } else if (depth === 0 && (char === ',' || char === ':')) {
        // 在顶层遇到逗号或冒号，可能表示结构不完整
        return lastValidPos;
      } else {
        lastValidPos = i + 1;
      }
    }

    return lastValidPos;
  }

  private balanceBrackets(json: string): string {
    let result = json;

    // 计算括号和方括号的平衡
    const openBraces = (result.match(/\{/g) || []).length;
    const closeBraces = (result.match(/\}/g) || []).length;
    const openBrackets = (result.match(/\[/g) || []).length;
    const closeBrackets = (result.match(/\]/g) || []).length;

    // 我们需要按照正确的顺序关闭括号
    // 通过跟踪嵌套结构来确定关闭顺序
    let depth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let inString = false;
    let escapeNext = false;
    const stack: Array<'{' | '['> = [];

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        stack.push('{');
        braceDepth++;
      } else if (char === '[') {
        stack.push('[');
        bracketDepth++;
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
          braceDepth--;
        }
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
          bracketDepth--;
        }
      }
    }

    // 按照栈的顺序关闭（LIFO）
    const closingChars = stack
      .reverse()
      .map((char) => (char === '{' ? '}' : ']'))
      .join('');

    return result + closingChars;
  }

  private repairMissingCommas(json: string): string {
    // 修复明显的缺失逗号情况：在 } 或 ] 后面，如果下一个非空白字符是 { 或 [ 或 "，添加逗号
    // 但要小心，只在数组/对象内部（不在顶层）添加
    let result = json;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let output = '';

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        output += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        output += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        output += char;
        continue;
      }

      if (inString) {
        output += char;
        continue;
      }

      if (char === '{' || char === '[') {
        depth++;
        output += char;
      } else if (char === '}' || char === ']') {
        depth--;
        output += char;

        // 检查是否需要添加逗号
        if (depth > 0) {
          // 查找下一个非空白字符
          let j = i + 1;
          while (j < result.length && /\s/.test(result[j])) {
            j++;
          }

          if (j < result.length) {
            const nextChar = result[j];
            // 如果下一个字符是值开始符，且当前没有逗号，添加逗号
            if (
              (nextChar === '{' ||
                nextChar === '[' ||
                nextChar === '"' ||
                /[\d-]/.test(nextChar)) &&
              !output.trimEnd().endsWith(',')
            ) {
              // 添加中间的空格和逗号
              output += result.substring(i + 1, j) + ',';
              i = j - 1;
              continue;
            }
          }
        }
      } else {
        output += char;
      }
    }

    return output;
  }

  private preprocessJsonResponse(response: string): string {
    // 移除可能的控制字符
    let cleaned = response.replace(/[\x00-\x1F\x7F]/g, '').trim();

    // 尝试从 markdown 代码块中提取 JSON
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1];
    }

    // 如果响应以 { 或 [ 开头，尝试找到匹配的结束位置
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      // 移除可能的前导文本
      const startIndex = cleaned.search(/[{\[]/);
      if (startIndex > 0) {
        cleaned = cleaned.substring(startIndex);
      }
    }

    return cleaned.trim();
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
