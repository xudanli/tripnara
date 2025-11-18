# 行程生成 API 文档

## 概述

行程生成接口用于根据用户输入的目的地、天数、偏好等信息，通过 AI 生成详细的旅行行程。

**基础路径**: `/api/itinerary` (注意：应用已设置全局前缀 `api`，控制器路径为 `itinerary`)

**认证**: 需要 JWT Bearer Token

---

## 1. 生成旅行行程

### 接口信息

- **URL**: `POST /api/itinerary/generate`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateItineraryRequest {
  destination: string;        // 目的地，如 "瑞士琉森"、"日本东京"
  days: number;               // 旅行天数，范围 1-30
  preferences?: {              // 用户偏好（可选）
    interests?: string[];      // 兴趣列表，如 ["自然风光", "户外活动"]
    budget?: "low" | "medium" | "high";  // 预算等级
    travelStyle?: "relaxed" | "moderate" | "intensive";  // 旅行风格
  };
  startDate: string;          // 旅行开始日期，格式: "YYYY-MM-DD"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 是 | 目的地名称 | `"瑞士琉森"` |
| `days` | number | 是 | 旅行天数，1-30 | `5` |
| `preferences.interests` | string[] | 否 | 用户兴趣列表 | `["自然风光", "户外活动"]` |
| `preferences.budget` | string | 否 | 预算等级 | `"medium"` |
| `preferences.travelStyle` | string | 否 | 旅行风格 | `"relaxed"` |
| `startDate` | string | 是 | 开始日期 (YYYY-MM-DD) | `"2024-06-01"` |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateItineraryResponse {
  success: boolean;           // 是否成功
  data: {
    days: ItineraryDay[];      // 行程天数详情
    totalCost: number;         // 总费用预估
    summary: string;           // 行程摘要
  };
  generatedAt: string;        // 生成时间 (ISO 8601)
}

interface ItineraryDay {
  day: number;                // 第几天
  date: string;               // 日期 (YYYY-MM-DD)
  activities: Activity[];      // 活动列表
}

interface Activity {
  time: string;               // 活动时间，格式: "HH:mm"
  title: string;              // 活动标题（AI生成，生动有趣）
  type: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  duration: number;           // 持续时间（分钟）
  location: {
    lat: number;              // 纬度
    lng: number;              // 经度
  };
  notes: string;              // 详细的游览建议和体验描述
  cost: number;               // 预估费用
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2024-06-01",
        "activities": [
          {
            "time": "09:00",
            "title": "铁力士峰云端漫步",
            "type": "attraction",
            "duration": 120,
            "location": {
              "lat": 46.7704,
              "lng": 8.4050
            },
            "notes": "登上海拔3020米的铁力士峰，体验欧洲最高的悬索桥。建议上午前往避开人群，晴朗天气最佳。注意保暖和防滑。",
            "cost": 400
          },
          {
            "time": "14:00",
            "title": "琉森湖游船",
            "type": "attraction",
            "duration": 90,
            "location": {
              "lat": 47.0502,
              "lng": 8.3093
            },
            "notes": "乘坐游船欣赏琉森湖的湖光山色，远眺皮拉图斯山和瑞吉山。建议选择下午时段，光线柔和适合拍照。",
            "cost": 200
          }
        ]
      },
      {
        "day": 2,
        "date": "2024-06-02",
        "activities": [
          {
            "time": "10:00",
            "title": "卡佩尔桥探秘",
            "type": "attraction",
            "duration": 60,
            "location": {
              "lat": 47.0516,
              "lng": 8.3075
            },
            "notes": "参观琉森最著名的地标，欧洲最古老的木制廊桥。桥内壁画描绘了瑞士历史，值得细细品味。",
            "cost": 0
          }
        ]
      }
    ],
    "totalCost": 8000,
    "summary": "5天琉森文化探索之旅，从铁力士峰的云端漫步到琉森湖的湖光山色，从卡佩尔桥的古老韵味到狮子纪念碑的历史沉淀。行程融合自然与人文，既有登高望远的壮阔体验，也有深入当地文化的精致品味。"
  },
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 错误响应

##### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "destination must be a string",
    "days must be a number",
    "days must not be less than 1",
    "days must not be greater than 30"
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

##### 500 Internal Server Error - 生成失败

