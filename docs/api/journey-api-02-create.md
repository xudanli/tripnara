# 行程接口文档 - 2. 创建行程

## 接口信息

**接口路径：** `POST /api/v1/journeys`

**接口描述：** 创建一个新的行程，支持包含完整的天数和活动信息

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "destination": "冰岛",
  "startDate": "2025-11-25",
  "days": 5,
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-25",
        "activities": [
          {
            "time": "08:00",
            "title": "蓝湖温泉",
            "type": "attraction",
            "duration": 180,
            "location": { "lat": 63.8808, "lng": -22.4495 },
            "notes": "在蓝湖温泉中放松身心，体验地热水的温暖",
            "cost": 6000
          }
        ]
      }
    ],
    "totalCost": 158800,
    "summary": "5天的冰岛之旅，行程包含多个精彩活动"
  },
  "preferences": {
    "interests": ["自然风光", "户外活动"],
    "budget": "medium",
    "travelStyle": "relaxed"
  },
  "status": "draft"
}
```

### 字段说明

#### 顶层字段

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `destination` | string | 是 | 目的地名称 | `"冰岛"` |
| `startDate` | string | 是 | 旅行开始日期（YYYY-MM-DD格式） | `"2025-11-25"` |
| `days` | number | 是 | 旅行天数，范围 1-30 | `5` |
| `data` | object | 是 | 行程详细数据 | 见下方说明 |
| `preferences` | object | 否 | 用户偏好设置 | 见下方说明 |
| `status` | string | 否 | 行程状态：`draft`（草稿）、`published`（已发布）、`archived`（已归档），默认 `draft` | `"draft"` |

#### data 对象字段

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `days` | array | 是 | 行程天数详情数组，至少需要一天 | `[...]` |
| `totalCost` | number | 是 | 行程总费用 | `158800` |
| `summary` | string | 是 | 行程摘要 | `"5天的冰岛之旅"` |

#### data.days 数组项结构

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `day` | number | 是 | 天数序号（从1开始） | `1` |
| `date` | string | 是 | 日期（YYYY-MM-DD格式） | `"2025-11-25"` |
| `activities` | array | 是 | 活动列表（可以为空数组） | `[...]` |

#### activities 数组项结构

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `time` | string | 是 | 活动时间（HH:MM格式） | `"08:00"` |
| `title` | string | 是 | 活动标题 | `"蓝湖温泉"` |
| `type` | string | 是 | 活动类型：`attraction`（景点）、`meal`（用餐）、`hotel`（酒店）、`shopping`（购物）、`transport`（交通）、`ocean`（海洋活动） | `"attraction"` |
| `duration` | number | 是 | 持续时间（分钟），最小值为 1 | `180` |
| `location` | object | 是 | 位置坐标 `{ "lat": number, "lng": number }` | `{ "lat": 63.8808, "lng": -22.4495 }` |
| `notes` | string | 是 | 活动描述和建议 | `"在蓝湖温泉中放松身心"` |
| `cost` | number | 是 | 预估费用 | `6000` |

#### preferences 对象字段（可选）

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `interests` | array | 否 | 兴趣列表 | `["自然风光", "户外活动"]` |
| `budget` | string | 否 | 预算等级：`low`（经济）、`medium`（中等）、`high`（豪华） | `"medium"` |
| `travelStyle` | string | 否 | 旅行风格：`relaxed`（轻松）、`moderate`（适中）、`intensive`（紧凑） | `"relaxed"` |

**注意**：`preferences` 也可以直接传入一个兴趣数组，系统会自动转换为对象格式。

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "冰岛",
    "startDate": "2025-11-25",
    "days": 5,
    "data": {
      "days": [
        {
          "day": 1,
          "date": "2025-11-25",
          "activities": [
            {
              "time": "08:00",
              "title": "蓝湖温泉",
              "type": "attraction",
              "duration": 180,
              "location": { "lat": 63.8808, "lng": -22.4495 },
              "notes": "在蓝湖温泉中放松身心，体验地热水的温暖",
              "cost": 6000
            },
            {
              "time": "12:00",
              "title": "海鲜盛宴",
              "type": "meal",
              "duration": 90,
              "location": { "lat": 64.1265, "lng": -21.8174 },
              "notes": "在雷克雅未克市中心品尝新鲜海鲜",
              "cost": 5000
            }
          ]
        },
        {
          "day": 2,
          "date": "2025-11-26",
          "activities": [
            {
              "time": "09:00",
              "title": "黄金圈探秘",
              "type": "attraction",
              "duration": 240,
              "location": { "lat": 64.3269, "lng": -20.1211 },
              "notes": "参观古佛斯瀑布和盖歇尔间歇泉",
              "cost": 8000
            }
          ]
        }
      ],
      "totalCost": 158800,
      "summary": "5天的冰岛之旅，行程包含多个精彩活动"
    },
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "status": "draft"
  }'
```

