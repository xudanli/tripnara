# 行程模版接口文档 - 1. 新建行程模版

## 接口信息

**接口路径：** `POST /api/v1/itineraries`

**接口描述：** 创建一个新的行程模版，接受顶层格式的数据（包含 title、language、tasks 等字段）

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体（Request Body）

```typescript
{
  title: string;                    // 行程模版标题，必填，最大长度255字符
  destination?: string;              // 目的地国家/地区
  duration?: number;                 // 行程天数（1-30）
  budget?: string;                   // 预算等级：low/medium/high/economy/comfort/luxury
  preferences?: string[];            // 偏好列表，字符串数组
  travelStyle?: string;              // 旅行风格：relaxed/moderate/active/adventurous/intensive
  recommendations?: {                // 推荐信息（可选）
    accommodation?: string;           // 住宿推荐
    transportation?: string;         // 交通推荐
    food?: string;                   // 美食推荐
    tips?: string;                   // 行程建议和提示
  };
  days?: Array<{                     // 天数详情数组
    day: number;                     // 天数序号（从1开始）
    date?: string;                   // 日期（格式：YYYY-MM-DD）
    timeSlots: Array<{               // 时间段数组
      time: string;                  // 时间（格式：HH:mm，如 "08:00"）
      title?: string;                // 活动标题
      activity?: string;              // 活动描述
      type?: string;                 // 类型：transport/attraction/meal/hotel/shopping/activity
      coordinates?: {                 // 坐标信息
        lat: number;                  // 纬度
        lng: number;                  // 经度
      };
      notes?: string;                // 备注说明
      cost?: number;                 // 费用（美元）
      duration?: number;             // 持续时间（分钟）
      details?: object;               // 活动详情（可选，任意对象）
    }>;
  }>;
  totalCost?: number;                // 总费用（美元）
  summary?: string;                  // 行程摘要
  status?: string;                   // 状态：draft/published/archived，默认 draft
  language?: string;                 // 语言代码：zh-CN/en-US，默认 zh-CN
  tasks?: Array<{                   // 任务列表（可选）
    id?: string;                     // 任务ID
    title: string;                   // 任务标题，必填
    completed?: boolean;             // 是否完成，默认 false
    category?: string;               // 任务类别（如：preparation）
    destination?: string;           // 目的地
    links?: Array<{                  // 相关链接数组
      label: string;                 // 链接标签
      url: string;                   // 链接URL
    }>;
  }>;
}
```

### 字段说明

#### 基础字段

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `title` | string | 是 | 行程模版标题，最大长度255字符 | `"冰岛之旅"` |
| `destination` | string | 否 | 目的地国家/地区 | `"冰岛"` |
| `duration` | number | 否 | 行程天数（1-30） | `5` |
| `budget` | string | 否 | 预算等级 | `"medium"` |
| `preferences` | string[] | 否 | 偏好列表 | `[]` |
| `travelStyle` | string | 否 | 旅行风格 | `"moderate"` |
| `totalCost` | number | 否 | 总费用（美元） | `2000` |
| `summary` | string | 否 | 行程摘要 | `"这个5天冰岛行程..."` |
| `status` | string | 否 | 状态（默认：draft） | `"draft"` |
| `language` | string | 否 | 语言代码（默认：zh-CN） | `"zh-CN"` |

#### recommendations 推荐信息（可选）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `accommodation` | string | 住宿推荐 |
| `transportation` | string | 交通推荐 |
| `food` | string | 美食推荐 |
| `tips` | string | 行程建议和提示 |

#### days 天数数组

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `day` | number | 是 | 天数序号（从1开始） |
| `date` | string | 否 | 日期（格式：YYYY-MM-DD） |
| `timeSlots` | array | 是 | 时间段数组 |

#### timeSlots 时间段数组

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `time` | string | 是 | 时间（格式：HH:mm） |
| `title` | string | 否 | 活动标题 |
| `activity` | string | 否 | 活动描述 |
| `type` | string | 否 | 类型：transport/attraction/meal/hotel/shopping/activity |
| `coordinates` | object | 否 | 坐标信息 {lat: number, lng: number} |
| `notes` | string | 否 | 备注说明 |
| `cost` | number | 否 | 费用（美元） |
| `duration` | number | 否 | 持续时间（分钟） |
| `details` | object | 否 | 活动详情（任意对象） |

#### tasks 任务数组（可选）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 任务标题 |
| `completed` | boolean | 否 | 是否完成（默认：false） |
| `category` | string | 否 | 任务类别 |
| `destination` | string | 否 | 目的地 |
| `links` | array | 否 | 相关链接数组 |

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
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
        "tips": "这个5天冰岛行程覆盖..."
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
      "summary": "这个5天冰岛行程覆盖..."
    },
    "tasks": [
      {
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
  },
  "message": "创建成功"
}
```

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "标题不能为空",
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
const response = await fetch('/api/v1/itineraries', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: '冰岛之旅',
    destination: '冰岛',
    duration: 5,
    budget: 'medium',
    preferences: [],
    travelStyle: 'moderate',
    days: [
      {
        day: 1,
        date: '2025-11-21',
        timeSlots: [
          {
            time: '08:00',
            title: '翱翔冰岛之翼：抵达雷克雅未克',
            type: 'transport',
            coordinates: { lat: 64.1283, lng: -21.8278 },
            notes: '从机场乘坐巴士或出租车前往市区...',
            cost: 50,
            duration: 60,
          },
        ],
      },
    ],
    totalCost: 2000,
    summary: '这个5天冰岛行程覆盖...',
    status: 'draft',
    language: 'zh-CN',
    tasks: [
      {
        title: '确认护照有效期及前往 冰岛 是否需要签证/入境许可。',
        completed: false,
        category: 'preparation',
        destination: '冰岛',
      },
    ],
  }),
});

const result = await response.json();
```

---

## 注意事项

1. **必填字段**：只有 `title` 字段是必填的，其他字段都是可选的
2. **数据格式**：
   - 时间格式：`HH:mm`（如 "08:00"）
   - 日期格式：`YYYY-MM-DD`（如 "2025-11-21"）
   - 坐标：经纬度使用数字类型
3. **嵌套结构**：`days` 和 `timeSlots` 都是数组，可以为空
4. **状态管理**：默认状态为 `draft`（草稿），创建后可以修改为 `published`（已发布）
5. **任务处理**：`tasks` 数组会被接收并返回，但不会保存到数据库（仅用于日志记录）

