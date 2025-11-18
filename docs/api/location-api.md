# 位置信息生成 API 文档

## 概述

位置信息生成接口用于获取活动的详细位置信息，包括地址、交通、开放时间、门票价格等。支持单个和批量生成。

**基础路径**: `/api/location` (注意：应用已设置全局前缀 `api`，控制器路径为 `location`)

**认证**: 需要 JWT Bearer Token

**缓存**: 位置信息会缓存 24 小时，相同活动+目的地+类型的请求会直接返回缓存结果

---

## 1. 生成单个活动位置信息

### 接口信息

- **URL**: `POST /api/location/generate`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateLocationRequest {
  activityName: string;       // 活动名称，如 "铁力士峰云端漫步"
  destination: string;         // 目的地，如 "瑞士琉森"
  activityType: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  coordinates: {
    lat: number;              // 纬度 (-90 到 90)
    lng: number;              // 经度 (-180 到 180)
    region?: string;          // 区域（可选），如 "市中心区域"
  };
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `activityName` | string | 是 | 活动名称 | `"铁力士峰云端漫步"` |
| `destination` | string | 是 | 目的地 | `"瑞士琉森"` |
| `activityType` | string | 是 | 活动类型 | `"attraction"` |
| `coordinates.lat` | number | 是 | 纬度 (-90 到 90) | `46.7704` |
| `coordinates.lng` | number | 是 | 经度 (-180 到 180) | `8.4050` |
| `coordinates.region` | string | 否 | 区域描述 | `"市中心区域"` |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateLocationResponse {
  success: boolean;
  data: LocationInfo;
}

interface LocationInfo {
  chineseName: string;        // 中文名称
  localName: string;          // 当地语言名称
  chineseAddress: string;      // 中文地址
  localAddress: string;       // 当地语言地址
  transportInfo: string;       // 详细交通信息
  openingHours: string;       // 开放时间
  ticketPrice: string;         // 门票价格（详细说明）
  visitTips: string;          // 游览建议
  nearbyAttractions?: string; // 周边推荐（可选）
  contactInfo?: string;        // 联系方式（可选）
  category: string;            // 景点类型
  rating: number;              // 评分 (1-5)
  visitDuration: string;      // 建议游览时长
  bestTimeToVisit: string;     // 最佳游览时间
  accessibility?: string;      // 无障碍设施信息（可选）
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "chineseName": "铁力士峰云端漫步",
    "localName": "Titlis Cliff Walk",
    "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "transportInfo": "从琉森乘火车约45分钟至Engelberg站，然后乘坐缆车：Engelberg站→Trübsee站→Stand站→Titlis峰站，约30分钟。公共交通：Engelberg, Titlisbahn",
    "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30。恶劣天气可能临时关闭",
    "ticketPrice": "Cliff Walk约CHF 15（约¥120）。往返缆车票：成人CHF 89，儿童（6-15岁）CHF 44.5，家庭套餐（2成人+1儿童）CHF 178。持Swiss Travel Pass可享受50%折扣",
    "visitTips": "最佳游览时间：上午10点前避开人群，晴朗天气最佳。注意事项：海拔3020米需注意高原反应，穿防滑登山鞋和保暖衣物，恐高者谨慎。建议游览时长：2-3小时",
    "nearbyAttractions": "冰川公园、Ice Flyer缆车、旋转缆车体验",
    "contactInfo": "请查询官网或当地信息中心",
    "category": "景点",
    "rating": 4.8,
    "visitDuration": "2-3小时",
    "bestTimeToVisit": "上午10点前，晴朗天气",
    "accessibility": "请确认无障碍设施"
  }
}
```

#### 错误响应

##### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "activityName must be a string",
    "coordinates.lat must be a number",
    "coordinates.lat must not be less than -90"
  ],
  "error": "Bad Request"
}
```

##### 401 Unauthorized - 未认证

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

##### 500 Internal Server Error - 生成失败（会使用默认信息）

```json
{
  "statusCode": 500,
  "message": "位置信息生成失败，已使用默认信息"
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/location/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activityName": "铁力士峰云端漫步",
    "destination": "瑞士琉森",
    "activityType": "attraction",
    "coordinates": {
      "lat": 46.7704,
      "lng": 8.4050,
      "region": "市中心区域"
    }
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3000/api/location/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    activityName: '铁力士峰云端漫步',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: {
      lat: 46.7704,
      lng: 8.4050,
      region: '市中心区域'
    }
  })
});

const data = await response.json();
if (data.success) {
  console.log('位置信息:', data.data);
}
```

---

## 2. 批量生成活动位置信息

### 接口信息

- **URL**: `POST /api/location/generate-batch`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateLocationBatchRequest {
  activities: BatchActivity[];
}

