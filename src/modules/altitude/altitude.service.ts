import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HIGH_ALTITUDE_REGIONS, HighAltitudeRegion } from './data/high-altitude.data';
import {
  AltitudeRegionDto,
  RiskReportResponseDto,
  RiskAssessmentDto,
  CurrentWeatherDto,
} from './dto/altitude.dto';

@Injectable()
export class AltitudeService {
  private readonly logger = new Logger(AltitudeService.name);
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly weatherCacheTtlSeconds = 30 * 60; // 30分钟缓存

  constructor(private readonly configService: ConfigService) {
    // 初始化 Redis 客户端
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        const password = url.password || undefined;
        const host = url.hostname;
        const port = parseInt(url.port || '6379', 10);

        this.redisClient = new Redis({
          host,
          port,
          password,
          ...(url.username && url.username !== 'default'
            ? { username: url.username }
            : {}),
          keepAlive: 1000,
          connectTimeout: 10000,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });

        this.redisClient.on('error', (error) => {
          this.logger.warn('Redis connection error in AltitudeService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for altitude weather cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for AltitudeService');
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for AltitudeService:', error);
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.warn('REDIS_URL not configured, altitude weather cache disabled');
    }
  }

  /**
   * 模糊搜索高海拔地区
   * 解决用户输入不准确的问题
   */
  searchRegions(query: string): AltitudeRegionDto[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase().trim();

    const results = HIGH_ALTITUDE_REGIONS.filter(
      (region) =>
        region.name.toLowerCase().includes(lowerQuery) ||
        region.aliases?.some((alias) => alias.toLowerCase().includes(lowerQuery)) ||
        region.country.toLowerCase().includes(lowerQuery),
    )
      .slice(0, 5) // 只返回前5条，优化体验
      .map((region) => this.mapToDto(region));

    this.logger.debug(`Search query "${query}" returned ${results.length} results`);
    return results;
  }

  /**
   * 获取实时高反风险报告（核心业务逻辑）
   */
  async getRiskReport(regionId: string): Promise<RiskReportResponseDto> {
    const region = HIGH_ALTITUDE_REGIONS.find((r) => r.id === regionId);
    if (!region) {
      throw new NotFoundException(`高海拔地区不存在: ${regionId}`);
    }

    // 检查缓存
    const cacheKey = this.getWeatherCacheKey(regionId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Weather cache hit for region: ${regionId}`);
      return {
        ...cached,
        fromCache: true,
      };
    }

    // 调用天气 API
    const weather = await this.fetchWeather(
      region.coordinates.latitude,
      region.coordinates.longitude,
    );

    // 计算风险指数
    const riskReport = this.calculateRisk(region, weather);

    // 保存到缓存
    await this.setCache(cacheKey, riskReport);

    return riskReport;
  }

  /**
   * 私有方法：获取天气（使用 Open-Meteo API）
   */
  private async fetchWeather(lat: number, lon: number): Promise<any> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,surface_pressure`;

      // 配置代理（如果有）
      const httpsProxy = this.configService.get<string>('HTTPS_PROXY') ||
        this.configService.get<string>('HTTP_PROXY');
      
      const axiosConfig: any = {
        timeout: 10000,
      };

      if (httpsProxy) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(httpsProxy);
        axiosConfig.httpAgent = new HttpsProxyAgent(httpsProxy);
      }

      const { data } = await axios.get(url, axiosConfig);
      return data;
    } catch (error) {
      this.logger.error('Open-Meteo API failed', error);
      // 降级策略：如果天气挂了，至少返回地理信息，不报错
      return null;
    }
  }

