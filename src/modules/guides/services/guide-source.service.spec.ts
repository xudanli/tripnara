import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { GuideSourceService } from './guide-source.service';

describe('GuideSourceService', () => {
  let httpServiceMock: Pick<jest.Mocked<HttpService>, 'get'>;

  const createService = async (configValues: Record<string, unknown>) => {
    httpServiceMock = {
      get: jest.fn(),
    };

    const configServiceMock: Pick<jest.Mocked<ConfigService>, 'get'> = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuideSourceService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return module.get<GuideSourceService>(GuideSourceService);
  };

  it('should be defined', async () => {
    const service = await createService({
      GUIDES_GOOGLE_API_KEY: 'key',
      GUIDES_GOOGLE_CX: 'cx',
    });

    expect(service).toBeDefined();
  });

  it('调用 Google Custom Search 并返回结果', async () => {
    const service = await createService({
      GUIDES_GOOGLE_API_KEY: 'key',
      GUIDES_GOOGLE_CX: 'cx',
    });

    const axiosResponse: AxiosResponse = {
      data: {
        items: [
          {
            title: 'Lisbon Travel Guide',
            link: 'https://example.com/lisbon',
            snippet: 'Best things to do in Lisbon.',
            displayLink: 'example.com',
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    httpServiceMock.get.mockReturnValueOnce(of(axiosResponse));

    const response = await service.searchGuides({ query: 'Lisbon' });

    expect(httpServiceMock.get).toHaveBeenCalled();
    expect(response.results[0]).toMatchObject({
      title: 'Lisbon Travel Guide',
      url: 'https://example.com/lisbon',
      source: 'example.com',
    });
  });

  it('缺少配置时抛出错误', async () => {
    const service = await createService({});

    await expect(service.searchGuides({ query: 'Lisbon' })).rejects.toThrow(
      'GUIDES_GOOGLE_API_KEY',
    );
  });

  it('列出可用来源', async () => {
    const service = await createService({
      GUIDES_GOOGLE_API_KEY: 'key',
      GUIDES_GOOGLE_CX: 'cx',
    });

    const response = service.listSources();
    expect(response.sources[0].id).toBe('google_custom_search');
  });
});
