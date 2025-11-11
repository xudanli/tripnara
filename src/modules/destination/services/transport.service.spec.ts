import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { TransportService } from './transport.service';
import { TransportRequestDto } from '../dto/destination.dto';

describe('TransportService', () => {
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
        TransportService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return module.get<TransportService>(TransportService);
  };

  it('should be defined', async () => {
    const service = await createService({ MAPBOX_ACCESS_TOKEN: 'token' });
    expect(service).toBeDefined();
  });

  it('返回路线结果', async () => {
    const service = await createService({ MAPBOX_ACCESS_TOKEN: 'token' });

    const axiosResponse: AxiosResponse = {
      data: {
        routes: [
          {
            duration: 1800,
            distance: 10000,
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    httpServiceMock.get.mockReturnValueOnce(of(axiosResponse));

    const response = await service.calculateRoutes({
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 1, longitude: 1 },
    });

    expect(httpServiceMock.get).toHaveBeenCalled();
    expect(response.options.length).toBeGreaterThan(0);
    expect(response.options[0].durationMinutes).toBeGreaterThan(0);
  });

  it('缺少 token 时抛出错误', async () => {
    const service = await createService({});

    const dto: TransportRequestDto = {
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 1, longitude: 1 },
    };

    await expect(service.calculateRoutes(dto)).rejects.toThrow(
      'MAPBOX_ACCESS_TOKEN',
    );
  });
});
