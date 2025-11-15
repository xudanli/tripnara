# 旅行攻略 API（TripAdvisor）

面向前端提供的 TripAdvisor 攻略查询接口，通过后端代理访问 TripAdvisor API，并返回统一的攻略数据。接口默认需要登录（依赖 `app_session` Cookie 或 Bearer Token）。

## 路径

```
GET /api/travel-guides/search
```

## 请求参数

| 参数           | 类型    | 必填 | 默认值 | 说明                              |
|----------------|---------|------|--------|-----------------------------------|
| `destination`  | string  | 是   | —      | 目的地，例如 `日本`、`Tokyo`       |
| `limit`        | number  | 否   | 50     | 返回条目数上限（1–100）           |
| `language`     | string  | 否   | zh-CN  | 希望返回的语言代码（如 `zh-CN`）  |

## 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "123456",
      "title": "东京自由行完全指南：从浅草寺到涩谷",
      "excerpt": "探索东京的必看路线、打卡美食与夜生活推荐…",
      "url": "https://www.tripadvisor.com/...",
      "source": "TripAdvisor",
      "publishedAt": "2024-02-20T00:00:00Z",
      "tags": ["东京", "日本"],
      "imageUrl": "https://cdn.tripadvisor.com/...",
      "author": "Tripadvisor Editorial",
      "readTime": 8
    }
  ],
  "message": null,
  "error": null
}
```

如果 TripAdvisor API 不可用或配置缺失，后端会降级返回：

```json
{
  "success": true,
  "data": [],
  "message": "TripAdvisor 数据暂不可用",
  "error": "TRIPADVISOR_SERVICE_ERROR"
}
```

## 调用说明

1. 前端直接发起 GET `/api/travel-guides/search?destination=东京&limit=5` 即可。
2. 后端会自动携带 TripAdvisor API Key/Host 调用第三方，前端无需关心鉴权。
3. 如果需要允许匿名访问，可以去除 `JwtAuthGuard`；默认情况下需要登录。
4. 建议在 UI 端对空数组做降级展示（例如提示“暂无权威攻略，已回退到本地内容”）。

