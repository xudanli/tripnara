import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

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

// WeatherAPI 响应接口
interface WeatherApiResponse {
  current: {
    temp_c: number;
    condition: {
      text: string;
    };
    humidity: number;
    wind_kph: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        avgtemp_c: number;
        condition: {
          text: string;
        };
      };
    }>;
  };
}

// 和风天气响应接口
interface QWeatherCurrentResponse {
  code: string;
  now: {
    temp: string;
    text: string;
    humidity: string;
    windSpeed: string;
  };
}

interface QWeatherForecastResponse {
  code: string;
  daily: Array<{
    fxDate: string;
    tempMax: string;
    tempMin: string;
    textDay: string;
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly weatherApiKey?: string;
  private readonly weatherApiUrl: string;
  private readonly qweatherApiKey?: string;
  private readonly qweatherApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.weatherApiKey = this.configService.get<string>('WEATHER_API_KEY');
    this.weatherApiUrl =
      this.configService.get<string>('WEATHER_API_URL') ||
      'https://api.weatherapi.com/v1';
    this.qweatherApiKey = this.configService.get<string>('QWEATHER_API_KEY');
    this.qweatherApiUrl =
      this.configService.get<string>('QWEATHER_API_URL') ||
      'https://devapi.qweather.com/v7';
  }

  /**
   * 获取目的地天气信息
   * 根据国家代码判断使用哪个 API：中国用 QWeather，其他用 WeatherAPI
   */
  async getWeatherByDestinationId(
    destinationId: string,
    destinationName: string,
    coordinates?: { lat: number; lng: number },
    countryCode?: string,
  ): Promise<WeatherData> {
    // 判断是否是中国（CN 或 CHN）
    const isChina =
      countryCode?.toUpperCase() === 'CN' ||
      countryCode?.toUpperCase() === 'CHN' ||
      this.isChineseCity(destinationName);

    if (isChina && this.qweatherApiKey) {
      // 使用和风天气 API（中国）
      return this.getWeatherFromQWeather(destinationName, coordinates);
    } else if (this.weatherApiKey) {
      // 使用 WeatherAPI（全球）
      return this.getWeatherFromWeatherAPI(destinationName, coordinates);
    } else {
      // 如果都没有配置，返回占位符数据
      this.logger.warn(
        `天气 API 未配置，返回占位符数据。目的地: ${destinationName}`,
      );
      return this.getPlaceholderWeather();
    }
  }

  /**
   * 根据坐标获取天气信息
   */
  async getWeatherByCoordinates(
    lat: number,
    lng: number,
    countryCode?: string,
  ): Promise<WeatherData> {
    const isChina =
      countryCode?.toUpperCase() === 'CN' ||
      countryCode?.toUpperCase() === 'CHN';

    if (isChina && this.qweatherApiKey) {
      return this.getWeatherFromQWeatherByCoordinates(lat, lng);
    } else if (this.weatherApiKey) {
      return this.getWeatherFromWeatherAPIByCoordinates(lat, lng);
    } else {
      this.logger.warn(
        `天气 API 未配置，返回占位符数据。坐标: ${lat}, ${lng}`,
      );
      return this.getPlaceholderWeather();
    }
  }

