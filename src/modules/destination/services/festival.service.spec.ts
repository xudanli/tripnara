import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { FestivalService } from './festival.service';

describe('FestivalService', () => {
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
        FestivalService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return module.get<FestivalService>(FestivalService);
  };

  it('should be defined', async () => {
    const service = await createService({ EVENTBRITE_API_TOKEN: 'token' });
    expect(service).toBeDefined();
  });

  it('调用 Eventbrite 并返回活动列表', async () => {
    const service = await createService({ EVENTBRITE_API_TOKEN: 'token' });

    const axiosResponse: AxiosResponse = {
      data: {
        events: [
          {
            id: '1',
            name: { text: 'Tokyo Food Festival' },
            start: { utc: '2025-01-01T00:00:00Z' },
            url: 'https://eventbrite.com/events/1',
            venue: { address: { localized_address_display: 'Tokyo, Japan' } },
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    httpServiceMock.get.mockReturnValueOnce(of(axiosResponse));

    const response = await service.listEvents({ destination: 'Tokyo' });

    expect(httpServiceMock.get).toHaveBeenCalled();
    expect(response.events[0]).toMatchObject({
      name: 'Tokyo Food Festival',
      venue: { address: 'Tokyo, Japan' },
    });
  });

  it('缺少 token 时抛出错误', async () => {
    const service = await createService({});

    await expect(service.listEvents({ destination: 'Tokyo' })).rejects.toThrow(
      'EVENTBRITE_API_TOKEN',
    );
  });
});
