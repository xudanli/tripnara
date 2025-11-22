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

## 3. 获取 TripAdvisor 景点详情

- **接口**：`GET /api/external/attractions/:id`
- **认证**：需要登录（JwtAuthGuard）
- **用途**：查询门票价格区间、票务信息、评分等信息，用于"费用详情"卡片
- **后端调用**：`GET https://travel-advisor.p.rapidapi.com/attractions/get-details`

### 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | TripAdvisor 景点ID（location_id） | `123456` |

### 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `lang` | string | 否 | 语言代码（默认 `zh-CN`） | `zh-CN` |

**请求示例**

```bash
curl -X GET "http://localhost:3000/api/external/attractions/123456?lang=zh-CN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应格式**

```json
{
  "success": true,
  "data": {
    "id": "123456",
    "name": "铁力士峰云端漫步",
    "address": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "coordinates": {
      "lat": 46.7704,
      "lng": 8.4050
    },
    "rating": {
      "rating": 4.5,
      "reviewCount": 1234,
      "ratingDistribution": {
        "excellent": 500,
        "very_good": 400,
        "average": 200,
        "poor": 100,
        "terrible": 34
      }
    },
    "ticketInfo": {
      "requiresTicket": true,
      "priceRange": {
        "min": 50,
        "max": 200,
        "currency": "CNY",
        "description": "成人票 50-200 CNY"
      },
      "purchaseMethod": "在线购票、现场购票",
      "purchaseUrl": "https://tripadvisor.com/..."
    },
    "openingHours": "8:30-17:30",
    "phone": "+41 41 639 50 50",
    "website": "https://titlis.ch",
    "description": "欧洲最高的悬索桥",
    "category": "景点 - 自然景观",
    "tripadvisorUrl": "https://tripadvisor.com/Attraction_Review..."
  }
}
```

### 响应字段说明

| 字段路径 | 类型 | 说明 |
|---------|------|------|
| `data.id` | string | 景点ID |
| `data.name` | string | 景点名称 |
| `data.address` | string | 地址（可选） |
| `data.coordinates.lat` | number | 纬度（可选） |
| `data.coordinates.lng` | number | 经度（可选） |
| `data.rating.rating` | number | 评分（1-5） |
| `data.rating.reviewCount` | number | 评论总数 |
| `data.rating.ratingDistribution` | object | 评分分布（可选） |
| `data.ticketInfo.requiresTicket` | boolean | 是否需要门票（可选） |
| `data.ticketInfo.priceRange.min` | number | 最低价格（可选） |
| `data.ticketInfo.priceRange.max` | number | 最高价格（可选） |
| `data.ticketInfo.priceRange.currency` | string | 货币代码（可选） |
| `data.ticketInfo.priceRange.description` | string | 价格描述（可选） |
| `data.ticketInfo.purchaseMethod` | string | 购票方式（可选） |
| `data.ticketInfo.purchaseUrl` | string | 购票链接（可选） |
| `data.openingHours` | string | 开放时间（可选） |
| `data.phone` | string | 电话（可选） |
| `data.website` | string | 网站（可选） |
| `data.description` | string | 描述（可选） |
| `data.category` | string | 分类（可选） |
| `data.tripadvisorUrl` | string | TripAdvisor 链接（可选） |

**错误返回**

- `400 TRAVEL_ADVISOR_KEY_MISSING`：未配置 RapidAPI Key。
- `404 ATTRACTION_NOT_FOUND`：景点不存在。
- `429 TRAVEL_ADVISOR_RATE_LIMIT_EXCEEDED`：请求过快。
- `401/403 TRAVEL_ADVISOR_AUTH_FAILED`：认证失败。
- `502 TRAVEL_ADVISOR_SERVICE_UNAVAILABLE`：服务不可用。

### 前端使用示例

#### JavaScript (Fetch)

```javascript
async function getAttractionDetails(attractionId, lang = 'zh-CN') {
  const response = await fetch(
    `http://localhost:3000/api/external/attractions/${attractionId}?lang=${lang}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '获取景点详情失败');
  }

  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  throw new Error('获取景点详情失败');
}

// 使用示例
try {
  const details = await getAttractionDetails('123456', 'zh-CN');
  console.log('景点名称:', details.name);
  console.log('评分:', details.rating.rating);
  console.log('门票价格:', details.ticketInfo?.priceRange);
} catch (error) {
  console.error('错误:', error.message);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface AttractionDetails {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating: {
    rating: number;
    reviewCount: number;
    ratingDistribution?: Record<string, number>;
  };
  ticketInfo?: {
    requiresTicket?: boolean;
    priceRange?: {
      min?: number;
      max?: number;
      currency?: string;
      description?: string;
    };
    purchaseMethod?: string;
    purchaseUrl?: string;
  };
  openingHours?: string;
  phone?: string;
  website?: string;
  description?: string;
  category?: string;
  tripadvisorUrl?: string;
}

interface AttractionDetailsResponse {
  success: boolean;
  data: AttractionDetails;
}

async function getAttractionDetails(
  attractionId: string,
  lang: string = 'zh-CN',
  token: string
): Promise<AttractionDetails> {
  const response = await axios.get<AttractionDetailsResponse>(
    `http://localhost:3000/api/external/attractions/${attractionId}`,
    {
      params: { lang },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      withCredentials: true,
    }
  );

  if (response.data.success) {
    return response.data.data;
  }
  throw new Error('获取景点详情失败');
}

// 使用示例
const details = await getAttractionDetails('123456', 'zh-CN', 'your-jwt-token');
console.log('门票价格区间:', details.ticketInfo?.priceRange);
console.log('评分:', details.rating.rating, '（', details.rating.reviewCount, '条评论）');
```

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

