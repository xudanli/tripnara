# 旅行攻略 API

面向前端提供的旅行攻略查询接口，支持 TripAdvisor 单平台搜索和多平台聚合搜索。接口默认需要登录（依赖 `app_session` Cookie 或 Bearer Token）。

## 1. TripAdvisor 单平台搜索

### 路径

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
      "title": "杭州自由行完全指南：从浅草寺到涩谷",
      "excerpt": "探索杭州的必看路线、打卡美食与夜生活推荐…",
      "url": "https://www.tripadvisor.com/...",
      "source": "TripAdvisor",
      "publishedAt": "2024-02-20T00:00:00Z",
      "tags": ["杭州", "日本"],
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

### 调用说明

1. 前端直接发起 GET `/api/travel-guides/search?destination=杭州&limit=5` 即可。
2. 后端会自动携带 TripAdvisor API Key/Host 调用第三方，前端无需关心鉴权。
3. 如果需要允许匿名访问，可以去除 `JwtAuthGuard`；默认情况下需要登录。
4. 建议在 UI 端对空数组做降级展示（例如提示"暂无权威攻略，已回退到本地内容"）。

---

## 2. 多平台攻略聚合搜索

### 路径

```
POST /api/travel-guides/platform-search
```

### 功能说明

支持搜索多个平台的旅行攻略，包括：
- 马蜂窝 (mafengwo.cn)
- 携程 (ctrip.com)
- 穷游网 (qyer.com)
- 飞猪 (fliggy.com)
- TripAdvisor (tripadvisor.com)
- Lonely Planet (lonelyplanet.com)
- Rough Guides (roughguides.com)
- Wikitravel (wikitravel.org)

**实现方式**：使用 Google Custom Search API 搜索指定平台的攻略内容。

### 请求参数

**请求体 (JSON)**：

```json
{
  "destination": "中国",
  "platforms": [
    {
      "name": "马蜂窝",
      "domain": "mafengwo.cn",
      "searchUrl": "https://www.mafengwo.cn/search/q.php?q="
    },
    {
      "name": "携程",
      "domain": "ctrip.com",
      "searchUrl": "https://you.ctrip.com/travels/search?query="
    },
    {
      "name": "穷游网",
      "domain": "qyer.com"
    }
  ],
  "limit": 50
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `destination` | string | 是 | 目的地名称，例如 "日本"、"Tokyo" |
| `platforms` | array | 是 | 要搜索的平台列表 |
| `platforms[].name` | string | 是 | 平台名称，例如 "马蜂窝" |
| `platforms[].domain` | string | 是 | 平台域名，例如 "mafengwo.cn" |
| `platforms[].searchUrl` | string | 否 | 搜索URL模板（可选，当前未使用） |
| `limit` | number | 否 | 返回数量上限（1-100），默认 50 |

### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "mafengwo_1234567890_0",
      "title": "日本关西7日深度游攻略",
      "excerpt": "从京都到奈良，完整攻略包含交通、住宿、美食推荐...",
      "url": "https://www.mafengwo.cn/i/12345.html",
      "source": "马蜂窝",
      "publishedAt": "2024-01-15",
      "tags": ["日本", "马蜂窝"],
      "imageUrl": "https://images.mafengwo.net/...",
      "author": null,
      "readTime": 5
    },
    {
      "id": "ctrip_1234567890_1",
      "title": "日本自由行完全指南",
      "excerpt": "携程旅行专家为您推荐日本最值得去的景点...",
      "url": "https://you.ctrip.com/travels/japan100042.html",
      "source": "携程",
      "publishedAt": null,
      "tags": ["日本", "携程"],
      "imageUrl": null,
      "author": null,
      "readTime": 3
    }
  ],
  "message": null,
  "error": null
}
```

### 错误响应

如果 Google Custom Search API 未配置：

```json
{
  "success": true,
  "data": [],
  "message": "Google Custom Search API 未配置，无法进行多平台搜索",
  "error": "GOOGLE_API_NOT_CONFIGURED"
}
```

### 调用示例

#### cURL

```bash
curl -X POST "http://localhost:3000/api/travel-guides/platform-search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "日本",
    "platforms": [
      {"name": "马蜂窝", "domain": "mafengwo.cn"},
      {"name": "携程", "domain": "ctrip.com"},
      {"name": "穷游网", "domain": "qyer.com"}
    ],
    "limit": 20
  }'
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('/api/travel-guides/platform-search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destination: '日本',
    platforms: [
      { name: '马蜂窝', domain: 'mafengwo.cn' },
      { name: '携程', domain: 'ctrip.com' },
      { name: '穷游网', domain: 'qyer.com' },
    ],
    limit: 20,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('搜索结果:', result.data);
}
```

### 功能特性

1. **并行搜索**：所有平台并行搜索，提高响应速度
2. **自动去重**：基于 URL 自动去重，避免重复结果
3. **智能排序**：按相关性排序（标题包含目的地、包含"攻略"关键词等）
4. **缓存机制**：搜索结果缓存 5 分钟，相同查询直接返回缓存
5. **错误容错**：单个平台搜索失败不影响其他平台，返回空数组继续处理

### 环境变量配置

需要在 `.env` 文件中配置：

```bash
# Google Custom Search API 配置
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_search_engine_id

# 或者使用 Guides 模块的配置
GUIDES_GOOGLE_API_KEY=your_google_api_key
GUIDES_GOOGLE_CX=your_search_engine_id
```

### 注意事项

1. **API 配额**：Google Custom Search API 有每日免费配额限制（100 次/天），超出后需要付费
2. **搜索质量**：搜索结果质量取决于 Google Custom Search 的索引情况
3. **平台限制**：某些平台可能限制 Google 索引，导致搜索结果较少
4. **缓存策略**：相同目的地和平台的查询会使用缓存，缓存时长为 5 分钟
5. **认证要求**：接口需要 JWT Token 认证（可通过 `JwtAuthGuard` 配置）

---

## 通用说明

- 所有接口默认需要登录认证
- 如果需要允许匿名访问，可以去除 `JwtAuthGuard`
- 建议在 UI 端对空数组做降级展示

