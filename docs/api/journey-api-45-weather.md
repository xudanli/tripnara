# 行程接口文档 - 45. 获取行程天气信息

## 接口信息

**接口路径：** `GET /api/v1/journeys/:journeyId/weather`

**接口描述：** 根据行程时间自动判断：未来10天内返回实时天气预报和安全警示（使用 Google 搜索），远期返回历史平均气候和常年安全建议。

**认证：** 需要 JWT 认证

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

## 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `language` | string | 否 | 语言代码，用于生成对应语言的天气信息，默认：`zh-CN` | `zh-CN`、`en-US`、`en` |

---

## 请求示例

### cURL

```bash
curl -X GET "https://api.example.com/api/v1/journeys/550e8400-e29b-41d4-a716-446655440000/weather?language=zh-CN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript (fetch)

```javascript
const response = await fetch('/api/v1/journeys/550e8400-e29b-41d4-a716-446655440000/weather?language=zh-CN', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();
console.log('Weather Info:', result.weatherInfo);
```

---

## 响应数据

### 成功响应（200 OK）- 实时天气（未来10天内）

```json
{
  "success": true,
  "journeyId": "550e8400-e29b-41d4-a716-446655440000",
  "destination": "瑞士琉森",
  "startDate": "2025-12-01",
  "endDate": "2025-12-08",
  "weatherInfo": {
    "currentWeather": "当前温度：15°C，天气：多云，湿度：65%，风速：10公里/小时",
    "forecast": "未来7天天气预报：第1天（12月1日）15°C多云，第2天（12月2日）18°C晴天，第3天（12月3日）12°C小雨...",
    "safetyAlerts": "注意：近期可能有强风，建议避免户外活动；部分地区可能有降雪，注意交通安全",
    "packingSuggestions": "建议携带：轻便外套、雨具、防晒霜、保暖衣物",
    "travelTips": "建议选择天气晴朗的日子进行户外活动，注意保暖，山区天气变化快",
    "type": "realtime"
  },
  "fromCache": false,
  "generatedAt": "2025-12-01T12:00:00.000Z"
}
```

### 成功响应（200 OK）- 历史气候（远期）

```json
{
  "success": true,
  "journeyId": "550e8400-e29b-41d4-a716-446655440000",
  "destination": "瑞士琉森",
  "startDate": "2026-06-01",
  "endDate": "2026-06-08",
  "weatherInfo": {
    "currentWeather": "15-25°C",
    "forecast": "6月份是瑞士的夏季，天气温暖，平均温度在15-25°C之间，白天阳光充足，夜晚凉爽",
    "safetyAlerts": "该季节气候温和，无特殊安全警示",
    "packingSuggestions": "建议携带：轻便外套、长裤、雨具、防晒用品",
    "travelTips": "6月是游览瑞士的好时节，天气宜人，适合户外活动",
    "averageTemperature": "15-25°C",
    "rainfall": "平均降雨量：80mm，降雨天数：12天",
    "clothingSuggestions": "建议穿着轻便外套和长裤，携带雨具，山区早晚温差大",
    "safetyAdvice": "该季节气候温和，注意防晒和补水，山区注意保暖",
    "type": "historical"
  },
  "fromCache": false,
  "generatedAt": "2025-12-01T12:00:00.000Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `journeyId` | string | 行程ID |
| `destination` | string | 目的地名称 |
| `startDate` | string | 行程开始日期（YYYY-MM-DD） |
| `endDate` | string | 行程结束日期（YYYY-MM-DD） |
| `weatherInfo` | object | 天气信息对象 |
| `weatherInfo.currentWeather` | string | 当前天气概况（实时）或平均温度范围（历史） |
| `weatherInfo.forecast` | string | 天气预报（实时）或典型天气状况（历史） |
| `weatherInfo.safetyAlerts` | string | 安全警示和警告 |
| `weatherInfo.packingSuggestions` | string | 打包建议 |
| `weatherInfo.travelTips` | string | 旅行建议 |
| `weatherInfo.type` | string | 信息类型：`realtime`（实时）或 `historical`（历史） |
| `weatherInfo.averageTemperature` | string | 平均温度范围（仅历史气候时提供） |
| `weatherInfo.rainfall` | string | 降雨信息（仅历史气候时提供） |
| `weatherInfo.clothingSuggestions` | string | 穿衣建议（仅历史气候时提供） |
| `weatherInfo.safetyAdvice` | string | 常年安全建议（仅历史气候时提供） |
| `fromCache` | boolean | 是否来自缓存 |
| `generatedAt` | string | 生成时间（ISO 8601格式） |

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found - 行程不存在

```json
{
  "statusCode": 404,
  "message": "行程不存在: 550e8400-e29b-41d4-a716-446655440000"
}
```

### 400 Bad Request - 行程没有天数信息

```json
{
  "statusCode": 400,
  "message": "行程没有天数信息，无法获取天气信息"
}
```

---

## 功能说明

### 自动判断逻辑

接口会根据行程开始日期自动判断使用哪种方式：

1. **实时天气（未来10天内）**：
   - 调用天气 API 获取实时天气数据
   - 使用 Google Custom Search API 搜索实时天气预报和安全警示
   - 搜索天气网站（weather.com, accuweather.com）
   - 搜索安全警示网站（travel.state.gov, gov.uk）
   - 将搜索结果传递给 AI，生成详细的天气信息和安全建议

2. **历史气候（远期）**：
   - 基于历史平均气候数据
   - 提供常年安全建议
   - 使用 AI 生成气候信息和旅行建议

### Google 搜索集成

**实时天气场景下**，接口会使用 Google Custom Search API 搜索：

- **天气信息**：搜索 `{目的地} {开始日期} 天气预报 实时天气`
- **安全警示**：搜索 `{目的地} {开始日期} 安全警示 旅行警告`

**搜索结果来源**：
- 天气网站：weather.com, accuweather.com
- 安全警示网站：travel.state.gov, gov.uk

**配置要求**：
- 需要配置 `GOOGLE_API_KEY` 和 `GOOGLE_CX`（Google Custom Search API）
- 如果 Google 搜索失败，会降级使用天气 API 数据

---

## 使用示例

### 完整示例

```javascript
async function getJourneyWeather(journeyId, language = 'zh-CN') {
  try {
    const response = await fetch(
      `/api/v1/journeys/${journeyId}/weather?language=${language}`,
      {
        headers: {
          'Authorization': `Bearer ${getJwtToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.weatherInfo.type === 'realtime') {
      console.log('实时天气:', result.weatherInfo.currentWeather);
      console.log('天气预报:', result.weatherInfo.forecast);
      console.log('安全警示:', result.weatherInfo.safetyAlerts);
    } else {
      console.log('历史气候:', result.weatherInfo.averageTemperature);
      console.log('典型天气:', result.weatherInfo.forecast);
      console.log('安全建议:', result.weatherInfo.safetyAdvice);
    }
    
    console.log('打包建议:', result.weatherInfo.packingSuggestions);
    console.log('旅行建议:', result.weatherInfo.travelTips);
    
    return result;
  } catch (error) {
    console.error('获取天气信息失败:', error);
    throw error;
  }
}
```

---

## 注意事项

1. **认证要求**：
   - 接口需要 JWT 认证
   - 只能获取自己创建的行程的天气信息

2. **时间判断**：
   - 判断基准：行程开始日期距离今天的天数
   - 未来10天内（包含今天）：使用实时天气
   - 超过10天：使用历史气候

3. **Google 搜索配置**：
   - 需要配置 `GOOGLE_API_KEY` 和 `GOOGLE_CX`
   - 如果未配置或搜索失败，会降级使用天气 API 数据
   - 不会因为 Google 搜索失败而返回错误

4. **天气 API 配置**：
   - 需要配置 `WEATHER_API_KEY`（WeatherAPI）或 `QWEATHER_API_KEY`（和风天气）
   - 如果未配置，实时天气场景下会使用默认数据

5. **语言支持**：
   - 支持 `zh-CN`（中文）、`en-US`（英文）、`en`（英文）
   - 默认使用 `zh-CN`

6. **性能考虑**：
   - Google 搜索可能需要几秒钟时间
   - 建议在前端显示加载状态
   - 结果会实时生成，不缓存（每次调用都会重新生成）

7. **数据准确性**：
   - 实时天气：基于天气 API 和 Google 搜索结果，准确性较高
   - 历史气候：基于历史平均数据，仅供参考

---

## 环境变量配置

```env
# Google Custom Search API（用于搜索实时天气和安全警示）
GOOGLE_API_KEY=your-google-api-key
GOOGLE_CX=your-google-custom-search-engine-id

# 或使用 Guides 模块的配置
GUIDES_GOOGLE_API_KEY=your-google-api-key
GUIDES_GOOGLE_CX=your-google-custom-search-engine-id

# WeatherAPI（全球城市）
WEATHER_API_KEY=your-weather-api-key
WEATHER_API_URL=https://api.weatherapi.com/v1

# 和风天气 QWeather（中国城市）
QWEATHER_API_KEY=your-qweather-api-key
QWEATHER_API_URL=https://devapi.qweather.com/v7
```

---

## 相关接口

- [获取目的地天气信息](./journey-api-31-get-destination-weather.md) - `GET /api/v1/destinations/:id/weather`（公开接口，无需认证）
- [获取行程详情](./journey-api.md#获取行程详情) - `GET /api/v1/journeys/:journeyId`
- [获取安全提示](./journey-api-25-generate-safety-notice.md) - `POST /api/v1/journeys/:journeyId/safety-notice`

