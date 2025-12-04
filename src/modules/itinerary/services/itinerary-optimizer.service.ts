import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface MapboxWaypoint {
  waypoint_index: number;
  trips_index: number;
  location: [number, number]; // [lng, lat]
  name?: string;
}

interface MapboxTrip {
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  legs: Array<{
    distance: number;
    duration: number;
    steps: unknown[];
  }>;
  distance: number;
  duration: number;
  weight_name: string;
  weight: number;
}

interface MapboxOptimizationResponse {
  code: string;
  waypoints: MapboxWaypoint[];
  trips: MapboxTrip[];
}

export interface ActivityWithLocation {
  id?: string;
  title: string;
  location: { lat: number; lng: number };
  type?: string;
  time?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface OptimizedRouteResult {
  activities: ActivityWithLocation[];
  totalDistance: number; // 总距离（米）
  totalDuration: number; // 总时长（秒）
  routeGeometry?: {
    coordinates: [number, number][];
    type: string;
  };
  legs?: Array<{
    distance: number; // 米
    duration: number; // 秒
    from: number; // 起点索引
    to: number; // 终点索引
  }>;
}

@Injectable()
export class ItineraryOptimizerService {
  private readonly logger = new Logger(ItineraryOptimizerService.name);
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

    if (!this.accessToken) {
      this.logger.warn(
        'MAPBOX_ACCESS_TOKEN 未配置，路线优化功能将不可用',
      );
    }
  }