interface BatchActivity {
  activityName: string;
  destination: string;
  activityType: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  coordinates: {
    lat: number;
    lng: number;
    region?: string;
  };
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `activities` | BatchActivity[] | 是 | 活动列表，最多建议 10 个 |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateLocationBatchResponse {
  success: boolean;
  data: BatchLocationResult[];
}

interface BatchLocationResult {
  activityName: string;       // 活动名称
  locationInfo: LocationInfo;  // 位置信息（同单个接口）
}
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "activityName": "铁力士峰云端漫步",
      "locationInfo": {
        "chineseName": "铁力士峰云端漫步",
        "localName": "Titlis Cliff Walk",
        "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
        "openingHours": "全年开放，夏季8:30-17:30...",
        "ticketPrice": "Cliff Walk约CHF 15...",
        "visitTips": "最佳游览时间：上午10点前...",
        "category": "景点",
        "rating": 4.8,
        "visitDuration": "2-3小时",
        "bestTimeToVisit": "上午10点前，晴朗天气"
      }
    },
    {
      "activityName": "琉森湖游船",
      "locationInfo": {
        "chineseName": "琉森湖游船",
        "localName": "Lake Lucerne Cruise",
        "chineseAddress": "Luzern Bahnhofquai, 6002 Luzern, Switzerland",
        "localAddress": "Luzern Bahnhofquai, 6002 Luzern, Switzerland",
        "transportInfo": "位于琉森火车站附近，步行即可到达...",
        "openingHours": "全年运营，夏季班次更密集...",
        "ticketPrice": "成人票 CHF 45，儿童票 CHF 22.5...",
        "visitTips": "建议选择下午时段，光线柔和适合拍照...",
        "category": "景点",
        "rating": 4.6,
        "visitDuration": "1-2小时",
        "bestTimeToVisit": "下午时段"
      }
    }
  ]
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/location/generate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activities": [
      {
        "activityName": "铁力士峰云端漫步",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 46.7704,
          "lng": 8.4050
        }
      },
      {
        "activityName": "琉森湖游船",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 47.0502,
          "lng": 8.3093
        }
      }
    ]
  }'
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface BatchActivity {
  activityName: string;
  destination: string;
  activityType: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
  coordinates: {
    lat: number;
    lng: number;
    region?: string;
  };
}

interface LocationInfo {
  chineseName: string;
  localName: string;
  chineseAddress: string;
  localAddress: string;
  transportInfo: string;
  openingHours: string;
  ticketPrice: string;
  visitTips: string;
  nearbyAttractions?: string;
  contactInfo?: string;
  category: string;
  rating: number;
  visitDuration: string;
  bestTimeToVisit: string;
  accessibility?: string;
}

interface BatchLocationResult {
  activityName: string;
  locationInfo: LocationInfo;
}

async function generateLocationBatch(
  activities: BatchActivity[],
  token: string
): Promise<BatchLocationResult[]> {
  const response = await axios.post<{
    success: boolean;
    data: BatchLocationResult[];
  }>(
    'http://localhost:3000/api/location/generate-batch',
    { activities },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data.data;
}

// 使用示例
const results = await generateLocationBatch([
  {
    activityName: '铁力士峰云端漫步',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: { lat: 46.7704, lng: 8.4050 }
  },
  {
    activityName: '琉森湖游船',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: { lat: 47.0502, lng: 8.3093 }
  }
], 'your-jwt-token');
```

### 活动类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `attraction` | 景点/观光 | 博物馆、公园、古迹、地标 |
| `meal` | 餐饮 | 餐厅、咖啡厅、美食体验、小吃街 |
| `hotel` | 住宿 | 酒店、民宿、度假村、旅馆 |
| `shopping` | 购物 | 商场、市场、商店、商业街 |
| `transport` | 交通 | 车站、机场、港口、地铁站 |
| `ocean` | 海洋活动 | 浮潜、潜水、观鲸、海滩活动 |

### 缓存机制

- **缓存键**: `${activityName}-${destination}-${activityType}` (不区分大小写)
- **缓存时长**: 24 小时
- **缓存位置**: 服务器内存（服务重启后失效）
- **缓存命中**: 相同参数的请求会直接返回缓存结果，响应时间 < 10ms

### 默认信息回退

如果 AI 生成失败，系统会自动使用默认模板生成基础信息：

- 根据 `activityType` 使用对应的默认模板
- 确保始终返回有效的位置信息
- 默认信息包含基本的分类、开放时间、交通建议等

### 注意事项

1. **认证要求**: 所有请求必须携带有效的 JWT Token
2. **生成时间**: 
   - 单个请求: 2-5 秒（首次）或 < 10ms（缓存命中）
   - 批量请求: 每个活动 2-5 秒，建议前端显示进度
3. **批量限制**: 建议每次批量请求不超过 10 个活动
4. **坐标精度**: 坐标用于 AI 生成更准确的位置信息
5. **语言支持**: 根据目的地自动识别主要语言（如瑞士→德语+法语）

### 错误处理建议

```typescript
try {
  const response = await generateLocation(request, token);
  if (response.success) {
    // 处理成功响应
    displayLocationInfo(response.data);
  }
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 400:
        console.error('参数错误:', error.response.data.message);
        break;
      case 401:
        console.error('未认证，请重新登录');
        redirectToLogin();
        break;
      case 500:
        // 即使 AI 失败，也会返回默认信息
        console.warn('使用默认位置信息');
        break;
    }
  }
}
```

### 性能优化建议

1. **批量请求**: 多个活动时使用批量接口，减少请求次数
2. **缓存利用**: 相同活动的位置信息会被缓存，无需重复请求
3. **预加载**: 在用户浏览行程时，提前加载位置信息
4. **错误重试**: 网络错误时提供重试机制

---

## 相关接口

- [行程生成 API](./itinerary-api.md) - 生成包含位置坐标的行程
- [旅行摘要生成 API](./travel-summary-api.md) - 生成行程摘要