### JavaScript/TypeScript

```typescript
const newJourney = {
  destination: '冰岛',
  startDate: '2025-11-25',
  days: 5,
  data: {
    days: [
      {
        day: 1,
        date: '2025-11-25',
        activities: [
          {
            time: '08:00',
            title: '蓝湖温泉',
            type: 'attraction',
            duration: 180,
            location: { lat: 63.8808, lng: -22.4495 },
            notes: '在蓝湖温泉中放松身心，体验地热水的温暖',
            cost: 6000,
          },
        ],
      },
    ],
    totalCost: 158800,
    summary: '5天的冰岛之旅，行程包含多个精彩活动',
  },
  preferences: {
    interests: ['自然风光', '户外活动'],
    budget: 'medium',
    travelStyle: 'relaxed',
  },
  status: 'draft',
};

const response = await fetch('/api/v1/journeys', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newJourney),
});

const result = await response.json();
console.log('创建成功:', result);
```

### 简化示例（最少必填字段）

```json
{
  "destination": "冰岛",
  "startDate": "2025-11-25",
  "days": 1,
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-25",
        "activities": []
      }
    ],
    "totalCost": 0,
    "summary": "冰岛一日游"
  }
}
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "21dca0c6-b26e-46a0-8e01-cbbdd74b81df",
    "userId": "c39f24f6-362b-43b3-95ab-4e62f36e83c8",
    "destination": "冰岛",
    "startDate": "2025-11-25",
    "daysCount": 5,
    "summary": "5天的冰岛之旅，行程包含多个精彩活动",
    "totalCost": 158800,
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "status": "draft",
    "days": [
      {
        "id": "day-id-1",
        "day": 1,
        "date": "2025-11-25",
        "activities": [
          {
            "id": "activity-id-1",
            "time": "08:00",
            "title": "蓝湖温泉",
            "type": "attraction",
            "duration": 180,
            "location": { "lat": 63.8808, "lng": -22.4495 },
            "notes": "在蓝湖温泉中放松身心，体验地热水的温暖",
            "cost": 6000
          }
        ]
      }
    ],
    "tasks": [],
    "createdAt": "2025-11-25T21:43:18.000Z",
    "updatedAt": "2025-11-25T21:43:18.000Z"
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 创建的行程数据 |
| `data.id` | string | 行程ID（UUID） |
| `data.userId` | string | 用户ID（UUID） |
| `data.destination` | string | 目的地 |
| `data.startDate` | string | 开始日期（YYYY-MM-DD） |
| `data.daysCount` | number | 行程天数 |
| `data.summary` | string | 行程摘要 |
| `data.totalCost` | number | 总费用 |
| `data.preferences` | object | 用户偏好设置 |
| `data.status` | string | 行程状态 |
| `data.days` | array | 天数详情数组 |
| `data.days[].id` | string | 天数ID（UUID） |
| `data.days[].day` | number | 天数序号 |
| `data.days[].date` | string | 日期（YYYY-MM-DD） |
| `data.days[].activities` | array | 活动列表 |
| `data.days[].activities[].id` | string | 活动ID（UUID） |
| `data.days[].activities[].time` | string | 活动时间（HH:MM） |
| `data.days[].activities[].title` | string | 活动标题 |
| `data.days[].activities[].type` | string | 活动类型 |
| `data.days[].activities[].duration` | number | 持续时间（分钟） |
| `data.days[].activities[].location` | object | 位置坐标 |
| `data.days[].activities[].notes` | string | 活动描述 |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.tasks` | array | 任务列表（创建时为空） |
| `data.createdAt` | string | 创建时间（ISO 8601格式） |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "destination should not be empty",
    "startDate must be a valid ISO 8601 date string",
    "days must not be less than 1",
    "days must not be greater than 30"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - 数据格式错误

