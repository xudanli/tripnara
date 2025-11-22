# 行程模版接口文档 - 3. 根据ID获取行程模版详情

## 接口信息

**接口路径：** `GET /api/v1/itineraries/{id}`

**接口描述：** 根据ID获取完整的行程模版详情，包含所有天数和活动信息

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 行程模版ID |

## 查询参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `language` | string | 否 | 语言代码：`zh-CN`、`en-US` |

---

## 请求示例

```
GET /api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000?language=zh-CN
```

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000?language=zh-CN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "draft",
  "language": "zh-CN",
  "itineraryData": {
    "title": "冰岛之旅",
    "destination": "冰岛",
    "duration": 5,
    "budget": "medium",
    "preferences": [],
    "travelStyle": "moderate",
    "recommendations": {
      "tips": "这个5天冰岛行程覆盖雷克雅未克、黄金圈、南岸黑沙滩和蓝湖温泉..."
    },
    "days": [
      {
        "day": 1,
        "date": "2025-11-21",
        "timeSlots": [
          {
            "time": "08:00",
            "title": "翱翔冰岛之翼：抵达雷克雅未克",
            "activity": "翱翔冰岛之翼：抵达雷克雅未克",
            "type": "transport",
            "coordinates": {
              "lat": 64.1283,
              "lng": -21.8278
            },
            "notes": "从机场乘坐巴士或出租车前往市区...",
            "cost": 50,
            "duration": 60
          }
        ]
      }
    ],
    "totalCost": 2000,
    "summary": "这个5天冰岛行程覆盖雷克雅未克..."
  },
  "tasks": [
    {
      "id": "task_auto_international-冰岛-0_1763710262892",
      "title": "确认护照有效期及前往 冰岛 是否需要签证/入境许可。",
      "completed": false,
      "category": "preparation",
      "destination": "冰岛"
    }
  ],
  "createdBy": "user-id",
  "updatedBy": "user-id",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 行程模版ID |
| `status` | string | 状态：`draft`、`published`、`archived` |
| `language` | string | 语言代码 |
| `itineraryData` | object | 完整的行程数据 |
| `itineraryData.title` | string | 行程标题 |
| `itineraryData.destination` | string | 目的地 |
| `itineraryData.duration` | number | 行程天数 |
| `itineraryData.budget` | string | 预算等级 |
| `itineraryData.preferences` | array | 偏好列表 |
| `itineraryData.travelStyle` | string | 旅行风格 |
| `itineraryData.recommendations` | object | 推荐信息 |
| `itineraryData.days` | array | 天数数组 |
| `itineraryData.days[].day` | number | 天数序号 |
| `itineraryData.days[].date` | string | 日期（YYYY-MM-DD） |
| `itineraryData.days[].timeSlots` | array | 时间段数组 |
| `itineraryData.totalCost` | number | 总费用 |
| `itineraryData.summary` | string | 行程摘要 |
| `tasks` | array | 任务列表（可选） |
| `createdBy` | string | 创建者ID |
| `updatedBy` | string | 更新者ID |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程模版不存在: 123e4567-e89b-12d3-a456-426614174000",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程模版",
  "error": "Forbidden"
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
const itineraryId = '123e4567-e89b-12d3-a456-426614174000';

const response = await fetch(`/api/v1/itineraries/${itineraryId}?language=zh-CN`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

if (response.ok) {
  const data = await response.json();
  console.log('行程标题:', data.itineraryData.title);
  console.log('总天数:', data.itineraryData.duration);
  console.log('总费用:', data.itineraryData.totalCost);
} else {
  console.error('获取失败:', await response.json());
}
```

---

## 注意事项

1. **权限控制**：只能获取当前登录用户自己的行程模版
2. **数据格式**：
   - 日期格式：`YYYY-MM-DD`（如 "2025-11-21"）
   - 时间格式：`HH:mm`（如 "08:00"）
   - ISO 8601 格式：`YYYY-MM-DDTHH:mm:ssZ`（如 "2025-01-15T10:30:00Z"）
3. **完整数据**：此接口返回完整的行程数据，包括所有天数和活动详情
4. **语言参数**：`language` 查询参数用于指定返回数据的语言，如果不提供，将使用模版创建时的语言

