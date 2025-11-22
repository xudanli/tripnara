import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  GeocodeLookupDto,
  GeocodeResponseDto,
  ReverseGeocodeQueryDto,
  ReverseGeocodeResponseDto,
} from '../dto/destination.dto';

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  properties?: Record<string, unknown>;
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('MAPBOX_BASE_URL') ??
      'https://api.mapbox.com';
    this.accessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
  }

  async lookup(dto: GeocodeLookupDto): Promise<GeocodeResponseDto> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(dto.query)}.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxGeocodeResponse>(url, {
          params: {
            access_token: this.accessToken,
            limit: dto.limit ?? 5,
            language: dto.language,
          },
        }),
      );

      const features = (response.data.features ?? []).map((feature) => ({
        name: feature.place_name,
        canonicalName: feature.place_name,
        latitude: feature.center[1],
        longitude: feature.center[0],
        countryCode: feature.context?.find((c) => c.id.startsWith('country'))
          ?.text,
        placeType: feature.id.split('.')[0],
      }));

      return { features };
    } catch (error) {
      this.handleError('geocode', error);
      throw new Error('调用地理编码服务失败');
    }
  }

  async reverseGeocode(
    dto: ReverseGeocodeQueryDto,
  ): Promise<ReverseGeocodeResponseDto> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务');
    }

    // Mapbox 反向地理编码格式：{lng},{lat}.json
    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${dto.lng},${dto.lat}.json`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxGeocodeResponse>(url, {
          params: {
            access_token: this.accessToken,
            limit: dto.limit ?? 1,
            language: dto.language ?? 'zh-CN',
            types: 'country,region,place,locality', // 限制返回类型
          },
        }),
      );

      const features = response.data.features ?? [];
      if (features.length === 0) {
        throw new Error('未找到匹配的地点信息');
      }

      // 取第一个结果（最匹配的）
      const feature = features[0];
      const context = feature.context || [];

      // 从 context 中提取国家、省州、城市等信息
      const country = context.find((c) => c.id.startsWith('country'));
      const region = context.find((c) =>
        c.id.startsWith('region') || c.id.startsWith('province'),
      );
      const place = context.find((c) => c.id.startsWith('place'));
      const locality = context.find((c) => c.id.startsWith('locality'));

      const transformed = {
        name: feature.place_name,
        fullAddress: feature.place_name,
        country: country?.text,
        countryCode: country?.short_code?.toUpperCase(),
        region: region?.text,
        regionCode: region?.short_code,
        city: place?.text || locality?.text,
        placeType: feature.id.split('.')[0],
        latitude: feature.center[1],
        longitude: feature.center[0],
      };

      return { data: transformed };
    } catch (error) {
      this.handleError('reverse geocode', error);
      throw new Error('调用反向地理编码服务失败');
    }
  }

  private handleError(action: string, error: unknown): void {
    if (isAxiosError<MapboxGeocodeResponse>(error)) {
      const { status, data } = error.response ?? {};
      this.logger.error(`调用 Mapbox ${action} 接口失败`, { status, data });
    } else if (error instanceof Error) {
      this.logger.error(`调用 Mapbox ${action} 接口发生未知错误`, error);
    } else {
      this.logger.error(`调用 Mapbox ${action} 接口发生未知错误`, {
        value: error,
      });
    }
  }
}
