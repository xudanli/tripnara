# 行程接口文档 - 31. 获取目的地天气信息

## 接口信息

**接口路径：** `GET /api/v1/destinations/:id/weather`

**接口描述：** 根据目的地ID获取天气信息（可选，需要配置天气 API）

**认证：** 不需要认证（公开接口）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 目的地ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/destinations/destination-id-123/weather"
```

---

## 响应数据

### 成功响应（200 OK）- 已配置天气 API

```json
{
  "temperature": 22,
  "condition": "晴天",
  "humidity": 60,
  "windSpeed": 10,
  "forecast": [
    {
      "date": "2025-01-15",
      "temperature": 22,
      "condition": "晴天"
    },
    {
      "date": "2025-01-16",
      "temperature": 20,
      "condition": "多云"
    }
  ]
}
```

### 成功响应（200 OK）- 未配置天气 API（占位符数据）

```json
{
  "temperature": 20,
  "condition": "晴天",
  "humidity": 60,
  "windSpeed": 10,
  "forecast": [
    {
      "date": "2025-01-15",
      "temperature": 20,
      "condition": "晴天"
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `temperature` | number | 当前温度（摄氏度） |
| `condition` | string | 天气状况（如：晴天、多云、雨天等） |
| `humidity` | number | 湿度（百分比，可选） |
| `windSpeed` | number | 风速（可选） |
| `forecast` | array | 天气预报（可选） |
| `forecast[].date` | string | 日期（YYYY-MM-DD格式） |
| `forecast[].temperature` | number | 温度 |
| `forecast[].condition` | string | 天气状况 |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "目的地不存在: destination-id-123",
  "error": "Not Found"
}
```

### 501 Not Implemented - 天气 API 未配置

```json
{
  "statusCode": 501,
  "message": "天气 API 功能待实现，请配置 WEATHER_API_KEY 和 WEATHER_API_URL 环境变量",
  "error": "Not Implemented"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const destinationId = 'destination-id-123';

const response = await fetch(`/api/v1/destinations/${destinationId}/weather`);
const weather = await response.json();

console.log('当前温度:', weather.temperature);
console.log('天气状况:', weather.condition);
if (weather.forecast) {
  console.log('天气预报:', weather.forecast);
}
```

---

## 注意事项

1. **当前状态**：
   - 接口已实现框架，但需要配置第三方天气 API
   - 如果未配置天气 API，会返回占位符数据
   - 配置天气 API 后，需要实现实际的 API 调用逻辑

2. **环境变量配置**：
   - `WEATHER_API_KEY`：天气 API 密钥
   - `WEATHER_API_URL`：天气 API 基础 URL

3. **数据来源**：
   - 接口会根据目的地ID查找目的地信息
   - 如果目的地有坐标信息，会使用坐标查询天气
   - 否则使用目的地名称查询天气

4. **占位符数据**：
   - 当天气 API 未配置时，返回默认的占位符数据
   - 占位符数据仅用于测试，实际使用时需要配置真实的天气 API

5. **实现说明**：
   - 当用户提供天气 API 后，需要在 `WeatherService.getWeatherByDestinationId` 方法中实现实际的 API 调用
   - 可以参考 `FestivalService` 或 `TransportService` 的实现方式

