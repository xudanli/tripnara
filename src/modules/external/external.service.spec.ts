import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExternalService } from './external.service';

jest.mock('axios');

describe('ExternalService', () => {
  let service: ExternalService;
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const config = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        TRAVEL_ADVISOR_API_KEY: 'rapid-key',
        TRAVEL_ADVISOR_API_HOST: 'travel-advisor.p.rapidapi.com',
        TRAVEL_ADVISOR_BASE_URL: 'https://travel-advisor.p.rapidapi.com',
      };
      return map[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        TRAVEL_ADVISOR_API_HOST: 'travel-advisor.p.rapidapi.com',
        TRAVEL_ADVISOR_BASE_URL: 'https://travel-advisor.p.rapidapi.com',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  beforeEach(async () => {
    mockedAxios.get.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<ExternalService>(ExternalService);
  });

  it('caches location searches', async () => {
    mockedAxios.get.mockResolvedValue({ data: { results: [1] } });
    await service.searchLocations('北京');
    await service.searchLocations('北京');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('returns guides from tripadvisor data', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          {
            result_object: {
              location_id: '123',
              name: 'Tokyo Highlights',
              web_url: 'https://tripadvisor.com/guide/tokyo',
              geo_description: 'Best of Tokyo',
              photo: { images: { large: { url: 'https://img' } } },
            },
          },
        ],
      },
    });
    const resp = await service.searchTravelGuides({
      destination: '东京',
      limit: 5,
      language: 'zh-CN',
    });
    expect(resp.success).toBe(true);
    expect(resp.data.length).toBe(1);
    expect(resp.data[0].title).toContain('Tokyo');
  });

  it('falls back to empty guides when error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('boom'));
    const resp = await service.searchTravelGuides({
      destination: '上海',
      limit: 5,
    });
    expect(resp.data).toHaveLength(0);
    expect(resp.success).toBe(true);
    expect(resp.error).toBe('TRIPADVISOR_SERVICE_ERROR');
  });
});

