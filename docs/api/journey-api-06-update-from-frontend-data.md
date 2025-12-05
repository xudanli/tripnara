# 行程接口文档 - 6. 从前端数据格式更新行程

## 接口信息

**接口路径：** `PATCH /api/v1/journeys/{journeyId}/from-frontend-data`

**接口描述：** 接受前端提供的完整行程数据格式（包含 itineraryData 和 tasks），自动转换为标准格式并更新行程，包括 days 数组的详细内容

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求参数

### 请求体结构

```json
{
  "itineraryData": {
    "destination": "冰岛",
    "duration": 5,
    "budget": "medium",
    "preferences": ["nature", "adventure"],
    "travelStyle": "moderate",
    "itinerary": [],
    "recommendations": {
      "accommodation": "...",
      "transportation": "...",
      "food": "...",
      "tips": "..."
    },
    "days": [
      {
        "id": "day-id-1",
        "day": 1,
        "date": "2025-11-24",
        "timeSlots": [
          {
            "time": "09:00",
            "title": "活动标题",
            "activity": "活动描述",
            "type": "attraction",
            "coordinates": { "lat": 64.1419, "lng": -21.9274 },
            "notes": "活动备注",
            "details": {},
            "cost": 1200,
            "duration": 90
          }
        ]
      }
    ],
    "totalCost": 88400,
    "summary": "行程摘要",
    "title": "冰岛之旅"
  },
  "tasks": [
    {
      "title": "任务标题",
      "completed": false,
      "links": [
        {
          "label": "链接标签",
          "url": "https://example.com"
        }
      ]
    }
  ],
  "startDate": "2025-11-24"
}
```

### 字段说明

#### 顶层字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `itineraryData` | object | 是 | 行程数据对象 |
| `tasks` | array | 否 | 任务列表（当前不保存到数据库） |
| `startDate` | string | 否 | 旅行开始日期（YYYY-MM-DD），如果未提供，将使用第一天的日期 |

#### itineraryData 字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `destination` | string | 是 | 目的地 |
| `duration` | number | 是 | 行程天数 |
| `budget` | string | 否 | 预算等级（如：low, medium, high） |
| `preferences` | string[] | 否 | 偏好列表（数组格式，会自动转换为对象） |
| `travelStyle` | string | 否 | 旅行风格（如：relaxed, moderate, intensive） |
| `itinerary` | array | 否 | 行程数组（空数组，会被忽略） |
| `recommendations` | object | 否 | 推荐信息对象 |
| `days` | array | 是 | 天数数组（包含 timeSlots） |
| `totalCost` | number | 否 | 总费用 |
| `summary` | string | 否 | 行程摘要 |
| `title` | string | 是 | 行程标题 |
| `practicalInfo` | object | 否 | 实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等） | 见下方说明 |

#### days 数组中的对象

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `day` | number | 是 | 天数序号（从1开始） |
| `date` | string | 是 | 日期（YYYY-MM-DD） |
| `timeSlots` | array | 是 | 时间段数组 |

#### timeSlots 数组中的对象

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `time` | string | 是 | 时间（HH:MM格式，如：09:00） |
| `title` | string | 是 | 活动标题 |
| `activity` | string | 否 | 活动描述（如果 title 为空，会使用此字段） |
| `type` | string | 是 | 活动类型：`attraction`（景点）、`meal`（用餐）、`hotel`（酒店）、`shopping`（购物）、`transport`（交通）、`ocean`（海洋活动） |
| `coordinates` | object | 是 | 位置坐标 `{ "lat": number, "lng": number }` |
| `notes` | string | 否 | 活动备注 |
| `details` | object | 否 | 活动详细信息（JSON对象），包含多语言名称、地址、开放时间、价格详情、推荐信息等，**会被保存到数据库** | 见下方说明 |
| `cost` | number | 否 | 预估费用 |
| `duration` | number | 否 | 持续时间（分钟） |
| `chineseName` | string | 否 | 中文名称（可选，会从 details.name.chinese 或自动推导） |
| `englishName` | string | 否 | 英文名称（可选，会从 details.name.english 或自动推导） |
| `destinationLanguageName` | string | 否 | 目的地语言名称（可选，会从 details.name.local 提取） |
| `locationName` | string | 否 | 位置名称（可选，会从 details.address 或自动构建） |

#### details 对象结构（可选）

