#!/usr/bin/env ts-node

/**
 * 天气 API 测试脚本
 * 
 * 测试内容：
 * 1. WeatherAPI（全球天气服务）
 * 2. 和风天气（QWeather，中国天气服务）
 * 
 * 使用方法：
 *   npm run test:weather
 *   或
 *   ts-node scripts/test-weather-api.ts
 * 
 * 环境变量：
 *   WEATHER_API_KEY - WeatherAPI 的 API Key
 *   QWEATHER_API_KEY - 和风天气的 API Key
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 加载环境变量
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.prod' 
  : process.env.NODE_ENV === 'test'
  ? '.env.test'
  : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface TestResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

// WeatherAPI 测试
async function testWeatherAPI(location: string, coordinates?: { lat: number; lng: number }): Promise<TestResult> {
  const apiKey = process.env.WEATHER_API_KEY;
  const apiUrl = process.env.WEATHER_API_URL || 'https://api.weatherapi.com/v1';
  
  if (!apiKey) {
    return {
      name: 'WeatherAPI',
      success: false,
      error: 'WEATHER_API_KEY 未配置',
    };
  }

  const startTime = Date.now();
  try {
    const query = coordinates ? `${coordinates.lat},${coordinates.lng}` : location;
    const url = `${apiUrl}/forecast.json`;
    
    // 配置代理（如果有）
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const axiosConfig: any = {
      params: {
        key: apiKey,
        q: query,
        days: 7,
        lang: 'zh',
      },
      timeout: 10000,
    };

    if (httpsProxy) {
      axiosConfig.httpsAgent = new HttpsProxyAgent(httpsProxy);
      axiosConfig.httpAgent = new HttpsProxyAgent(httpsProxy);
    }
    
    const response = await axios.get(url, axiosConfig);

    const current = response.data.current;
    const forecast = response.data.forecast;

    const duration = Date.now() - startTime;
    return {
      name: `WeatherAPI - ${location}`,
      success: true,
      data: {
        temperature: Math.round(current.temp_c),
        condition: current.condition.text,
        humidity: current.humidity,
        windSpeed: Math.round(current.wind_kph),
        forecast: forecast?.forecastday?.map((day: any) => ({
          date: day.date,
          temperature: Math.round(day.day.avgtemp_c),
          condition: day.day.condition.text,
        })) || [],
      },
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: `WeatherAPI - ${location}`,
      success: false,
      error: error.response?.data?.error?.message || error.message || String(error),
      duration,
    };
  }
}

// 和风天气测试
async function testQWeather(location: string, coordinates?: { lat: number; lng: number }): Promise<TestResult> {
  const apiKey = process.env.QWEATHER_API_KEY;
  const apiUrl = process.env.QWEATHER_API_URL || 'https://devapi.qweather.com/v7';
  
  if (!apiKey) {
    return {
      name: '和风天气',
      success: false,
      error: 'QWEATHER_API_KEY 未配置',
    };
  }

  const startTime = Date.now();
  try {
    // 配置代理（如果有）
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const axiosConfig: any = {
      timeout: 10000,
    };

    if (httpsProxy) {
      axiosConfig.httpsAgent = new HttpsProxyAgent(httpsProxy);
      axiosConfig.httpAgent = new HttpsProxyAgent(httpsProxy);
    }

    let locationId: string;

    if (coordinates) {
      // 使用坐标获取 locationId
      const geoUrl = `${apiUrl}/location/geo`;
      const geoResponse = await axios.get(geoUrl, {
        ...axiosConfig,
        params: {
          key: apiKey,
          location: `${coordinates.lng},${coordinates.lat}`,
        },
      });

      if (geoResponse.data.code !== '200' || !geoResponse.data.location?.[0]) {
        throw new Error('无法获取位置信息');
      }

      locationId = geoResponse.data.location[0].id;
    } else {
      // 使用城市名称获取 locationId
      const cityUrl = `${apiUrl}/city/lookup`;
      const cityResponse = await axios.get(cityUrl, {
        ...axiosConfig,
        params: {
          key: apiKey,
          location: location,
          adm: 'CN',
        },
      });

      if (cityResponse.data.code !== '200' || !cityResponse.data.location?.[0]) {
        throw new Error('无法找到城市信息');
      }

      locationId = cityResponse.data.location[0].id;
    }

    // 获取当前天气
    const currentUrl = `${apiUrl}/weather/now`;
    const currentResponse = await axios.get(currentUrl, {
      ...axiosConfig,
      params: {
        key: apiKey,
        location: locationId,
      },
    });

    if (currentResponse.data.code !== '200') {
      throw new Error(`和风天气 API 错误: ${currentResponse.data.code}`);
    }

    const now = currentResponse.data.now;

    // 获取天气预报
    const forecastUrl = `${apiUrl}/weather/7d`;
    const forecastResponse = await axios.get(forecastUrl, {
      ...axiosConfig,
      params: {
        key: apiKey,
        location: locationId,
      },
    });

    const duration = Date.now() - startTime;
    const forecast = forecastResponse.data.code === '200' && forecastResponse.data.daily
      ? forecastResponse.data.daily.map((day: any) => ({
          date: day.fxDate,
          temperature: Math.round((parseInt(day.tempMax, 10) + parseInt(day.tempMin, 10)) / 2),
          condition: day.textDay,
        }))
      : [];

    return {
      name: `和风天气 - ${location}`,
      success: true,
      data: {
        temperature: parseInt(now.temp, 10),
        condition: now.text,
        humidity: parseInt(now.humidity, 10),
        windSpeed: parseFloat(now.windSpeed),
        forecast,
      },
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: `和风天气 - ${location}`,
      success: false,
      error: error.response?.data?.message || error.message || String(error),
      duration,
    };
  }
}

async function runTests() {
  console.log('🌤️  开始测试天气 API...\n');

  const results: TestResult[] = [];

  // 检查环境变量
  console.log('📋 检查环境变量配置：');
  const weatherApiKey = process.env.WEATHER_API_KEY;
  const qweatherApiKey = process.env.QWEATHER_API_KEY;
  const weatherApiUrl = process.env.WEATHER_API_URL || 'https://api.weatherapi.com/v1';
  const qweatherApiUrl = process.env.QWEATHER_API_URL || 'https://devapi.qweather.com/v7';

  console.log(`  WEATHER_API_KEY: ${weatherApiKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  WEATHER_API_URL: ${weatherApiUrl}`);
  console.log(`  QWEATHER_API_KEY: ${qweatherApiKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  QWEATHER_API_URL: ${qweatherApiUrl}\n`);

  // 测试 1: WeatherAPI - 使用城市名（纽约）
  console.log('🧪 测试 1: WeatherAPI - 使用城市名（纽约）');
  const result1 = await testWeatherAPI('New York');
  results.push(result1);
  if (result1.success) {
    console.log(`  ✅ 成功 (${result1.duration}ms)`);
    console.log(`  温度: ${result1.data?.temperature}°C`);
    console.log(`  天气: ${result1.data?.condition}`);
    console.log(`  湿度: ${result1.data?.humidity}%`);
    console.log(`  风速: ${result1.data?.windSpeed} km/h`);
    if (result1.data?.forecast?.length > 0) {
      console.log(`  预报: ${result1.data.forecast.length} 天`);
    }
  } else {
    console.log(`  ❌ 失败: ${result1.error}`);
  }
  console.log('');

  // 测试 2: WeatherAPI - 使用坐标（东京）
  console.log('🧪 测试 2: WeatherAPI - 使用坐标（东京）');
  const result2 = await testWeatherAPI('Tokyo', { lat: 35.6762, lng: 139.6503 });
  results.push(result2);
  if (result2.success) {
    console.log(`  ✅ 成功 (${result2.duration}ms)`);
    console.log(`  温度: ${result2.data?.temperature}°C`);
    console.log(`  天气: ${result2.data?.condition}`);
  } else {
    console.log(`  ❌ 失败: ${result2.error}`);
  }
  console.log('');

  // 测试 3: 和风天气 - 中国城市（北京）
  console.log('🧪 测试 3: 和风天气 - 中国城市（北京）');
  const result3 = await testQWeather('北京');
  results.push(result3);
  if (result3.success) {
    console.log(`  ✅ 成功 (${result3.duration}ms)`);
    console.log(`  温度: ${result3.data?.temperature}°C`);
    console.log(`  天气: ${result3.data?.condition}`);
    console.log(`  湿度: ${result3.data?.humidity}%`);
    console.log(`  风速: ${result3.data?.windSpeed} km/h`);
    if (result3.data?.forecast?.length > 0) {
      console.log(`  预报: ${result3.data.forecast.length} 天`);
    }
  } else {
    console.log(`  ❌ 失败: ${result3.error}`);
  }
  console.log('');

  // 测试 4: 和风天气 - 使用坐标（上海）
  console.log('🧪 测试 4: 和风天气 - 使用坐标（上海）');
  const result4 = await testQWeather('上海', { lat: 31.2304, lng: 121.4737 });
  results.push(result4);
  if (result4.success) {
    console.log(`  ✅ 成功 (${result4.duration}ms)`);
    console.log(`  温度: ${result4.data?.temperature}°C`);
    console.log(`  天气: ${result4.data?.condition}`);
  } else {
    console.log(`  ❌ 失败: ${result4.error}`);
  }
  console.log('');

  // 测试总结
  console.log('📊 测试总结：');
  console.log('='.repeat(60));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const avgDuration = results
    .filter((r) => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0) / results.filter((r) => r.duration).length;

  console.log(`  总测试数: ${results.length}`);
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${failCount}`);
  if (avgDuration && !isNaN(avgDuration)) {
    console.log(`  ⏱️  平均响应时间: ${Math.round(avgDuration)}ms`);
  }
  console.log('');

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`  ${icon} ${result.name}${duration}`);
    if (!result.success && result.error) {
      console.log(`     错误: ${result.error}`);
    }
  });

  console.log('\n💡 提示：');
  console.log('  - 要测试行程天气接口，需要提供 journeyId');
  console.log('  - 行程天气接口路径: GET /api/v1/journeys/:journeyId/weather');
  console.log('  - 目的地天气接口路径: GET /api/v1/destinations/:id/weather');
  console.log('  - 实时天气会调用天气 API + Google 搜索 + LLM 生成');
  console.log('  - 历史气候直接使用 LLM 生成（不调用天气 API）\n');

  process.exit(failCount > 0 ? 1 : 0);
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