  /**
   * 使用 WeatherAPI 获取天气（全球）
   */
  private async getWeatherFromWeatherAPI(
    location: string,
    coordinates?: { lat: number; lng: number },
  ): Promise<WeatherData> {
    try {
      // WeatherAPI 支持城市名称或坐标
      const query = coordinates
        ? `${coordinates.lat},${coordinates.lng}`
        : location;

      const url = `${this.weatherApiUrl}/forecast.json`;
      const response = await firstValueFrom(
        this.httpService.get<WeatherApiResponse>(url, {
          params: {
            key: this.weatherApiKey,
            q: query,
            days: 7,
            lang: 'zh',
          },
        }),
      );

      const current = response.data.current;
      const forecast = response.data.forecast;

      const weatherData: WeatherData = {
        temperature: Math.round(current.temp_c),
        condition: this.translateCondition(current.condition.text),
        humidity: current.humidity,
        windSpeed: Math.round(current.wind_kph),
      };

      // 添加天气预报
      if (forecast?.forecastday) {
        weatherData.forecast = forecast.forecastday.map((day) => ({
          date: day.date,
          temperature: Math.round(day.day.avgtemp_c),
          condition: this.translateCondition(day.day.condition.text),
        }));
      }

      return weatherData;
    } catch (error) {
      this.logger.error(`WeatherAPI 调用失败: ${error}`);
      if (isAxiosError(error)) {
        throw new HttpException(
          `天气服务调用失败: ${error.response?.statusText || error.message}`,
          error.response?.status || HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        '天气服务调用失败',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 使用 WeatherAPI 根据坐标获取天气
   */
  private async getWeatherFromWeatherAPIByCoordinates(
    lat: number,
    lng: number,
  ): Promise<WeatherData> {
    return this.getWeatherFromWeatherAPI('', { lat, lng });
  }

  /**
   * 使用和风天气 API 获取天气（中国）
   */
  private async getWeatherFromQWeather(
    location: string,
    coordinates?: { lat: number; lng: number },
  ): Promise<WeatherData> {
    try {
      // 和风天气需要先获取 locationId
      let locationId: string;

      if (coordinates) {
        // 使用坐标获取 locationId
        const geoUrl = `${this.qweatherApiUrl}/location/geo`;
        const geoResponse = await firstValueFrom(
          this.httpService.get(geoUrl, {
            params: {
              key: this.qweatherApiKey,
              location: `${coordinates.lng},${coordinates.lat}`,
            },
          }),
        );

        if (geoResponse.data.code !== '200' || !geoResponse.data.location?.[0]) {
          throw new Error('无法获取位置信息');
        }

        locationId = geoResponse.data.location[0].id;
      } else {
        // 使用城市名称获取 locationId
        const cityUrl = `${this.qweatherApiUrl}/city/lookup`;
        const cityResponse = await firstValueFrom(
          this.httpService.get(cityUrl, {
            params: {
              key: this.qweatherApiKey,
              location: location,
              adm: 'CN', // 限制在中国
            },
          }),
        );

        if (cityResponse.data.code !== '200' || !cityResponse.data.location?.[0]) {
          throw new Error('无法找到城市信息');
        }

        locationId = cityResponse.data.location[0].id;
      }

      // 获取当前天气
      const currentUrl = `${this.qweatherApiUrl}/weather/now`;
      const currentResponse = await firstValueFrom(
        this.httpService.get<QWeatherCurrentResponse>(currentUrl, {
          params: {
            key: this.qweatherApiKey,
            location: locationId,
          },
        }),
      );

      if (currentResponse.data.code !== '200') {
        throw new Error(`和风天气 API 错误: ${currentResponse.data.code}`);
      }

      const now = currentResponse.data.now;

      // 获取天气预报
      const forecastUrl = `${this.qweatherApiUrl}/weather/7d`;
      const forecastResponse = await firstValueFrom(
        this.httpService.get<QWeatherForecastResponse>(forecastUrl, {
          params: {
            key: this.qweatherApiKey,
            location: locationId,
          },
        }),
      );

      const weatherData: WeatherData = {
        temperature: parseInt(now.temp, 10),
        condition: now.text,
        humidity: parseInt(now.humidity, 10),
        windSpeed: parseFloat(now.windSpeed),
      };

      // 添加天气预报
      if (forecastResponse.data.code === '200' && forecastResponse.data.daily) {
        weatherData.forecast = forecastResponse.data.daily.map((day) => ({
          date: day.fxDate,
          temperature: Math.round(
            (parseInt(day.tempMax, 10) + parseInt(day.tempMin, 10)) / 2,
          ),
          condition: day.textDay,
        }));
      }

      return weatherData;
    } catch (error) {
      this.logger.error(`和风天气 API 调用失败: ${error}`);
      if (isAxiosError(error)) {
        throw new HttpException(
          `天气服务调用失败: ${error.response?.statusText || error.message}`,
          error.response?.status || HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        '天气服务调用失败',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 使用和风天气根据坐标获取天气
   */
  private async getWeatherFromQWeatherByCoordinates(
    lat: number,
    lng: number,
  ): Promise<WeatherData> {
    return this.getWeatherFromQWeather('', { lat, lng });
  }

  /**
   * 判断是否是中国城市（简单判断）
   */
  private isChineseCity(cityName: string): boolean {
    // 简单的中国城市名称判断
    const chineseCities = [
      '北京',
      '上海',
      '广州',
      '深圳',
      '杭州',
      '成都',
      '重庆',
      '武汉',
      '西安',
      '南京',
      '天津',
      '苏州',
      '长沙',
      '郑州',
      '东莞',
      '青岛',
      '沈阳',
      '宁波',
      '昆明',
      '大连',
    ];
    return chineseCities.some((city) => cityName.includes(city));
  }

  /**
   * 翻译天气状况（WeatherAPI 返回英文，需要翻译成中文）
   */
  private translateCondition(condition: string): string {
    const conditionMap: Record<string, string> = {
      'Sunny': '晴天',
      'Clear': '晴朗',
      'Partly cloudy': '部分多云',
      'Cloudy': '多云',
      'Overcast': '阴天',
      'Mist': '薄雾',
      'Fog': '雾',
      'Light rain': '小雨',
      'Moderate rain': '中雨',
      'Heavy rain': '大雨',
      'Light snow': '小雪',
      'Moderate snow': '中雪',
      'Heavy snow': '大雪',
      'Thunderstorm': '雷暴',
    };

    return conditionMap[condition] || condition;
  }

  /**
   * 返回占位符天气数据
   */
  private getPlaceholderWeather(): WeatherData {
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
}
