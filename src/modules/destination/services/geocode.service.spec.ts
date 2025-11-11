import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { GeocodeService } from './geocode.service';

describe('GeocodeService', () => {
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
        GeocodeService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return module.get<GeocodeService>(GeocodeService);
  };

  it('should be defined', async () => {
    const service = await createService({
      MAPBOX_ACCESS_TOKEN: 'token',
      MAPBOX_BASE_URL: 'https://api.mapbox.com',
    });

    expect(service).toBeDefined();
  });

  it('调用 Mapbox geocode 并返回结果', async () => {
    const service = await createService({
      MAPBOX_ACCESS_TOKEN: 'token',
      MAPBOX_BASE_URL: 'https://api.mapbox.com',
    });

    const axiosResponse: AxiosResponse = {
      data: {
        features: [
          {
            place_name: 'Paris, France',
            center: [2.3522, 48.8566],
            id: 'place.paris',
            context: [{ id: 'country.123', text: 'France' }],
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    httpServiceMock.get.mockReturnValueOnce(of(axiosResponse));

    const response = await service.lookup({ query: 'Paris', limit: 1 });

    expect(httpServiceMock.get).toHaveBeenCalled();
    expect(response.features[0]).toMatchObject({
      name: 'Paris, France',
      latitude: 48.8566,
      longitude: 2.3522,
      countryCode: 'France',
    });
  });

  it('缺少 token 时抛出错误', async () => {
    const service = await createService({});

    await expect(service.lookup({ query: 'Paris' })).rejects.toThrow(
      'MAPBOX_ACCESS_TOKEN',
    );
  });
});
