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
        EVENTBRITE_API_TOKEN: 'token',
        EVENTBRITE_BASE_URL: 'https://www.eventbriteapi.com',
        TRAVEL_ADVISOR_API_KEY: 'rapid-key',
        TRAVEL_ADVISOR_API_HOST: 'travel-advisor.p.rapidapi.com',
        TRAVEL_ADVISOR_BASE_URL: 'https://travel-advisor.p.rapidapi.com',
      };
      return map[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        EVENTBRITE_BASE_URL: 'https://www.eventbriteapi.com',
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

  it('caches event searches', async () => {
    mockedAxios.get.mockResolvedValue({ data: { events: [1] } });
    await service.searchEvents('深圳');
    await service.searchEvents('深圳');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('caches location searches', async () => {
    mockedAxios.get.mockResolvedValue({ data: { results: [1] } });
    await service.searchLocations('北京');
    await service.searchLocations('北京');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
});

