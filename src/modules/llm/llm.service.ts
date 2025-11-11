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
    this.timeoutMs = this.configService.get<number>('LLM_TIMEOUT_MS', 30000);
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
  ): Promise<T> {
    const text = await this.chatCompletion({ ...options, json: true });
    return this.parseJson<T>(text);
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

    if (options.maxOutputTokens) {
      payload.max_tokens = options.maxOutputTokens;
    }

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
      return JSON.parse(payload) as T;
    } catch (error: unknown) {
      const repaired = this.repairJson(payload);
      try {
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

  private repairJson(payload: string): string {
    // Basic best-effort repair: trim whitespace and attempt to close JSON braces.
    const trimmed = payload.trim();

    const openingBraces = (trimmed.match(/\{/g) ?? []).length;
    const closingBraces = (trimmed.match(/\}/g) ?? []).length;

    if (openingBraces > closingBraces) {
      return `${trimmed}${'}'.repeat(openingBraces - closingBraces)}`;
    }

    return trimmed;
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
