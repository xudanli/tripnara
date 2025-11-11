import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GeocodeLookupDto, GeocodeResponseDto } from '../dto/destination.dto';

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
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
