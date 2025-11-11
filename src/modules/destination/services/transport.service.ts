import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  TransportRequestDto,
  TransportResponseDto,
} from '../dto/destination.dto';

interface MapboxRoute {
  duration: number;
  distance: number;
}

interface MapboxDirectionsResponse {
  routes: MapboxRoute[];
}

const MODE_PROFILE_MAP: Record<string, string> = {
  driving: 'mapbox/driving',
  'driving-traffic': 'mapbox/driving-traffic',
  walking: 'mapbox/walking',
  cycling: 'mapbox/cycling',
  transit: 'mapbox/driving',
};

@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);
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

  async calculateRoutes(
    dto: TransportRequestDto,
  ): Promise<TransportResponseDto> {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN 未配置，无法计算交通方案');
    }

    const profile = this.resolveProfile(dto.mode);
    const coordinates = `${dto.origin.longitude},${dto.origin.latitude};${dto.destination.longitude},${dto.destination.latitude}`;
    const url = `${this.baseUrl}/directions/v5/${profile}/${coordinates}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxDirectionsResponse>(url, {
          params: {
            access_token: this.accessToken,
            overview: 'simplified',
            geometries: 'polyline',
            steps: false,
          },
        }),
      );

      const options = (response.data.routes ?? []).slice(0, 3).map((route) => ({
        mode: dto.mode ?? this.profileToMode(profile),
        durationMinutes: Math.round(route.duration / 60),
        distanceKm: Number((route.distance / 1000).toFixed(2)),
      }));

      return { options };
    } catch (error) {
      this.handleError('directions', error);
      throw new Error('调用交通路线服务失败');
    }
  }

  private resolveProfile(mode?: string): string {
    if (!mode) {
      return MODE_PROFILE_MAP.driving;
    }

    const normalized = mode.toLowerCase();
    return MODE_PROFILE_MAP[normalized] ?? MODE_PROFILE_MAP.driving;
  }

  private profileToMode(profile: string): string {
    const entry = Object.entries(MODE_PROFILE_MAP).find(
      ([, value]) => value === profile,
    );
    return entry?.[0] ?? 'driving';
  }

  private handleError(action: string, error: unknown): void {
    if (isAxiosError<MapboxDirectionsResponse>(error)) {
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