`details` 字段用于存储活动的详细信息，是一个灵活的 JSON 对象，可以包含以下内容：

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `name` | object | 多语言名称 | `{ "chinese": "蓝湖温泉", "english": "Blue Lagoon" }` |
| `address` | object | 多语言地址 | `{ "chinese": "冰岛雷克雅未克", "english": "Reykjavik, Iceland" }` |
| `transportation` | string | 交通信息 | `"从市区乘坐巴士约1小时"` |
| `openingHours` | string | 开放时间 | `"每日9:00-22:00"` |
| `pricing` | object | 价格详情 | `{ "detail": "成人票：5000冰岛克朗" }` |
| `rating` | number | 评分 | `4.7` |
| `recommendations` | object | 推荐信息（游览建议、最佳时间、附近景点等） | `{ "visitTips": "...", "bestTimeToVisit": "..." }` |
| `contact` | object | 联系方式 | `{ "info": "电话：+354 123 4567" }` |
| `accessibility` | string | 无障碍设施信息 | `"提供轮椅通道"` |
| `category` | string | 分类 | `"温泉"` |

**注意**：`details` 字段的结构是灵活的，可以根据需要包含任意字段。所有字段都是可选的。**此字段会被完整保存到数据库的 JSONB 字段中。**

#### practicalInfo 对象字段（可选）

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `weather` | string | 未来一周天气预报摘要 | `"未来一周以晴天为主，气温15-25°C"` |
| `safety` | string | 安全提醒和注意事项 | `"整体安全状况良好，但需注意山区天气变化"` |
| `plugType` | string | 当地插座类型和电压 | `"Type J（瑞士标准），220V，50Hz"` |
| `currency` | string | 当地货币及汇率 | `"CHF（瑞士法郎），1 CHF ≈ 8 CNY"` |
| `culturalTaboos` | string | 文化禁忌和注意事项 | `"进入教堂需保持安静，不要大声喧哗"` |
| `packingList` | string | 针对性打包清单 | `"轻便外套、防滑徒步鞋、防晒用品"` |

#### tasks 数组中的对象

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 任务标题 |
| `completed` | boolean | 否 | 是否完成（默认 false） |
| `links` | array | 否 | 链接列表 |
| `links[].label` | string | 是 | 链接标签 |
| `links[].url` | string | 是 | 链接URL |

---

## 请求示例

### cURL

```bash
curl -X PATCH "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/from-frontend-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itineraryData": {
      "destination": "冰岛",
      "duration": 5,
      "budget": "medium",
      "preferences": ["nature", "adventure"],
      "travelStyle": "moderate",
      "days": [
        {
          "id": "day-id-1",
          "day": 1,
          "date": "2025-11-24",
          "timeSlots": [
            {
              "time": "09:00",
              "title": "蓝湖温泉",
              "type": "attraction",
              "coordinates": { "lat": 64.1419, "lng": -21.9274 },
              "notes": "提前预订门票",
              "cost": 1200,
              "duration": 120
            }
          ]
        }
      ],
      "totalCost": 88400,
      "summary": "冰岛5日游",
      "title": "冰岛之旅",
      "practicalInfo": {
        "weather": "未来一周以晴天为主，气温15-25°C",
        "safety": "冰岛整体安全状况良好",
        "plugType": "Type C/F，220V，50Hz",
        "currency": "ISK（冰岛克朗），1 ISK ≈ 0.05 CNY",
        "culturalTaboos": "进入教堂需保持安静",
        "packingList": "轻便外套、防滑徒步鞋、防晒用品"
      }
    },
    "startDate": "2025-11-24"
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "04d7126d-219f-49ab-b71a-a595c18d6b8f",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "冰岛",
    "startDate": "2025-11-24T00:00:00.000Z",
    "daysCount": 5,
    "summary": "冰岛5日游",
    "totalCost": 88400,
    "status": "draft",
    "preferences": {
      "interests": ["nature", "adventure"],
      "budget": "medium",
      "travelStyle": "moderate"
    },
    "days": [
      {
        "id": "day-id-1",
        "day": 1,
        "date": "2025-11-24",
        "activities": [
          {
            "id": "activity-id-1",
            "id": "activity-id-1",
            "time": "09:00",
            "title": "蓝湖温泉",
            "type": "attraction",
            "duration": 120,
            "location": { "lat": 64.1419, "lng": -21.9274 },
            "notes": "提前预订门票",
            "cost": 1200,
            "chineseName": "蓝湖温泉",
            "englishName": "Blue Lagoon",
            "destinationLanguageName": "Bláa lónið",
            "locationName": "Nordurljosavegur 9, 240 Grindavík, Iceland",
            "details": {
              "name": {
                "chinese": "蓝湖温泉",
                "english": "Blue Lagoon",
                "local": "Bláa lónið"
              },
              "openingHours": "每日9:00-22:00",
              "rating": 4.7
            }
          }
        ]
      }
    ],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T11:30:00.000Z"
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 更新后的行程数据 |
| `data.id` | string | 行程ID |
| `data.userId` | string | 用户ID |
| `data.destination` | string | 目的地 |
| `data.startDate` | string | 开始日期（ISO 8601格式） |
| `data.daysCount` | number | 行程天数 |
| `data.summary` | string | 行程摘要 |
| `data.totalCost` | number | 总费用 |
| `data.practicalInfo` | object | 实用信息（可选） |
| `data.practicalInfo.weather` | string | 未来一周天气预报摘要 |
| `data.practicalInfo.safety` | string | 安全提醒和注意事项 |
| `data.practicalInfo.plugType` | string | 当地插座类型和电压 |
| `data.practicalInfo.currency` | string | 当地货币及汇率 |
| `data.practicalInfo.culturalTaboos` | string | 文化禁忌和注意事项 |
| `data.practicalInfo.packingList` | string | 针对性打包清单 |
| `data.status` | string | 状态：`draft`、`published`、`archived` |
| `data.preferences` | object | 偏好信息 |
| `data.days` | array | 天数数组 |
| `data.days[].id` | string | 天数ID |
| `data.days[].day` | number | 天数序号 |
| `data.days[].date` | string | 日期（YYYY-MM-DD） |
| `data.days[].activities` | array | 活动数组 |
| `data.days[].activities[].id` | string | 活动ID |
| `data.days[].activities[].time` | string | 时间（HH:MM） |
| `data.days[].activities[].title` | string | 活动标题 |
| `data.days[].activities[].type` | string | 活动类型 |
| `data.days[].activities[].duration` | number | 持续时间（分钟） |
| `data.days[].activities[].location` | object | 位置坐标 |
| `data.days[].activities[].notes` | string | 活动备注 |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.days[].activities[].details` | object | 活动详细信息（JSON对象） |
| `data.days[].activities[].chineseName` | string | 中文名称（可选） |
| `data.days[].activities[].englishName` | string | 英文名称（可选） |
| `data.days[].activities[].destinationLanguageName` | string | 目的地语言名称（可选） |
| `data.days[].activities[].locationName` | string | 位置名称（可选） |
| `data.createdAt` | string | 创建时间（ISO 8601格式） |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: 04d7126d-219f-49ab-b71a-a595c18d6b8f",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权修改此行程",
  "error": "Forbidden"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "itineraryData must be an object",
    "itineraryData.destination must be a string",
    "itineraryData.days must be an array"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - 缺少开始日期

