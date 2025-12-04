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

    // 验证坐标有效性（纬度 -90 到 90，经度 -180 到 180）
    const invalidCoordinates = activities.filter(
      (a) =>
        a.location.lat < -90 ||
        a.location.lat > 90 ||
        a.location.lng < -180 ||
        a.location.lng > 180,
    );
    if (invalidCoordinates.length > 0) {
      throw new BadRequestException(
        `以下活动的坐标无效：${invalidCoordinates.map((a) => `${a.title} (${a.location.lat}, ${a.location.lng})`).join(', ')}`,
      );
    }

    // 检查是否有重复的坐标（可能导致 NoRoute 错误）
    const duplicateCoordinates = new Set<string>();
    const duplicates: string[] = [];
    activities.forEach((a) => {
      const coordKey = `${a.location.lat.toFixed(6)},${a.location.lng.toFixed(6)}`;
      if (duplicateCoordinates.has(coordKey)) {
        duplicates.push(a.title);
      } else {
        duplicateCoordinates.add(coordKey);
      }
    });
    if (duplicates.length > 0) {
      this.logger.warn(
        `检测到重复坐标的活动：${duplicates.join(', ')}，这可能导致路线优化失败`,
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

    // 距离校验：检查点与点之间的距离是否合理
    // 如果距离过远（超过合理上限），可能是坐标错误（如跨洲）
    // 在调用 Mapbox API 之前进行校验，避免浪费 API 调用和返回 NoRoute 错误
    const MAX_DRIVING_DISTANCE_KM = 2000; // 合理的驾车距离上限（2000公里）
    const MAX_WALKING_DISTANCE_KM = 50; // 合理的步行距离上限（50公里）
    const MAX_CYCLING_DISTANCE_KM = 200; // 合理的骑行距离上限（200公里）

    // 根据 profile 选择不同的距离上限
    const maxDistanceKm =
      mapboxProfile === 'walking'
        ? MAX_WALKING_DISTANCE_KM
        : mapboxProfile === 'cycling'
        ? MAX_CYCLING_DISTANCE_KM
        : MAX_DRIVING_DISTANCE_KM;

    const distanceIssues: Array<{
      from: string;
      to: string;
      distance: number;
      fromCoord: { lat: number; lng: number };
      toCoord: { lat: number; lng: number };
    }> = [];

    for (let i = 0; i < activities.length - 1; i++) {
      const from = activities[i];
      const to = activities[i + 1];
      const distance = this.calculateDistance(
        from.location.lat,
        from.location.lng,
        to.location.lat,
        to.location.lng,
      );

      if (distance > maxDistanceKm) {
        distanceIssues.push({
          from: from.title,
          to: to.title,
          distance,
          fromCoord: { lat: from.location.lat, lng: from.location.lng },
          toCoord: { lat: to.location.lat, lng: to.location.lng },
        });
      }
    }

    if (distanceIssues.length > 0) {
      this.logger.error(
        `检测到异常距离的活动对（超过 ${maxDistanceKm}km，profile: ${mapboxProfile}），可能是坐标错误（如跨洲）：`,
        distanceIssues.map(
          (issue) =>
            `${issue.from} (${issue.fromCoord.lat}, ${issue.fromCoord.lng}) -> ${issue.to} (${issue.toCoord.lat}, ${issue.toCoord.lng}): ${issue.distance.toFixed(2)}km`,
        ),
      );
      this.logger.warn(
        `由于存在异常距离，跳过路线优化，返回原始顺序。建议检查地理编码服务返回的坐标是否正确。`,
      );
      return {
        activities,
        totalDistance: 0,
        totalDuration: 0,
      };
    }

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
        // 处理常见的错误代码
        if (data.code === 'NoRoute') {
          this.logger.warn(
            `Mapbox Optimization API 返回 NoRoute 错误，可能原因：坐标之间距离过远、坐标在海洋中、或无法计算路线。返回原始顺序。`,
          );
          
          // 记录所有活动的坐标信息，便于排查问题
          this.logger.warn(
            `[NoRoute 调试] 正在记录所有活动坐标以便排查问题（共 ${activities.length} 个活动）：`,
          );
          activities.forEach((activity, index) => {
            this.logger.warn(
              `  [${index + 1}] ${activity.title}: (${activity.location.lat}, ${activity.location.lng})`,
            );
          });
          
          // 记录坐标字符串（用于在 Mapbox 或 Google Maps 中测试）
          this.logger.warn(
            `[NoRoute 调试] 坐标字符串（Mapbox 格式）: ${coordinates.substring(0, 200)}${coordinates.length > 200 ? '...' : ''}`,
          );
          this.logger.warn(
            `[NoRoute 调试] Profile: ${mapboxProfile}, Roundtrip: ${roundtrip}, Source: ${source}, Destination: ${destination}`,
          );
          
          // 优雅降级：返回原始顺序
          return {
            activities,
            totalDistance: 0,
            totalDuration: 0,
          };
        }

        // 其他错误代码，记录详细信息
        this.logger.error(
          `Mapbox Optimization API 返回错误代码: ${data.code}`,
          {
            coordinates: coordinates.substring(0, 100),
            profile: mapboxProfile,
            activitiesCount: activities.length,
          },
        );
        
        // 对于其他错误，也尝试优雅降级
        this.logger.warn(
          `路线优化失败（错误代码: ${data.code}），返回原始顺序`,
        );
        return {
          activities,
          totalDistance: 0,
          totalDuration: 0,
        };
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

      // 3. 根据优化后的 trips_index 重新排序活动
      // FIX: 必须使用 trips_index (优化后的顺序) 进行排序，而不是 waypoint_index (原始输入顺序)
      // waypoint_index 指向原始 activities 数组中的下标
      // trips_index 表示优化后的顺序索引
      const sortedWaypoints = [...waypoints].sort(
        (a, b) => a.trips_index - b.trips_index,
      );

      const sortedActivities: ActivityWithLocation[] = [];
      
      sortedWaypoints.forEach((wp) => {
        // wp.waypoint_index 指向原始 activities 数组中的下标
        const originalActivity = activities[wp.waypoint_index];
        sortedActivities.push(originalActivity);
      });

      // 4. 构建路线信息 (Legs)
      const legs: Array<{
        distance: number;
        duration: number;
        from: number;
        to: number;
      }> = [];

      if (trip.legs) {
        trip.legs.forEach((leg, legIndex) => {
          // 获取当前路段的起点和终点在 sortedActivities 中的索引
          // legs[0] 是从 sortedWaypoints[0] 到 sortedWaypoints[1]
          legs.push({
            distance: leg.distance,
            duration: leg.duration,
            from: legIndex,       // 优化后数组的当前索引
            to: legIndex + 1,     // 优化后数组的下一索引
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
      // 如果是在处理 NoRoute 或其他错误代码时已经返回了原始顺序，不应该到达这里
      // 但如果是因为网络错误或其他异常，需要降级处理
      this.handleError('optimization', error);
      
      // 检查是否是 BadRequestException（已经在上面处理过，不应该到达这里）
      if (error instanceof BadRequestException) {
        // 如果是坐标验证错误等，应该抛出
        throw error;
      }
      
      // 降级策略：如果优化失败，返回原始顺序
      this.logger.warn(
        '路线优化失败，返回原始顺序',
        error instanceof Error ? error.message : String(error),
      );
      return {
        activities,
        totalDistance: 0,
        totalDuration: 0,
      };
    }
  }

  /**
   * 计算两点间的距离（使用 Haversine 公式）
   * @param lat1 第一个点的纬度
   * @param lng1 第一个点的经度
   * @param lat2 第二个点的纬度
   * @param lng2 第二个点的经度
   * @returns 距离（公里）
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLng = this.degreesToRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * 将角度转换为弧度
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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

