# 旅行摘要生成 API 文档

## 概述

旅行摘要生成接口用于根据已生成的行程数据，生成生动有趣的旅行摘要（100-150字），用于行程展示和分享。

**基础路径**: `/api/travel` (注意：应用已设置全局前缀 `api`，控制器路径为 `travel`)

**认证**: 需要 JWT Bearer Token

**特性**: 
- AI 生成生动有趣的摘要
- 自动回退到模板生成（AI 失败时）
- 摘要长度自动控制在 100-150 字

---

## 1. 生成旅行摘要

### 接口信息

- **URL**: `POST /api/travel/summary`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateTravelSummaryRequest {
  destination: string;         // 目的地，如 "瑞士琉森"
  itinerary: {
    days: ItineraryDay[];      // 行程天数详情
    totalCost?: number;        // 总费用（可选）
    summary?: string;          // 已有摘要（可选）
  };
}

interface ItineraryDay {
  day: number;                 // 第几天
  date: string;               // 日期 (YYYY-MM-DD)
  activities: Activity[];       // 活动列表
}

interface Activity {
  time: string;                // 活动时间，格式: "HH:mm"
  title: string;              // 活动标题
  type: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  notes?: string;             // 活动描述（可选）
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 是 | 目的地名称 | `"瑞士琉森"` |
| `itinerary.days` | ItineraryDay[] | 是 | 行程天数列表 | 见示例 |
| `itinerary.days[].day` | number | 是 | 第几天 | `1` |
| `itinerary.days[].date` | string | 是 | 日期 (YYYY-MM-DD) | `"2024-06-01"` |
| `itinerary.days[].activities` | Activity[] | 是 | 活动列表 | 见示例 |
| `itinerary.days[].activities[].time` | string | 是 | 活动时间 | `"09:00"` |
| `itinerary.days[].activities[].title` | string | 是 | 活动标题 | `"铁力士峰云端漫步"` |
| `itinerary.days[].activities[].type` | string | 是 | 活动类型 | `"attraction"` |
| `itinerary.days[].activities[].notes` | string | 否 | 活动描述 | `"详细的游览建议"` |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateTravelSummaryResponse {
  success: boolean;
  data: {
    summary: string;           // 生成的摘要（100-150字）
    generatedAt: string;       // 生成时间 (ISO 8601)
  };
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "summary": "5天琉森文化探索之旅，从铁力士峰的云端漫步到琉森湖的湖光山色，从卡佩尔桥的古老韵味到狮子纪念碑的历史沉淀。行程融合自然与人文，既有登高望远的壮阔体验，也有深入当地文化的精致品味，让您在这个瑞士中部明珠中感受阿尔卑斯山的魅力与琉森古城的优雅。",
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

##### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "destination must be a string",
    "itinerary.days must be an array",
    "itinerary.days[0].day must be a number"
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

##### 500 Internal Server Error - 生成失败（会使用模板回退）

```json
{
  "statusCode": 500,
  "message": "摘要生成失败，已使用模板生成"
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/travel/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "itinerary": {
      "days": [
        {
          "day": 1,
          "date": "2024-06-01",
          "activities": [
            {
              "time": "09:00",
              "title": "铁力士峰云端漫步",
              "type": "attraction",
              "notes": "登上海拔3020米的铁力士峰，体验欧洲最高的悬索桥"
            },
            {
              "time": "14:00",
              "title": "琉森湖游船",
              "type": "attraction",
              "notes": "乘坐游船欣赏琉森湖的湖光山色"
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
              "notes": "参观琉森最著名的地标，欧洲最古老的木制廊桥"
            }
          ]
        }
      ]
    }
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3000/api/travel/summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    destination: '瑞士琉森',
    itinerary: {
      days: [
        {
          day: 1,
          date: '2024-06-01',
          activities: [
            {
              time: '09:00',
              title: '铁力士峰云端漫步',
              type: 'attraction',
              notes: '登上海拔3020米的铁力士峰，体验欧洲最高的悬索桥'
            }
          ]
        }
      ]
    }
  })
});

const data = await response.json();
if (data.success) {
  console.log('摘要:', data.data.summary);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface Activity {
  time: string;
  title: string;
  type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
  notes?: string;
}

interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

interface GenerateTravelSummaryRequest {
  destination: string;
  itinerary: {
    days: ItineraryDay[];
    totalCost?: number;
    summary?: string;
  };
}

interface GenerateTravelSummaryResponse {
  success: boolean;
  data: {
    summary: string;
    generatedAt: string;
  };
}

async function generateTravelSummary(
  request: GenerateTravelSummaryRequest,
  token: string
): Promise<GenerateTravelSummaryResponse> {
  const response = await axios.post<GenerateTravelSummaryResponse>(
    'http://localhost:3000/api/travel/summary',
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
const result = await generateTravelSummary({
  destination: '瑞士琉森',
  itinerary: {
    days: [
      {
        day: 1,
        date: '2024-06-01',
        activities: [
          {
            time: '09:00',
            title: '铁力士峰云端漫步',
            type: 'attraction',
            notes: '登上海拔3020米的铁力士峰'
          }
        ]
      }
    ]
  }
}, 'your-jwt-token');

console.log('生成的摘要:', result.data.summary);
```

### 摘要生成逻辑

#### AI 生成（优先）

系统会分析行程数据：
- 统计活动类型分布
- 提取前 10 个主要活动
- 生成生动有趣的摘要（100-150字）

#### 模板回退（AI 失败时）

如果 AI 生成失败，系统会：
1. 检查是否有目的地专属模板（斐济、瑞士、日本等）
2. 使用通用模板生成摘要
3. 自动调整长度到 100-150 字

### 摘要特点

- **长度控制**: 自动控制在 100-150 字之间
- **语言风格**: 生动有趣，富有感染力
- **内容要点**: 
  - 突出旅行亮点和特色
  - 体现行程的丰富性和多样性
  - 使用积极正面的词汇

### 注意事项

1. **认证要求**: 所有请求必须携带有效的 JWT Token
2. **生成时间**: AI 生成需要 2-5 秒，模板生成 < 100ms
3. **数据要求**: 至少需要 1 天的行程数据
4. **活动信息**: 提供 `notes` 字段可以获得更丰富的摘要
5. **长度保证**: 即使 AI 失败，也会返回 100-150 字的摘要

### 错误处理建议

```typescript
try {
  const response = await generateTravelSummary(request, token);
  if (response.success) {
    // 处理成功响应
    displaySummary(response.data.summary);
  }
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 400:
        console.error('参数错误:', error.response.data.message);
        // 提示用户检查输入数据
        break;
      case 401:
        console.error('未认证，请重新登录');
        redirectToLogin();
        break;
      case 500:
        // 即使 AI 失败，也会返回模板生成的摘要
        console.warn('使用模板生成的摘要');
        break;
    }
  } else {
    console.error('网络错误:', error.message);
  }
}
```

### 使用场景

1. **行程展示**: 在行程列表或详情页显示摘要
2. **分享功能**: 生成分享文案
3. **行程预览**: 快速了解行程亮点
4. **收藏夹**: 为收藏的行程生成描述

### 性能优化建议

1. **延迟加载**: 在用户需要时才生成摘要
2. **缓存结果**: 相同行程的摘要可以缓存（客户端）
3. **批量处理**: 如果需要为多个行程生成摘要，建议串行请求
4. **错误处理**: 即使生成失败也会返回摘要，无需特殊处理

---

## 相关接口

- [行程生成 API](./itinerary-api.md) - 生成包含活动详情的行程
- [位置信息生成 API](./location-api.md) - 获取活动的详细位置信息