```json
{
  "statusCode": 400,
  "message": "缺少开始日期：请提供 startDate 或确保 days 数组的第一天包含 date 字段",
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';

const updateData = {
  itineraryData: {
    destination: '冰岛',
    duration: 5,
    budget: 'medium',
    preferences: ['nature', 'adventure'],
    travelStyle: 'moderate',
    days: [
      {
        day: 1,
        date: '2025-11-24',
        timeSlots: [
          {
            time: '09:00',
            title: '蓝湖温泉',
            type: 'attraction',
            coordinates: { lat: 64.1419, lng: -21.9274 },
            notes: '提前预订门票',
            cost: 1200,
            duration: 120,
          },
        ],
      },
    ],
    totalCost: 88400,
    summary: '冰岛5日游',
    title: '冰岛之旅',
  },
  startDate: '2025-11-24',
};

const response = await fetch(`/api/v1/journeys/${journeyId}/from-frontend-data`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData),
});

const result = await response.json();
if (result.success) {
  console.log('更新成功:', result.data);
}
```

---

## 注意事项

1. **完全替换**：此接口会完全替换现有的 days 和 activities 数据（先删除再创建），请确保提供完整的 days 数组

2. **数据转换**：
   - 前端的 `timeSlots` 会被转换为后端的 `activities`
   - 前端的 `coordinates` 会被转换为后端的 `location`
   - 前端的 `preferences` 数组会被转换为对象格式
   - 前端的 `timeSlot.details` 会被转换为 `activity.details`，**完整保存到数据库**

3. **开始日期**：
   - 优先使用传入的 `startDate`
   - 如果未提供 `startDate`，将使用 `days` 数组第一天的 `date` 字段
   - 如果两者都未提供，将返回 400 错误

4. **权限控制**：只能更新当前登录用户自己的行程

5. **tasks 字段**：当前 `tasks` 字段虽然可以传入，但不会保存到数据库（仅用于兼容前端数据格式）

6. **details 字段**：`timeSlots` 中的 `details` 字段**会被保存到数据库**，用于存储活动的详细信息（多语言名称、地址、开放时间、价格详情、推荐信息等）

7. **时间格式**：`date` 字段使用 `YYYY-MM-DD` 格式，`time` 字段使用 `HH:MM` 格式

