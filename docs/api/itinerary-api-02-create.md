# 行程接口文档 - 2. 创建行程（标准格式）

## 接口信息

**接口路径：** `POST /api/itinerary`

**接口描述：** 使用标准格式创建行程并保存到数据库

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体（Request Body）

```typescript
{
  destination: string;        // 目的地，必填
  startDate: string;          // 旅行开始日期，格式: "YYYY-MM-DD"，必填
  days: number;               // 旅行天数，范围 1-30，必填
  data: {                     // 行程数据，必填
    days: Array<{             // 每天的行程
      day: number;            // 第几天，从1开始
      date: string;            // 日期，格式: "YYYY-MM-DD"
      activities: Array<{      // 活动列表
        time: string;          // 活动时间，格式: "HH:mm"
        title: string;         // 活动标题
        type: "attraction" | "meal" | "hotel" | "shopping" | "transport";
        duration: number;      // 持续时间（分钟）
        location: {            // 位置坐标
          lat: number;         // 纬度
          lng: number;         // 经度
        };
        notes: string;         // 活动描述和建议
        cost: number;          // 预估费用
      }>;
    }>;
    totalCost: number;        // 总费用
    summary: string;          // 行程摘要
  };
  preferences?: {             // 用户偏好（可选）
    interests?: string[];     // 兴趣列表
    budget?: "low" | "medium" | "high";
    travelStyle?: "relaxed" | "moderate" | "intensive";
  };
  status?: "draft" | "published" | "archived";  // 状态，默认 "draft"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 是 | 目的地名称 | `"瑞士琉森"` |
| `startDate` | string | 是 | 开始日期（YYYY-MM-DD） | `"2024-06-01"` |
| `days` | number | 是 | 旅行天数（1-30） | `5` |
| `data` | object | 是 | 行程数据对象 | 见下方说明 |
| `data.days` | Array | 是 | 天数数组 | 见下方说明 |
| `data.days[].day` | number | 是 | 天数序号（从1开始） | `1` |
| `data.days[].date` | string | 是 | 日期（YYYY-MM-DD） | `"2024-06-01"` |
| `data.days[].activities` | Array | 是 | 活动列表 | 见下方说明 |
| `data.days[].activities[].time` | string | 是 | 时间（HH:mm） | `"09:00"` |
| `data.days[].activities[].title` | string | 是 | 活动标题 | `"铁力士峰云端漫步"` |
| `data.days[].activities[].type` | string | 是 | 活动类型 | `"attraction"` |
| `data.days[].activities[].duration` | number | 是 | 持续时间（分钟） | `120` |
| `data.days[].activities[].location` | object | 是 | 位置坐标 | `{lat: 46.77, lng: 8.40}` |
| `data.days[].activities[].notes` | string | 是 | 活动描述 | `"详细的游览建议"` |
| `data.days[].activities[].cost` | number | 是 | 预估费用 | `400` |
| `data.totalCost` | number | 是 | 总费用 | `8000` |
| `data.summary` | string | 是 | 行程摘要 | `"行程摘要"` |
| `preferences` | object | 否 | 用户偏好 | 见上方说明 |
| `status` | string | 否 | 状态（默认：draft） | `"draft"` |

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "daysCount": 5,
    "summary": "行程摘要",
    "totalCost": 8000,
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
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "行程数据格式不正确：缺少 days 数组",
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
const response = await fetch('/api/itinerary', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destination: '瑞士琉森',
    startDate: '2024-06-01',
    days: 5,
    data: {
      days: [
        {
          day: 1,
          date: '2024-06-01',
          activities: [
            {
              time: '09:00',
              title: '铁力士峰云端漫步',
              type: 'attraction',
              duration: 120,
              location: { lat: 46.7704, lng: 8.4050 },
              notes: '详细的游览建议',
              cost: 400,
            },
          ],
        },
      ],
      totalCost: 8000,
      summary: '行程摘要',
    },
    preferences: {
      interests: ['自然风光'],
      budget: 'medium',
    },
    status: 'draft',
  }),
});

const result = await response.json();
```

---

## 注意事项

1. **日期格式**：所有日期必须使用 `YYYY-MM-DD` 格式
2. **时间格式**：时间必须使用 `HH:mm` 格式
3. **活动类型**：必须是以下之一：`attraction`、`meal`、`hotel`、`shopping`、`transport`
4. **必填字段**：`data.days` 数组不能为空，至少需要一天的行程
5. **坐标**：`location` 必须包含 `lat` 和 `lng` 两个字段