```json
{
  "statusCode": 400,
  "message": "行程数据格式不正确：缺少 days 数组",
  "error": "Bad Request"
}
```

### 400 Bad Request - 行程数据为空

```json
{
  "statusCode": 400,
  "message": "行程数据不能为空：至少需要一天的行程",
  "error": "Bad Request"
}
```

### 400 Bad Request - 日期格式错误

```json
{
  "statusCode": 400,
  "message": "创建行程时发生错误: 日期格式不正确: 2025-11-25T",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## 使用说明

### 1. 基本用法

创建一个简单的行程，只需要提供：
- `destination`：目的地
- `startDate`：开始日期
- `days`：天数
- `data.days`：至少一个天的数据（可以只有日期，没有活动）

### 2. 完整用法

可以一次性创建包含所有天数和活动的完整行程：
- 包含所有天数的详情
- 每个天数包含多个活动
- 设置用户偏好
- 设置总费用和摘要

### 3. 数据验证

- `days` 字段必须在 1-30 之间
- `data.days` 数组必须至少包含一个元素
- `startDate` 和所有 `day.date` 必须是有效的日期格式（YYYY-MM-DD）
- 活动类型必须是预定义的值之一

### 4. 日期处理

- 所有日期字段都使用 `YYYY-MM-DD` 格式
- 系统会自动验证日期格式和有效性
- `startDate` 应该与 `data.days[0].date` 一致（建议）

---

## 注意事项

1. **必填字段**：`destination`、`startDate`、`days`、`data` 都是必填的
2. **数据完整性**：`data.days` 数组不能为空，至少需要包含一个天数
3. **天数一致性**：`days` 字段的值应该与 `data.days` 数组的长度一致（建议）
4. **日期格式**：所有日期字段必须使用 `YYYY-MM-DD` 格式
5. **活动类型**：`activities[].type` 必须是以下值之一：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean`
6. **坐标格式**：`location` 对象必须包含 `lat` 和 `lng` 两个数字字段
7. **权限控制**：只能创建当前登录用户自己的行程

---

## 完整示例

### 创建5天冰岛行程

```json
{
  "destination": "冰岛",
  "startDate": "2025-11-25",
  "days": 5,
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-25",
        "activities": [
          {
            "time": "08:00",
            "title": "蓝湖温泉",
            "type": "attraction",
            "duration": 180,
            "location": { "lat": 63.8808, "lng": -22.4495 },
            "notes": "在蓝湖温泉中放松身心，体验地热水的温暖，建议提前预订门票",
            "cost": 6000
          },
          {
            "time": "12:00",
            "title": "海鲜盛宴",
            "type": "meal",
            "duration": 90,
            "location": { "lat": 64.1265, "lng": -21.8174 },
            "notes": "在雷克雅未克市中心品尝新鲜海鲜",
            "cost": 5000
          }
        ]
      },
      {
        "day": 2,
        "date": "2025-11-26",
        "activities": [
          {
            "time": "09:00",
            "title": "黄金圈探秘",
            "type": "attraction",
            "duration": 240,
            "location": { "lat": 64.3269, "lng": -20.1211 },
            "notes": "参观古佛斯瀑布和盖歇尔间歇泉",
            "cost": 8000
          }
        ]
      }
    ],
    "totalCost": 158800,
    "summary": "5天的冰岛之旅，行程包含蓝湖温泉、黄金圈等精彩活动"
  },
  "preferences": {
    "interests": ["自然风光", "户外活动"],
    "budget": "medium",
    "travelStyle": "relaxed"
  },
  "status": "draft"
}
```

---

## 相关接口

- [获取行程列表](./journey-api-01-get-list.md) - `GET /api/v1/journeys`
- [获取行程详情](./journey-api-03-get-detail.md) - `GET /api/v1/journeys/:journeyId`
- [更新行程](./journey-api-04-update.md) - `PATCH /api/v1/journeys/:journeyId`
- [从前端数据格式创建行程](./journey-api-05-create-from-frontend-data.md) - `POST /api/v1/journeys/from-frontend-data`

