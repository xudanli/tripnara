# 外部搜索 API

提供对 Eventbrite 活动与 Travel Advisor 目的地的代理查询，统一由后端向第三方接口发起请求，并做结果缓存与错误包装。所有接口均需用户已登录（依赖 `app_session` cookie）。

## 环境变量

```env
# Eventbrite
EVENTBRITE_API_TOKEN=your-eventbrite-token
EVENTBRITE_BASE_URL=https://www.eventbriteapi.com

# RapidAPI - Travel Advisor
TRAVEL_ADVISOR_API_KEY=your-rapidapi-key
TRAVEL_ADVISOR_API_HOST=travel-advisor.p.rapidapi.com
TRAVEL_ADVISOR_BASE_URL=https://travel-advisor.p.rapidapi.com
```

为避免密钥暴露，请仅在后端 `.env` 中配置，前端全部通过本文档的代理接口获取数据。

---

## 1. 搜索 Eventbrite 活动

- **接口**：`GET /api/external/events`
- **认证**：需要登录（JwtAuthGuard）
- **查询参数**：

| 参数名   | 必填 | 说明        | 示例 |
|----------|------|-------------|------|
| location | 是   | 活动地点关键词 | `深圳` |

**请求示例**

```bash
curl -G "http://localhost:3000/api/external/events" \
  --data-urlencode "location=深圳" \
  --cookie "app_session=<浏览器 Cookie>"
```

**响应示例**

```json
{
  "data": {
    "events": [
      {
        "name": { "text": "深圳周末市集", "html": "..." },
        "url": "https://www.eventbrite.com/e/123",
        "start": { "local": "2025-11-20T18:00:00" },
        "venue": { "address": { "localized_address_display": "南山区..." } }
      }
    ],
    "pagination": { "...": "..." }
  }
}
```

**错误返回**

- `400 EVENTBRITE_TOKEN_MISSING`：后台未配置 Eventbrite Token。
- `502 EVENTBRITE_SERVICE_UNAVAILABLE`：Eventbrite 返回 4xx/5xx（含 404/429）。

---

## 2. 搜索 Travel Advisor 目的地

- **接口**：`GET /api/external/locations`
- **认证**：需要登录
- **查询参数**：

| 参数名 | 必填 | 说明      | 示例 |
|--------|------|-----------|------|
| query  | 是   | 目的地关键字 | `拉萨` |

**请求示例**

```bash
curl -G "http://localhost:3000/api/external/locations" \
  --data-urlencode "query=拉萨" \
  --cookie "app_session=<浏览器 Cookie>"
```

**响应示例**

```json
{
  "data": {
    "data": [
      {
        "result_type": "geos",
        "result_object": {
          "name": "拉萨",
          "coordinates": { "latitude": 29.65, "longitude": 91.11 }
        }
      }
    ]
  }
}
```

**错误返回**

- `400 TRAVEL_ADVISOR_KEY_MISSING`：未配置 RapidAPI Key。
- `502 TRAVEL_ADVISOR_SERVICE_UNAVAILABLE`：RapidAPI 返回 4xx/429/5xx。

---

## 缓存策略

- 对相同 `location` 或 `query` 的请求，后端缓存 5 分钟。
- 缓存命中不会再向第三方发起请求，可有效避免 429（Too Many Requests）。
- 如需立即获取最新数据，可在 5 分钟后再次发起请求。

---

## 前端对接建议

1. 所有调用需带上 `credentials: 'include'`，以便携带 `app_session` Cookie。
2. 建议在输入框上做防抖/节流，避免用户快速输入导致连续请求。
3. 对错误返回（`message` 字段）做提示，例如：
   - `EVENTBRITE_SERVICE_UNAVAILABLE` → “活动服务暂时不可用，请稍后再试”。
   - `TRAVEL_ADVISOR_SERVICE_UNAVAILABLE` → “目的地搜索稍后再试”。