```json
{
  "statusCode": 500,
  "message": "行程生成失败: AI service error"
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/itinerary/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "days": 5,
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "startDate": "2024-06-01"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3000/api/itinerary/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    destination: '瑞士琉森',
    days: 5,
    preferences: {
      interests: ['自然风光', '户外活动'],
      budget: 'medium',
      travelStyle: 'relaxed'
    },
    startDate: '2024-06-01'
  })
});

const data = await response.json();
if (data.success) {
  console.log('行程生成成功:', data.data);
} else {
  console.error('生成失败:', data.message);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface GenerateItineraryRequest {
  destination: string;
  days: number;
  preferences?: {
    interests?: string[];
    budget?: 'low' | 'medium' | 'high';
    travelStyle?: 'relaxed' | 'moderate' | 'intensive';
  };
  startDate: string;
}

interface GenerateItineraryResponse {
  success: boolean;
  data: {
    days: Array<{
      day: number;
      date: string;
      activities: Array<{
        time: string;
        title: string;
        type: string;
        duration: number;
        location: { lat: number; lng: number };
        notes: string;
        cost: number;
      }>;
    }>;
    totalCost: number;
    summary: string;
  };
  generatedAt: string;
}

async function generateItinerary(
  request: GenerateItineraryRequest,
  token: string
): Promise<GenerateItineraryResponse> {
  const response = await axios.post<GenerateItineraryResponse>(
    'http://localhost:3000/api/itinerary/generate',
    request,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data;
}

// 使用示例
const result = await generateItinerary({
  destination: '瑞士琉森',
  days: 5,
  preferences: {
    interests: ['自然风光', '户外活动'],
    budget: 'medium',
    travelStyle: 'relaxed'
  },
  startDate: '2024-06-01'
}, 'your-jwt-token');
```

### 活动类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `attraction` | 景点/观光 | 博物馆、公园、古迹 |
| `meal` | 餐饮 | 餐厅、咖啡厅、美食体验 |
| `hotel` | 住宿 | 酒店、民宿、度假村 |
| `shopping` | 购物 | 商场、市场、商店 |
| `transport` | 交通 | 车站、机场、租车 |
| `ocean` | 海洋活动 | 浮潜、潜水、观鲸 |

### 注意事项

1. **认证要求**: 所有请求必须携带有效的 JWT Token
2. **生成时间**: 
   - 1-3 天行程: 通常 10-20 秒
   - 4-7 天行程: 通常 20-40 秒
   - 8+ 天行程: 可能需要 40-60 秒
   - 建议前端显示加载状态和进度提示
3. **超时配置**: 
   - 行程生成超时: 5 分钟（300秒）
   - 可在 `.env` 中自定义设置 `LLM_TIMEOUT_MS=300000`（300秒）
   - 系统会在 5 分钟后判定为超时
4. **用户偏好**: 如果用户已保存偏好，系统会自动合并请求中的偏好
5. **日期格式**: `startDate` 必须为 `YYYY-MM-DD` 格式
6. **天数限制**: `days` 必须在 1-30 之间
7. **活动标题**: AI 会生成生动有趣的标题，避免通用词汇
8. **坐标信息**: 返回的坐标可用于地图展示和位置服务
9. **错误处理**: 
   - 超时错误会提供明确的提示
   - 系统会自动重试（最多 3 次）
   - 失败时会返回友好的错误信息

### 错误处理建议

```typescript
try {
  const response = await generateItinerary(request, token);
  if (response.success) {
    // 处理成功响应
    handleSuccess(response.data);
  }
} catch (error) {
  if (error.response) {
    // 服务器返回错误
    switch (error.response.status) {
      case 400:
        console.error('参数错误:', error.response.data.message);
        break;
      case 401:
        console.error('未认证，请重新登录');
        // 跳转到登录页
        break;
      case 500:
        console.error('服务器错误:', error.response.data.message);
        // 显示友好错误提示
        break;
    }
  } else {
    // 网络错误
    console.error('网络错误:', error.message);
  }
}
```

### 性能优化建议

1. **防抖处理**: 用户输入时使用防抖，避免频繁请求
2. **加载状态**: 显示加载动画，提升用户体验
3. **错误重试**: 网络错误时提供重试机制
4. **缓存策略**: 相同参数的请求可以缓存结果（客户端缓存）

---

## 故障排查

如果遇到超时或生成失败，请参考：
- [行程生成接口故障排查指南](./itinerary-troubleshooting.md)

### 常见问题快速解决

**问题**: 接口超时（> 5分钟）
**解决**: 默认超时已设置为 5 分钟（300秒），如需调整可在 `.env` 中设置 `LLM_TIMEOUT_MS=300000`

**问题**: AI 服务调用失败
**解决**: 检查 `DEEPSEEK_API_KEY` 是否正确配置

**问题**: 返回的行程不完整
**解决**: 系统已优化 token 限制，如仍有问题可减少行程天数

---

## 相关接口

- [位置信息生成 API](./location-api.md) - 获取活动的详细位置信息
- [旅行摘要生成 API](./travel-summary-api.md) - 生成行程摘要

