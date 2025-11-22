# 行程接口文档 - 1. 生成行程

## 接口信息

**接口路径：** `POST /api/itinerary/generate`

**接口描述：** 根据用户输入的目的地、天数、偏好等信息，通过 AI 生成详细的旅行行程

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体（Request Body）

```typescript
{
  destination: string;        // 目的地，如 "瑞士琉森"、"日本东京"
  days: number;               // 旅行天数，范围 1-30
  startDate: string;          // 旅行开始日期，格式: "YYYY-MM-DD"
  preferences?: {             // 用户偏好（可选）
    interests?: string[];     // 兴趣列表，如 ["自然风光", "户外活动"]
    budget?: "low" | "medium" | "high";  // 预算等级
    travelStyle?: "relaxed" | "moderate" | "intensive";  // 旅行风格
  };
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 是 | 目的地名称 | `"瑞士琉森"` |
| `days` | number | 是 | 旅行天数，范围 1-30 | `5` |
| `startDate` | string | 是 | 开始日期，格式 YYYY-MM-DD | `"2024-06-01"` |
| `preferences` | object | 否 | 用户偏好对象 | 见下方说明 |
| `preferences.interests` | string[] | 否 | 用户兴趣列表 | `["自然风光", "户外活动"]` |
| `preferences.budget` | string | 否 | 预算等级：low/medium/high | `"medium"` |
| `preferences.travelStyle` | string | 否 | 旅行风格：relaxed/moderate/intensive | `"relaxed"` |

---

## 响应数据

### 成功响应（200 OK）

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
            "notes": "详细的游览建议和体验描述",
            "cost": 400
          }
        ]
      }
    ],
    "totalCost": 8000,
    "summary": "行程摘要"
  },
  "generatedAt": "2024-01-01T00:00:00Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data.days` | Array | 行程天数数组 |
| `data.days[].day` | number | 天数序号（从1开始） |
| `data.days[].date` | string | 日期（YYYY-MM-DD） |
| `data.days[].activities` | Array | 活动列表 |
| `data.days[].activities[].time` | string | 活动时间（HH:mm） |
| `data.days[].activities[].title` | string | 活动标题 |
| `data.days[].activities[].type` | string | 活动类型 |
| `data.days[].activities[].duration` | number | 持续时间（分钟） |
| `data.days[].activities[].location` | object | 位置坐标 |
| `data.days[].activities[].notes` | string | 活动描述 |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.totalCost` | number | 总费用 |
| `data.summary` | string | 行程摘要 |
| `generatedAt` | string | 生成时间（ISO 8601） |

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "参数验证失败",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "未授权",
  "error": "Unauthorized"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/itinerary/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destination: '瑞士琉森',
    days: 5,
    startDate: '2024-06-01',
    preferences: {
      interests: ['自然风光', '户外活动'],
      budget: 'medium',
      travelStyle: 'relaxed',
    },
  }),
});

const result = await response.json();
```

### cURL

```bash
curl -X POST https://api.example.com/api/itinerary/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "瑞士琉森",
    "days": 5,
    "startDate": "2024-06-01",
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    }
  }'
```

---

## 注意事项

1. **日期格式**：`startDate` 必须使用 `YYYY-MM-DD` 格式
2. **天数限制**：`days` 必须在 1-30 之间
3. **生成时间**：AI 生成可能需要几秒到几十秒，请设置合适的超时时间
4. **活动类型**：支持的类型包括：`attraction`、`meal`、`hotel`、`shopping`、`transport`
5. **坐标信息**：生成的活动会包含位置坐标，可用于地图展示

