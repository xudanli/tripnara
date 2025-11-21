// path: src/modules/llm/llm.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { LlmService, LlmProvider } from './llm.service';

type HttpPostMock = jest.Mocked<Pick<HttpService, 'post'>>;
type ConfigGetMock = jest.Mock<unknown, [string, unknown?]>;

type PostCall = [
  url: string,
  body: Record<string, unknown>,
  config?: { headers?: Record<string, string> },
];

const createResponse = (content: string): AxiosResponse => {
  const config = {} as AxiosResponse['config'];
  return {
    data: { choices: [{ message: { content } }] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };
};

const createJsonResponse = (payload: unknown): AxiosResponse =>
  createResponse(JSON.stringify(payload));

const createAxiosError = (status: number): AxiosError => {
  const config = {} as AxiosResponse['config'];
  const response: AxiosResponse = {
    data: {},
    status,
    statusText: 'ERR',
    headers: {},
    config,
  };
  return new AxiosError('error', undefined, config, undefined, response);
};

describe('LlmService', () => {
  let service: LlmService;
  let httpServiceMock: HttpPostMock;
  let configServiceMock: jest.Mocked<Pick<ConfigService, 'get'>>;

  const defaultConfig = (): Record<string, unknown> => ({
    OPENAI_API_KEY: 'openai-key',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    DEEPSEEK_API_KEY: 'deepseek-key',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
    LLM_TIMEOUT_MS: 10,
    LLM_MAX_RETRIES: 2,
  });

  const setup = async (
    overrides: Partial<Record<string, unknown>> = {},
  ): Promise<void> => {
    const cfg = { ...defaultConfig(), ...overrides };

    httpServiceMock = {
      post: jest.fn(),
    };

    const getMock: ConfigGetMock = jest.fn((key, def) =>
      cfg[key] === undefined ? def : cfg[key],
    );
    configServiceMock = {
      get: getMock,
    } as unknown as jest.Mocked<Pick<ConfigService, 'get'>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  };

  const getLatestPostCall = (): PostCall | undefined => {
    const calls = httpServiceMock.post.mock.calls;

    if (calls.length === 0) {
      return undefined;
    }

    const latest = calls[calls.length - 1];
    const [url, body, config] = latest ?? [];

    if (typeof url !== 'string') {
      return undefined;
    }

    if (typeof body !== 'object' || body === null) {
      return undefined;
    }

    const headers =
      typeof config === 'object' && config !== null
        ? (config as { headers?: Record<string, string> })
        : undefined;

    return [url, body as Record<string, unknown>, headers];
  };

  const extractAuthHeader = (): string | undefined => {
    const call = getLatestPostCall();
    if (!call) {
      return undefined;
    }
    const [, , config] = call;
    return config?.headers?.Authorization ?? config?.headers?.authorization;
  };

  beforeEach(async () => {
    await setup();
  });

  it('returns plain text completion', async () => {
    httpServiceMock.post.mockReturnValueOnce(of(createResponse('hello world')));

    const response = await service.chatCompletion({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(response).toBe('hello world');
    expect(httpServiceMock.post.mock.calls).toHaveLength(1);
  });

  it('parses JSON completion', async () => {
    httpServiceMock.post.mockReturnValueOnce(
      of(createJsonResponse({ foo: 'bar' })),
    );

    const response = await service.chatCompletionJson<{ foo: string }>({
      provider: 'deepseek',
      messages: [{ role: 'user', content: 'Return JSON' }],
    });

    expect(response.foo).toBe('bar');
  });

  it('repairs malformed JSON when possible', async () => {
    httpServiceMock.post.mockReturnValueOnce(
      of(createResponse('{"foo":"bar"')),
    );

    const response = await service.chatCompletionJson<{ foo: string }>({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Return JSON' }],
    });

    expect(response.foo).toBe('bar');
  });

  it('repairs JSON with missing closing brackets', async () => {
    // Mock multiple calls for retry logic
    httpServiceMock.post.mockReturnValue(
      of(createResponse('{"days":[{"day":1},{"day":2}')),
    );

    const response = await service.chatCompletionJson<{
      days: Array<{ day: number }>;
    }>(
      {
        provider: 'openai',
        messages: [{ role: 'user', content: 'Return JSON' }],
      },
      1, // Only 1 retry attempt for faster tests
    );

    expect(response.days).toHaveLength(2);
    expect(response.days[0].day).toBe(1);
    expect(response.days[1].day).toBe(2);
  });

  it('repairs JSON with missing commas in arrays', async () => {
    httpServiceMock.post.mockReturnValueOnce(
      of(createResponse('{"items":[{"id":1}{"id":2}]}')),
    );

    const response = await service.chatCompletionJson<{
      items: Array<{ id: number }>;
    }>({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Return JSON' }],
    });

    expect(response.items).toHaveLength(2);
    expect(response.items[0].id).toBe(1);
    expect(response.items[1].id).toBe(2);
  });

  it('extracts JSON from markdown code blocks', async () => {
    httpServiceMock.post.mockReturnValueOnce(
      of(
        createResponse(
          'Here is the JSON:\n```json\n{"foo":"bar"}\n```\nThat was the JSON.',
        ),
      ),
    );

    const response = await service.chatCompletionJson<{ foo: string }>({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Return JSON' }],
    });

    expect(response.foo).toBe('bar');
  });

  it('removes trailing commas', async () => {
    httpServiceMock.post.mockReturnValueOnce(
      of(createResponse('{"foo":"bar","baz":"qux",}')),
    );

    const response = await service.chatCompletionJson<{
      foo: string;
      baz: string;
    }>({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Return JSON' }],
    });

    expect(response.foo).toBe('bar');
    expect(response.baz).toBe('qux');
  });

  it('handles truncated JSON by finding last valid position', async () => {
    // Simulate a truncated response that cuts off mid-object
    const truncatedJson = '{"days":[{"day":1,"activities":[{"type":"hotel"';
    httpServiceMock.post.mockReturnValue(of(createResponse(truncatedJson)));

    const response = await service.chatCompletionJson<{
      days: Array<{ day: number; activities?: Array<{ type: string }> }>;
    }>(
      {
        provider: 'openai',
        messages: [{ role: 'user', content: 'Return JSON' }],
      },
      1, // Only 1 retry attempt for faster tests
    );

    // Should at least parse the valid part
    expect(response.days).toBeDefined();
    expect(Array.isArray(response.days)).toBe(true);
  });

  it('retries on retryable errors', async () => {
    httpServiceMock.post
      .mockReturnValueOnce(throwError(() => createAxiosError(500)))
      .mockReturnValueOnce(of(createResponse('after retry')));

    const response = await service.chatCompletion({
      provider: 'openai',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response).toBe('after retry');
    expect(httpServiceMock.post.mock.calls).toHaveLength(2);
  });

  it('throws if API key missing', async () => {
    await setup({ OPENAI_API_KEY: undefined });

    await expect(
      service.chatCompletion({
        provider: 'openai',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Missing API key');
  });

  it.each<LlmProvider>(['openai', 'deepseek'])(
    'uses provider defaults and correct endpoint for %s',
    async (provider) => {
      httpServiceMock.post.mockReturnValueOnce(of(createResponse('ok')));

      await service.chatCompletion({
        provider,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const latestCall = getLatestPostCall();
      expect(latestCall).toBeDefined();
      if (!latestCall) {
        throw new Error('httpService.post was not invoked');
      }

      const [url, body] = latestCall;

      const baseUrl =
        provider === 'openai'
          ? 'https://api.openai.com/v1'
          : 'https://api.deepseek.com/v1';

      expect(url).toBe(`${baseUrl}/chat/completions`);
      expect(typeof body.model).toBe('string');
      expect(Array.isArray(body.messages)).toBe(true);

      const expectedKey = provider === 'openai' ? 'openai-key' : 'deepseek-key';
      expect(extractAuthHeader()).toBe(`Bearer ${expectedKey}`);
    },
  );
});
