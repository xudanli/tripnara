import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  forecast?: Array<{
    date: string;
    temperature: number;
    condition: string;
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly weatherApiKey?: string;
  private readonly weatherApiUrl?: string;

  constructor(private readonly configService: ConfigService) {
    // 预留天气 API 配置
    this.weatherApiKey = this.configService.get<string>('WEATHER_API_KEY');
    this.weatherApiUrl = this.configService.get<string>('WEATHER_API_URL');
  }

  /**
   * 获取目的地天气信息
   * 当前为占位符实现，等待第三方 API 配置
   */
  async getWeatherByDestinationId(
    destinationId: string,
    destinationName: string,
    coordinates?: { lat: number; lng: number },
  ): Promise<WeatherData> {
    // 检查是否配置了天气 API
    if (!this.weatherApiKey || !this.weatherApiUrl) {
      this.logger.warn(
        `天气 API 未配置，返回占位符数据。目的地: ${destinationName}`,
      );
      
      // 返回占位符数据
      return {
        temperature: 20,
        condition: '晴天',
        humidity: 60,
        windSpeed: 10,
        forecast: [
          {
            date: new Date().toISOString().split('T')[0],
            temperature: 20,
            condition: '晴天',
          },
        ],
      };
    }

    // TODO: 实现实际的天气 API 调用
    // 当用户提供天气 API 后，在这里实现实际的 API 调用逻辑
    throw new NotImplementedException(
      '天气 API 功能待实现，请配置 WEATHER_API_KEY 和 WEATHER_API_URL 环境变量',
    );
  }

  /**
   * 根据坐标获取天气信息
   */
  async getWeatherByCoordinates(
    lat: number,
    lng: number,
  ): Promise<WeatherData> {
    if (!this.weatherApiKey || !this.weatherApiUrl) {
      this.logger.warn(
        `天气 API 未配置，返回占位符数据。坐标: ${lat}, ${lng}`,
      );
      
      return {
        temperature: 20,
        condition: '晴天',
        humidity: 60,
        windSpeed: 10,
      };
    }

    // TODO: 实现实际的天气 API 调用
    throw new NotImplementedException(
      '天气 API 功能待实现，请配置 WEATHER_API_KEY 和 WEATHER_API_URL 环境变量',
    );
  }
}