  /**
   * 优化路线顺序（TSP 问题求解）
   * 使用 Mapbox Optimization API 计算最优路线
   *
   * @param activities 活动列表（带坐标）
   * @param options 优化选项
   * @returns 优化后的活动列表和路线信息
   */
  async optimizeRoute(
    activities: ActivityWithLocation[],
    options?: {
      profile?: 'driving' | 'walking' | 'cycling';
      roundtrip?: boolean; // 是否回到起点
      source?: 'first' | 'any'; // 固定起点（first=第一个活动，any=任意起点）
      destination?: 'last' | 'any'; // 固定终点（last=最后一个活动，any=任意终点）
    },
  ): Promise<OptimizedRouteResult> {
    if (!this.accessToken) {
      throw new BadRequestException(
        'MAPBOX_ACCESS_TOKEN 未配置，无法进行路线优化',
      );
    }

    if (!activities || activities.length === 0) {
      throw new BadRequestException('活动列表不能为空');
    }

    if (activities.length < 2) {
      // 少于2个活动，无需优化，直接返回
      this.logger.debug('活动数量少于2个，无需优化');
      return {
        activities,
        totalDistance: 0,
        totalDuration: 0,
      };
    }

    // Mapbox Optimization API 最多支持 12 个点
    if (activities.length > 12) {
      this.logger.warn(
        `活动数量 ${activities.length} 超过 Mapbox 限制（12个），将只优化前12个`,
      );
      activities = activities.slice(0, 12);
    }

    // 验证所有活动都有坐标
    const invalidActivities = activities.filter(
      (a) => !a.location || !a.location.lat || !a.location.lng,
    );
    if (invalidActivities.length > 0) {
      throw new BadRequestException(
        `以下活动缺少坐标：${invalidActivities.map((a) => a.title).join(', ')}`,
      );
    }

    // Mapbox Optimization API 仅支持以下三种模式：
    // - mapbox/driving (驾车，不带实时路况)
    // - mapbox/walking (步行)
    // - mapbox/cycling (骑行)
    // 不支持 mapbox/driving-traffic 等其他模式
    const inputProfile = options?.profile || 'driving';
    
    // 确保 profile 值正确映射到 Mapbox 支持的格式
    let mapboxProfile: string;
    switch (inputProfile) {
      case 'driving':
        mapboxProfile = 'driving';
        break;
      case 'walking':
        mapboxProfile = 'walking';
        break;
      case 'cycling':
        mapboxProfile = 'cycling';
        break;
      default:
        // 如果传入不支持的 profile，默认使用 driving
        this.logger.warn(
          `不支持的 profile: ${inputProfile}，使用默认值 'driving'`,
        );
        mapboxProfile = 'driving';
    }
    
    const roundtrip = options?.roundtrip ?? false;
    const source = options?.source || 'first';
    const destination = options?.destination || 'any';

    // 1. 构建坐标字符串: "lng,lat;lng,lat;..."
    const coordinates = activities
      .map((a) => `${a.location.lng},${a.location.lat}`)
      .join(';');

    // 2. 调用 Mapbox Optimization API
    // URL 格式: /optimized-trips/v1/mapbox/{profile}/{coordinates}
    const url = `${this.baseUrl}/optimized-trips/v1/mapbox/${mapboxProfile}/${coordinates}`;
    
    this.logger.debug(
      `调用 Mapbox Optimization API: profile=${mapboxProfile}, coordinates=${coordinates.substring(0, 50)}...`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<MapboxOptimizationResponse>(url, {
          params: {
            access_token: this.accessToken,
            geometries: 'geojson',
            roundtrip: roundtrip ? 'true' : 'false',
            source: source === 'first' ? 'first' : 'any',
            destination: destination === 'last' ? 'last' : 'any',
            steps: false, // 不需要详细步骤
          },
          proxy: false, // 显式禁用代理
        }),
      );

      const data = response.data;

      if (data.code !== 'Ok') {
        this.logger.error(
          `Mapbox Optimization API 返回错误代码: ${data.code}`,
        );
        throw new BadRequestException(
          `路线优化失败: ${data.code}`,
        );
      }

      if (!data.trips || data.trips.length === 0) {
        this.logger.warn('Mapbox 未返回优化路线，使用原始顺序');
        return {
          activities,
          totalDistance: 0,
          totalDuration: 0,
        };
      }

      const trip = data.trips[0];
      const waypoints = data.waypoints;

      // 3. 根据优化后的 waypoint_index 重新排序活动
      // Mapbox 返回的 waypoints 已经按照优化后的顺序排列
      // waypoint_index 表示原始索引，我们需要根据当前顺序重新映射
      const sortedActivities: ActivityWithLocation[] = [];
      const indexMap = new Map<number, number>(); // 原始索引 -> 新索引

      // 按 waypoint_index 排序，获取优化后的顺序
      const sortedWaypoints = [...waypoints].sort(
        (a, b) => a.waypoint_index - b.waypoint_index,
      );

      sortedWaypoints.forEach((wp, newIndex) => {
        const originalIndex = wp.waypoint_index;
        indexMap.set(originalIndex, newIndex);
        sortedActivities.push(activities[originalIndex]);
      });

      // 4. 构建路线信息
      const legs: Array<{
        distance: number;
        duration: number;
        from: number;
        to: number;
      }> = [];

      if (trip.legs) {
        trip.legs.forEach((leg, legIndex) => {
          const fromIndex = sortedWaypoints[legIndex]?.waypoint_index ?? 0;
          const toIndex =
            sortedWaypoints[legIndex + 1]?.waypoint_index ??
            sortedWaypoints[0]?.waypoint_index ??
            0;

          legs.push({
            distance: leg.distance,
            duration: leg.duration,
            from: fromIndex,
            to: toIndex,
          });
        });
      }

      this.logger.log(
        `路线优化完成：${activities.length} 个活动，总距离 ${(trip.distance / 1000).toFixed(2)} 公里，总时长 ${Math.round(trip.duration / 60)} 分钟`,
      );

      return {
        activities: sortedActivities,
        totalDistance: trip.distance,
        totalDuration: trip.duration,
        routeGeometry: trip.geometry,
        legs,
      };
    } catch (error) {
      this.handleError('optimization', error);
      // 降级策略：如果优化失败，返回原始顺序
      this.logger.warn('路线优化失败，返回原始顺序');
      return {
        activities,
        totalDistance: 0,
        totalDuration: 0,
      };
    }
  }

  /**
   * 处理错误
   */
  private handleError(action: string, error: unknown): void {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      this.logger.error(`调用 Mapbox ${action} 接口失败`, {
        status,
        data,
        message: error.message,
      });
    } else if (error instanceof Error) {
      this.logger.error(`调用 Mapbox ${action} 接口发生未知错误`, error);
    } else {
      this.logger.error(
        `调用 Mapbox ${action} 接口发生未知错误`,
        String(error),
      );
    }
  }
}