  /**
   * 私有方法：风险算法模型
   */
  private calculateRisk(
    region: HighAltitudeRegion,
    weatherData: any,
  ): RiskReportResponseDto {
    const temp = weatherData?.current_weather?.temperature ?? 10; // 默认值防止崩溃
    const wind = weatherData?.current_weather?.windspeed ?? 0;

    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let advice = '在此高度，大多数人会有轻微气喘，属正常现象。';
    const tags: string[] = [];

    // --- 算法逻辑 ---

    // 规则 A: 海拔硬指标
    if (region.category === 'extreme') {
      riskLevel = 'HIGH';
      advice =
        '极高海拔！严禁剧烈运动，必须携带氧气瓶。如果出现头痛欲裂，请立即下撤。';
      tags.push('极高海拔');
    } else if (region.category === 'high') {
      riskLevel = 'MEDIUM';
      advice = '高海拔地区，建议到达后在酒店休息 2-3 小时再活动。';
      tags.push('高海拔');
    } else if (region.category === 'medium') {
      riskLevel = 'LOW';
      advice = '中等海拔，大多数人可以适应，但仍需注意休息。';
      tags.push('中等海拔');
    }

    // 规则 B: 天气加成（失温会加剧高反）
    if (temp < 0) {
      riskLevel = 'CRITICAL'; // 升级风险
      advice += ' ⚠️ 当前气温极低，极易诱发失温和肺水肿，请务必保暖！';
      tags.push('极寒');
    } else if (temp < 10) {
      tags.push('寒冷');
      if (riskLevel === 'LOW') {
        riskLevel = 'MEDIUM';
      }
    }

    // 规则 C: 风力加成（风寒效应）
    if (wind > 20) {
      advice += ' ⚠️ 外部风力强劲，体感温度会更低。';
      tags.push('大风');
      if (riskLevel === 'MEDIUM') {
        riskLevel = 'HIGH';
      } else if (riskLevel === 'LOW') {
        riskLevel = 'MEDIUM';
      }
    }

    // 规则 D: 特殊说明（如"开车直达"）
    if (region.notes?.includes('开车直达')) {
      advice += ' ⚠️ 警告：该地点可驾车直达，身体缺乏适应时间，极易发生隐性高反，请放慢动作。';
      tags.push('开车直达');
      if (riskLevel === 'LOW' || riskLevel === 'MEDIUM') {
        riskLevel = 'HIGH';
      }
    }

    return {
      regionName: region.name,
      elevation: region.altitudeRange,
      currentWeather: {
        temp: `${Math.round(temp)}°C`,
        wind: `${Math.round(wind)} km/h`,
      },
      riskAssessment: {
        level: riskLevel,
        colorCode: this.getColorCode(riskLevel),
        advice: advice,
        tags: tags,
      },
      fromCache: false,
    };
  }

  /**
   * 获取风险等级对应的颜色代码
   */
  private getColorCode(level: string): string {
    switch (level) {
      case 'CRITICAL':
        return '#FF0000'; // 鲜红
      case 'HIGH':
        return '#FF4500'; // 橙红
      case 'MEDIUM':
        return '#FFA500'; // 橙色
      default:
        return '#28a745'; // 绿色
    }
  }

  /**
   * 映射到 DTO
   */
  private mapToDto(region: HighAltitudeRegion): AltitudeRegionDto {
    return {
      id: region.id,
      name: region.name,
      aliases: region.aliases,
      country: region.country,
      region: region.region,
      altitudeRange: region.altitudeRange,
      category: region.category,
      notes: region.notes,
    };
  }

  /**
   * 生成天气缓存 key
   */
  private getWeatherCacheKey(regionId: string): string {
    return `altitude-weather:${regionId}`;
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(key: string): Promise<RiskReportResponseDto | null> {
    if (!this.useRedisCache || !this.redisClient) {
      return null;
    }

    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        return JSON.parse(cached) as RiskReportResponseDto;
      }
    } catch (error) {
      this.logger.warn(`Redis cache read error for ${key}:`, error);
    }

    return null;
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, value: RiskReportResponseDto): Promise<void> {
    if (!this.useRedisCache || !this.redisClient) {
      return;
    }

    try {
      await this.redisClient.setex(key, this.weatherCacheTtlSeconds, JSON.stringify(value));
      this.logger.debug(`Altitude weather cached: ${key}`);
    } catch (error) {
      this.logger.warn(`Redis cache write error for ${key}:`, error);
    }
  }
}

