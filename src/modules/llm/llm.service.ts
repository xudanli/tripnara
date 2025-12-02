import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Agent as HttpsAgent } from 'https';
import { PreferencesService } from '../preferences/preferences.service';
// 尝试导入 Google GenAI SDK（如果可用）
// 注意：正确的包名是 @google/generative-ai，但当前使用的是 @google/genai
// 如果 @google/genai 不存在，尝试 @google/generative-ai
let GoogleGenAI: any;
let GoogleGenerativeAI: any;
try {
  // 优先尝试 @google/generative-ai（官方 SDK）
  try {
    const genaiModule = require('@google/generative-ai');
    GoogleGenerativeAI = genaiModule.GoogleGenerativeAI || genaiModule.default?.GoogleGenerativeAI || genaiModule.default;
  } catch (e) {
    // 如果 @google/generative-ai 不存在，尝试 @google/genai
    const genaiModule = require('@google/genai');
    GoogleGenAI = genaiModule.GoogleGenAI || genaiModule.default?.GoogleGenAI;
  }
} catch (error) {
  // SDK 未安装或导入失败，将使用 REST API 作为降级方案
}

export type LlmProvider = 'openai' | 'deepseek' | 'gemini';

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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private geminiClient: any; // GoogleGenAI 客户端实例
  private readonly useGeminiSdk: boolean; // 是否使用 SDK（如果可用）

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly preferencesService?: PreferencesService,
  ) {
    // 默认超时：5分钟（300秒），适用于行程生成等长时间任务
    this.timeoutMs = this.configService.get<number>('LLM_TIMEOUT_MS', 300000);
    this.maxRetries = this.configService.get<number>('LLM_MAX_RETRIES', 3);

    // 初始化 Gemini SDK（如果可用）
    // 优先使用 @google/generative-ai（官方 SDK），如果不存在则使用 @google/genai
    this.useGeminiSdk = GoogleGenerativeAI !== undefined || GoogleGenAI !== undefined;
    if (this.useGeminiSdk) {
      try {
        const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (geminiApiKey) {
          // 配置代理环境变量（如果本地代理端口是 9090）
          const proxyUrl = this.configService.get<string>('HTTP_PROXY') || 
                          this.configService.get<string>('HTTPS_PROXY') ||
                          'http://127.0.0.1:9090';
          
          // 设置代理环境变量（Node.js fetch 会自动读取）
          if (proxyUrl && !process.env.HTTPS_PROXY && !process.env.HTTP_PROXY) {
            process.env.HTTPS_PROXY = proxyUrl;
            process.env.HTTP_PROXY = proxyUrl;
            this.logger.log(`Configured proxy for Gemini SDK: ${proxyUrl}`);
          }

          // 初始化 Google GenAI 客户端
          // 优先使用 @google/generative-ai（官方 SDK）
          if (GoogleGenerativeAI) {
            try {
              // 官方 SDK API: new GoogleGenerativeAI(apiKey)
              // 检查是否是构造函数
              if (typeof GoogleGenerativeAI === 'function') {
                this.geminiClient = new GoogleGenerativeAI(geminiApiKey);
                // 验证客户端是否正确初始化
                if (this.geminiClient && typeof this.geminiClient.getGenerativeModel === 'function') {
                  this.logger.log('Google Generative AI SDK (@google/generative-ai) initialized successfully');
                } else {
                  throw new Error('SDK client initialized but getGenerativeModel is not a function');
                }
              } else {
                throw new Error('GoogleGenerativeAI is not a constructor');
              }
            } catch (error) {
              this.logger.error(`Failed to initialize @google/generative-ai SDK: ${error instanceof Error ? error.message : error}`);
              throw error;
            }
          } else if (GoogleGenAI) {
            try {
              // 备用 SDK API: new GoogleGenAI({ apiKey: '...' })
              if (typeof GoogleGenAI === 'function') {
                this.geminiClient = new GoogleGenAI({
                  apiKey: geminiApiKey,
                });
                // 验证客户端是否正确初始化
                if (this.geminiClient && typeof this.geminiClient.getGenerativeModel === 'function') {
                  this.logger.log('Google GenAI SDK (@google/genai) initialized successfully');
                } else {
                  throw new Error('SDK client initialized but getGenerativeModel is not a function');
                }
              } else {
                throw new Error('GoogleGenAI is not a constructor');
              }
            } catch (error) {
              this.logger.error(`Failed to initialize @google/genai SDK: ${error instanceof Error ? error.message : error}`);
              throw error;
            }
          }
        } else {
          this.logger.warn('GEMINI_API_KEY not configured, Gemini SDK will not be used');
          this.useGeminiSdk = false;
        }
      } catch (error) {
        this.logger.warn('Failed to initialize Google GenAI SDK, will use REST API fallback', error);
        this.useGeminiSdk = false;
      }
    } else {
      this.logger.log('Google GenAI SDK not available, will use REST API');
    }
  }

  async chatCompletion(options: LlmChatCompletionOptions): Promise<string> {
    const response = await this.executeRequest(options);
    const content = this.extractContent(response, options.provider);

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

  /**
   * 获取默认的 LLM provider（优先从用户偏好读取，否则从环境变量读取）
   */
  async getDefaultProvider(userId?: string): Promise<LlmProvider> {
    // 如果提供了 userId，尝试从用户偏好读取
    if (userId && this.preferencesService) {
      try {
        const preferences = await this.preferencesService.getPreferences(userId);
        const userProvider = preferences?.llmProvider as string;
        if (userProvider && ['openai', 'deepseek', 'gemini'].includes(userProvider)) {
          return userProvider as LlmProvider;
        }
      } catch (error) {
        this.logger.warn(`Failed to get user preferences for LLM provider: ${error}`);
      }
    }

    // 回退到环境变量
    const provider = this.configService.get<string>('LLM_PROVIDER', 'deepseek');
    if (['openai', 'deepseek', 'gemini'].includes(provider)) {
      return provider as LlmProvider;
    }
    return 'deepseek';
  }

  /**
   * 获取默认的 LLM model（优先从用户偏好读取，否则从环境变量读取）
   */
  async getDefaultModel(provider?: LlmProvider, userId?: string): Promise<string> {
    const actualProvider = provider ?? (await this.getDefaultProvider(userId));

    // 如果提供了 userId，尝试从用户偏好读取
    if (userId && this.preferencesService) {
      try {
        const preferences = await this.preferencesService.getPreferences(userId);
        const userModel = preferences?.llmModel as string;
        if (userModel) {
          return userModel;
        }
        // 如果用户偏好中有 provider 但没有 model，使用该 provider 的默认模型
        const userProvider = preferences?.llmProvider as string;
        if (userProvider && userProvider === actualProvider) {
          // 用户指定了 provider，但没有指定 model，使用该 provider 的默认模型
          const providerConfig = this.buildProviderConfig(actualProvider);
          return providerConfig.defaultModel;
        }
      } catch (error) {
        this.logger.warn(`Failed to get user preferences for LLM model: ${error}`);
      }
    }

    // 回退到环境变量
    const modelKey = `LLM_MODEL_${actualProvider.toUpperCase()}`;
    const defaultModel = this.configService.get<string>(modelKey);

    if (defaultModel) {
      return defaultModel;
    }

    // 如果没有配置，使用 provider 的默认模型
    const providerConfig = this.buildProviderConfig(actualProvider);
    return providerConfig.defaultModel;
  }

  /**
   * 构建 LLM 调用选项，自动使用默认的 provider 和 model（如果未指定）
   * 优先从用户偏好读取，如果没有则从环境变量读取
   */
  async buildChatCompletionOptions(
    options: Partial<LlmChatCompletionOptions> & {
      messages: LlmMessage[];
      userId?: string; // 可选：用户ID，用于从用户偏好读取模型选择
    },
  ): Promise<LlmChatCompletionOptions> {
    const provider = options.provider ?? (await this.getDefaultProvider(options.userId));
    const model = options.model ?? (await this.getDefaultModel(provider, options.userId));

    return {
      provider,
      model,
      messages: options.messages,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      json: options.json,
      metadata: options.metadata,
    };
  }

  private async executeRequest(
    options: LlmChatCompletionOptions,
    attempt = 1,
  ): Promise<ChatCompletionResponse | GeminiResponse> {
    const providerConfig = this.buildProviderConfig(options.provider);
    if (!providerConfig.apiKey) {
      const envVarName = 
        options.provider === 'gemini' ? 'GEMINI_API_KEY' :
        options.provider === 'deepseek' ? 'DEEPSEEK_API_KEY' :
        'OPENAI_API_KEY';
      throw new Error(
        `Missing API key for provider "${options.provider}". Please set ${envVarName} environment variable.`,
      );
    }

    // 对于 Gemini，优先使用 SDK（如果可用）
    if (options.provider === 'gemini' && this.useGeminiSdk && this.geminiClient) {
      try {
        return await this.executeGeminiWithSdk(options, providerConfig);
      } catch (error) {
        this.logger.warn(
          `Gemini SDK call failed (attempt ${attempt}), falling back to REST API: ${error instanceof Error ? error.message : error}`,
        );
        // 降级到 REST API（继续执行下面的代码）
      }
    }

    const payload = this.buildPayload(options, providerConfig);

    try {
      // Ensure baseUrl uses HTTPS to prevent redirect loops
      let baseUrl = providerConfig.baseUrl;
      if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://')) {
        // If no protocol specified, default to HTTPS
        baseUrl = `https://${baseUrl}`;
      } else if (baseUrl.startsWith('http://')) {
        // Force HTTPS for security and to avoid redirect loops
        baseUrl = baseUrl.replace(/^http:\/\//, 'https://');
        this.logger.warn(
          `Base URL was using HTTP, converted to HTTPS: ${baseUrl}`,
        );
      }
      // Gemini 使用不同的 API 端点
      const modelName = options.model ?? providerConfig.defaultModel;
      const url =
        options.provider === 'gemini'
          ? `${baseUrl}/models/${modelName}:generateContent?key=${providerConfig.apiKey}`
          : `${baseUrl}/chat/completions`;
      
      // 记录 Gemini API 调用的详细信息（但不记录 API key）
      if (options.provider === 'gemini') {
        this.logger.debug(
          `Calling Gemini API: baseUrl=${baseUrl}, model=${modelName}, url=${url.replace(/key=[^&]+/, 'key=***')}`,
        );
      }

      // Handle proxy configuration to prevent redirect loops
      const httpsAgent = this.createProxyAgentIfNeeded();
      const headers: Record<string, string> = {
              'Content-Type': 'application/json',
      };

      // Gemini 使用 query parameter 传递 API key，其他使用 Bearer token
      if (options.provider !== 'gemini') {
        headers.Authorization = `Bearer ${providerConfig.apiKey}`;
      }

      const requestConfig: Record<string, unknown> = {
        headers,
            timeout: this.timeoutMs,
        maxRedirects: 5, // Allow some redirects but prevent infinite loops
      };

      if (httpsAgent) {
        // If proxy is configured, use it explicitly with proper agent
        requestConfig.httpsAgent = httpsAgent;
        requestConfig.proxy = false; // Prevent axios from using default proxy
        this.logger.debug(`Using proxy for LLM API request to ${url}`);
      } else {
        // Explicitly disable proxy to prevent automatic proxy usage
        requestConfig.proxy = false;
      }

      const response = await firstValueFrom(
        this.httpService.post<ChatCompletionResponse | GeminiResponse>(
          url,
          payload,
          requestConfig,
        ),
      );

      // 添加调试日志：打印完整的 REST API 响应（仅对 Gemini）
      if (options.provider === 'gemini') {
        try {
          const responseString = JSON.stringify(response.data, null, 2);
          this.logger.debug(`Gemini REST API Raw Response: ${responseString}`);
        } catch (logError) {
          this.logger.warn(`Failed to stringify Gemini REST API response: ${logError instanceof Error ? logError.message : logError}`);
        }
      }

      return response.data;
    } catch (error: unknown) {
      // Handle redirect loop errors specifically
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_FR_TOO_MANY_REDIRECTS'
      ) {
        this.logger.error(
          `Redirect loop detected. This usually means the API URL is incorrect or there's a proxy issue. Base URL: ${providerConfig.baseUrl}`,
        );
        throw new Error(
          `API request failed due to redirect loop. Please check the API base URL configuration.`,
        );
      }

      if (this.shouldRetry(error) && attempt < this.maxRetries) {
        const delayMs = attempt * 500;
        this.logger.warn(
          `LLM request failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
        return this.executeRequest(options, attempt + 1);
      }

      // 改进错误处理，提供更详细的错误信息
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorData = error.response?.data;
        
        if (status === 404) {
          const modelName = options.model ?? providerConfig.defaultModel;
          this.logger.error(
            `Gemini API 404 Not Found: model=${modelName}, baseUrl=${providerConfig.baseUrl}`,
          );
          throw new Error(
            `Gemini API 模型未找到 (404): ${modelName}。请检查模型名称是否正确，或 API key 是否有权限访问该模型。`,
          );
        }
        
        if (status === 401 || status === 403) {
          // 打印完整的错误响应以便调试
          try {
            const errorString = JSON.stringify(errorData, null, 2);
            this.logger.error(
              `Gemini API 认证失败 (${status}): 请检查 GEMINI_API_KEY 是否正确配置\n完整错误响应: ${errorString}`,
            );
          } catch (logError) {
            this.logger.error(
              `Gemini API 认证失败 (${status}): 请检查 GEMINI_API_KEY 是否正确配置\n错误数据: ${String(errorData)}`,
            );
          }
          throw new Error(
            `Gemini API 认证失败 (${status}): 请检查 API key 是否正确配置。错误详情: ${JSON.stringify(errorData)}`,
          );
        }
        
        // 打印完整的错误响应以便调试
        try {
          const errorString = JSON.stringify(errorData, null, 2);
          this.logger.error(
            `LLM API 请求失败 (${status} ${statusText}):\n完整错误响应: ${errorString}`,
          );
        } catch (logError) {
          this.logger.error(
            `LLM API 请求失败 (${status} ${statusText}): ${String(errorData)}`,
          );
        }
        throw new Error(
          `LLM API 请求失败: ${status} ${statusText} - ${errorData?.error?.message || error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * 使用 Google GenAI SDK 调用 Gemini API
   * 优先尝试 gemini-2.5-flash，如果失败则降级到 gemini-1.5-flash
   */
  private async executeGeminiWithSdk(
    options: LlmChatCompletionOptions,
    providerConfig: ProviderConfig,
  ): Promise<GeminiResponse> {
    const modelName = options.model ?? providerConfig.defaultModel;
    
    // 尝试使用 gemini-2.5-flash，如果失败则降级到 gemini-1.5-flash
    // 注意：如果模型名称是 gemini-1.5-flash，尝试添加 -latest 后缀或使用 gemini-1.5-pro
    const modelsToTry = modelName === 'gemini-2.5-flash' 
      ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
      : modelName === 'gemini-1.5-flash'
      ? ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro']
      : [modelName, 'gemini-1.5-flash', 'gemini-1.5-pro'];

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        this.logger.debug(`Attempting Gemini SDK call with model: ${model}`);

        // 分离 system message 和普通 messages
        const systemMessages: string[] = [];
        const regularMessages = options.messages.filter((msg) => {
          if (msg.role === 'system') {
            systemMessages.push(msg.content);
            return false;
          }
          return true;
        });

        // 构建 contents（Gemini SDK 格式）
        const contents = regularMessages.map((msg) => {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          return {
            role,
            parts: [{ text: msg.content }],
          };
        });

        // 构建 generation config
        // 对于 gemini-2.5-flash，默认使用 4096 以支持思考过程（thoughtsTokenCount）
        const defaultMaxTokens = (options.model ?? providerConfig.defaultModel)?.includes('2.5') 
          ? 4096 
          : 4000;
        const generationConfig: any = {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? defaultMaxTokens,
        };

        // 处理 system instruction
        const systemInstructionParts: string[] = [];
        if (systemMessages.length > 0) {
          systemInstructionParts.push(...systemMessages);
        }
        if (options.json) {
          systemInstructionParts.push(
            'You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON structure.',
          );
        }

        // 调用 SDK
        // 检查 SDK 类型并正确调用
        let genModel: any;
        let response: any;
        
        // 检查是否是官方 SDK (@google/generative-ai)
        // 官方 SDK 的实例有 getGenerativeModel 方法
        if (typeof this.geminiClient.getGenerativeModel === 'function') {
          // 官方 SDK API: client.getGenerativeModel({ model: '...', systemInstruction: '...' })
          genModel = this.geminiClient.getGenerativeModel({ 
            model: model,
            systemInstruction: systemInstructionParts.length > 0 
              ? systemInstructionParts.join('\n')
              : undefined,
          });
          
          // 构建请求内容
          const requestContents = contents.map((c) => ({
            role: c.role,
            parts: c.parts,
          }));

          // 官方 SDK: model.generateContent({ contents, generationConfig })
          response = await genModel.generateContent({
            contents: requestContents,
            generationConfig: generationConfig,
          });
        } else {
          // 备用 SDK 或未知格式，尝试直接调用
          this.logger.warn('Unknown Gemini SDK format, attempting direct call');
          genModel = this.geminiClient.getGenerativeModel({ 
            model: model,
            systemInstruction: systemInstructionParts.length > 0 
              ? systemInstructionParts.join('\n')
              : undefined,
            generationConfig: generationConfig,
          });

          const requestContents = contents.map((c) => ({
            role: c.role,
            parts: c.parts,
          }));

          response = await genModel.generateContent({
            contents: requestContents,
          });
        }

        // 添加调试日志：打印完整的 API 响应
        try {
          const responseString = JSON.stringify(response, (key, value) => {
            // 避免循环引用
            if (typeof value === 'object' && value !== null) {
              if (key === 'parent' || key === 'client') {
                return '[Circular]';
              }
            }
            return value;
          }, 2);
          this.logger.debug(`Gemini Raw Response (model: ${model}): ${responseString}`);
        } catch (logError) {
          this.logger.warn(`Failed to stringify Gemini response: ${logError instanceof Error ? logError.message : logError}`);
          // 尝试打印基本信息
          this.logger.debug(`Gemini Response type: ${typeof response}, has response: ${!!response?.response}`);
        }

        // 提取响应文本
        // SDK 响应格式：response.response.text() 或 response.response.candidates[0].content.parts[0].text
        const responseData = response.response;
        const text = responseData?.text?.() || 
                     responseData?.candidates?.[0]?.content?.parts?.[0]?.text || 
                     '';
        
        // 转换为 GeminiResponse 格式（保持与 REST API 响应格式一致）
        return {
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
            },
          ],
        } as GeminiResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 添加详细的错误日志：打印完整的错误对象
        try {
          const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
          this.logger.error(`Gemini SDK Error Details (model: ${model}): ${errorString}`);
        } catch (logError) {
          // 如果无法序列化，至少打印错误的基本信息
          this.logger.error(`Gemini SDK Error (model: ${model}):`, {
            message: lastError.message,
            stack: lastError.stack,
            name: lastError.name,
            error: String(error),
          });
        }
        
        this.logger.warn(
          `Gemini SDK call failed with model ${model}: ${lastError.message}`,
        );
        
        // 如果是模型未找到错误，尝试下一个模型
        if (
          lastError.message.includes('404') ||
          lastError.message.includes('not found') ||
          lastError.message.includes('Model not found')
        ) {
          continue; // 尝试下一个模型
        }
        
        // 其他错误直接抛出
        throw lastError;
      }
    }

    // 所有模型都失败了
    throw lastError || new Error('All Gemini models failed');
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

    if (provider === 'gemini') {
      return {
        // 使用 v1beta 接口以支持 systemInstruction 字段
        // 注意：v1 正式版接口不支持 systemInstruction，该功能仅在 v1beta 中可用
        baseUrl:
          this.configService.get<string>('GEMINI_BASE_URL') ??
          'https://generativelanguage.googleapis.com/v1beta',
        apiKey: this.configService.get<string>('GEMINI_API_KEY'),
        defaultModel: 'gemini-2.5-flash', // 优先使用 gemini-2.5-flash，如果失败则降级到 gemini-1.5-flash
        supportsJsonMode: false, // Gemini 需要特殊处理 JSON 模式
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
    // Gemini 使用不同的 API 格式
    if (options.provider === 'gemini') {
      return this.buildGeminiPayload(options, providerConfig);
    }

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

  private buildGeminiPayload(
    options: LlmChatCompletionOptions,
    providerConfig: ProviderConfig,
  ) {
    // Gemini API 使用不同的格式
    // 分离 system message 和普通 messages
    const systemMessages: string[] = [];
    const regularMessages = options.messages.filter((msg) => {
      if (msg.role === 'system') {
        systemMessages.push(msg.content);
        return false;
      }
      return true;
    });

    // 将 messages 转换为 contents 格式
    const contents = regularMessages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? ((options.model ?? providerConfig.defaultModel)?.includes('2.5') ? 4096 : 4000),
      },
    };

    // 处理 system instruction
    const systemInstructionParts: string[] = [];
    
    // 添加原有的 system messages
    if (systemMessages.length > 0) {
      systemInstructionParts.push(...systemMessages);
    }

    // Gemini 的 JSON 模式需要在 system instruction 中指定
    if (options.json) {
      systemInstructionParts.push(
        'You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON structure.',
      );
    }

    // 如果有 system instruction，添加到 payload
    if (systemInstructionParts.length > 0) {
      payload.systemInstruction = {
        parts: systemInstructionParts.map((text) => ({ text })),
      };
    }

    return payload;
  }

  private extractContent(
    response: ChatCompletionResponse | GeminiResponse,
    provider: LlmProvider,
  ): string | undefined {
    // Gemini 使用不同的响应格式
    if (provider === 'gemini') {
      const geminiResponse = response as GeminiResponse;
      return (
        geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? undefined
      );
    }

    const choice = (response as ChatCompletionResponse).choices?.[0];
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
    let stringStartPos = -1;

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
        if (!inString) {
          stringStartPos = i;
        }
        inString = !inString;
        result += char;
        continue;
      }

      // 如果字符串中包含未转义的换行符或控制字符，可能是截断导致的
      if (inString && (char === '\n' || char === '\r' || (char.charCodeAt(0) < 32 && char !== '\t'))) {
        // 遇到未转义的换行符，可能是字符串被截断了
        // 先闭合当前字符串，然后继续处理
        result += '"';
        inString = false;
        stringStartPos = -1;
        // 跳过这个字符，因为它不应该在字符串中
        continue;
      }

      result += char;
    }

    // 如果字符串未闭合，尝试智能闭合
    if (inString) {
      // 检查是否在字符串末尾（可能是被截断）
      const lastChar = result[result.length - 1];
      // 如果最后一个字符不是引号，说明字符串确实未闭合
      if (lastChar !== '"') {
        // 尝试找到字符串的合理结束位置
        // 如果字符串很长（>100字符），可能是被截断了，直接闭合
        const stringLength = result.length - (stringStartPos >= 0 ? stringStartPos : 0);
        if (stringLength > 100) {
          // 长字符串被截断，直接闭合
          result += '"';
        } else {
          // 短字符串，尝试转义特殊字符后闭合
          // 移除可能导致问题的字符（如未转义的换行符）
          result = result.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      result += '"';
        }
      }
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

  private createProxyAgentIfNeeded(): HttpsAgent | undefined {
    const proxyUrl =
      this.configService.get<string>('HTTPS_PROXY') ??
      this.configService.get<string>('HTTP_PROXY') ??
      process.env.HTTPS_PROXY ??
      process.env.https_proxy ??
      process.env.HTTP_PROXY ??
      process.env.http_proxy;
    if (!proxyUrl) {
      return undefined;
    }
    this.logger.log(`[LlmService] using proxy ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }
}
