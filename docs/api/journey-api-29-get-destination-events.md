# 行程接口文档 - 29. 获取目的地活动信息

## 接口信息

**接口路径：** `GET /api/v1/destinations/:id/events`

**接口描述：** 根据目的地ID获取活动信息（Eventbrite 等）

**认证：** 不需要认证（公开接口）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 目的地ID（UUID） |

---

## 查询参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `startDate` | string | 否 | 开始日期（ISO格式），过滤在此日期之后开始的活动 |
| `endDate` | string | 否 | 结束日期（ISO格式），过滤在此日期之前结束的活动 |
| `category` | string | 否 | 活动类别（如：music, food, etc.） |

---

## 请求示例

### cURL

```bash
# 获取目的地的所有活动
curl -X GET "http://localhost:3000/api/v1/destinations/destination-id-123/events"

# 获取指定日期范围内的活动
curl -X GET "http://localhost:3000/api/v1/destinations/destination-id-123/events?startDate=2025-01-15&endDate=2025-02-15"

# 获取特定类别的活动
curl -X GET "http://localhost:3000/api/v1/destinations/destination-id-123/events?category=music"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "events": [
    {
      "id": "eventbrite-event-123",
      "name": "深圳周末市集",
      "startDate": "2025-01-20T18:00:00.000Z",
      "endDate": "2025-01-20T22:00:00.000Z",
      "url": "https://www.eventbrite.com/e/123",
      "venue": {
        "address": "南山区科技园"
      }
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `events` | array | 活动列表 |
| `events[].id` | string | 活动ID（来自 Eventbrite） |
| `events[].name` | string | 活动名称 |
| `events[].startDate` | string | 开始日期（ISO 8601格式） |
| `events[].endDate` | string | 结束日期（ISO 8601格式，可选） |
| `events[].url` | string | 活动页面URL（可选） |
| `events[].venue` | object | 场地信息（可选） |

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

### 502 Bad Gateway - Eventbrite 服务不可用

```json
{
  "statusCode": 502,
  "message": "EVENTBRITE_SERVICE_UNAVAILABLE",
  "error": "Bad Gateway"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const destinationId = 'destination-id-123';

// 获取所有活动
const response = await fetch(`/api/v1/destinations/${destinationId}/events`);
const result = await response.json();
console.log('活动列表:', result.events);

// 获取指定日期范围内的活动
const dateRangeResponse = await fetch(
  `/api/v1/destinations/${destinationId}/events?startDate=2025-01-15&endDate=2025-02-15`
);
const dateRangeResult = await dateRangeResponse.json();
```

---

## 注意事项

1. **数据来源**：
   - 活动数据来自 Eventbrite API
   - 需要配置 `EVENTBRITE_API_TOKEN` 环境变量

2. **目的地查找**：
   - 接口会根据目的地ID查找目的地信息
   - 使用目的地的名称来搜索 Eventbrite 活动

3. **缓存机制**：
   - 服务内部实现了缓存机制，减少对 Eventbrite API 的调用
   - 缓存时间约为 5 分钟

4. **错误处理**：
   - 如果 Eventbrite Token 未配置，会返回错误
   - 如果 Eventbrite 服务不可用，会返回 502 错误

5. **用途**：
   - 在行程详情页显示目的地的活动信息
   - 帮助用户发现目的地的精彩活动

