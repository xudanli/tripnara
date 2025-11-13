# 行程 API 接口文档

本文档提供行程（Journey）相关的所有 API 接口说明，用于前端对接。

**基础路径：** `/api/v1/journeys`

**认证：** 部分接口可能需要 JWT 认证（根据实际需求）

---

## 接口列表

### 1. 获取行程列表

**接口地址：** `GET /api/v1/journeys`

**接口说明：** 查询行程列表，支持多种筛选条件和分页

**请求参数（Query）：**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| userId | string | 否 | 按用户 ID 过滤 | `550e8400-e29b-41d4-a716-446655440000` |
| templateId | string | 否 | 按来源模板 ID 过滤 | `660e8400-e29b-41d4-a716-446655440001` |
| status | string | 否 | 按状态过滤：`draft`（草稿）、`generated`（已生成）、`archived`（已归档）、`shared`（已分享） | `generated` |
| keyword | string | 否 | 关键字搜索（搜索标题、目的地或摘要） | `挪威` |
| page | number | 否 | 页码，默认 1 | `1` |
| limit | number | 否 | 每页数量，默认 20 | `20` |

**请求示例：**

```bash
GET /api/v1/journeys?status=generated&page=1&limit=20
GET /api/v1/journeys?userId=550e8400-e29b-41d4-a716-446655440000&keyword=极光
```

**响应示例：**

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "templateId": "660e8400-e29b-41d4-a716-446655440001",
      "status": "generated",
      "mode": "inspiration",
      "title": "挪威北部极光追寻之旅",
      "coverImage": "https://example.com/cover.jpg",
      "destination": "挪威·特罗姆瑟·罗弗敦群岛",
      "startDate": "2024-12-01",
      "endDate": "2024-12-08",
      "durationDays": 7,
      "summary": "追寻北极光的梦幻之旅",
      "description": "详细描述...",
      "coreInsight": "核心洞察...",
      "safetyNotice": {},
      "journeyBackground": [],
      "personaProfile": {},
      "journeyDesign": {},
      "tasks": [],
      "budgetInfo": {},
      "sources": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | array | 行程列表数组 |
| total | number | 总记录数 |
| page | number | 当前页码 |
| limit | number | 每页数量 |

**行程对象字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 行程 ID（UUID） |
| userId | string | 用户 ID（UUID） |
| templateId | string | 来源模板 ID（UUID），如果从模板创建 |
| status | string | 状态：`draft`、`generated`、`archived`、`shared` |
| mode | string | 展示模式：`inspiration`、`planner`、`seeker` |
| title | string | 行程标题 |
| coverImage | string | 封面图链接 |
| destination | string | 目的地描述 |
| startDate | string | 开始日期（YYYY-MM-DD） |
| endDate | string | 结束日期（YYYY-MM-DD） |
| durationDays | number | 行程天数 |
| summary | string | 概览摘要 |
| description | string | 详细描述 |
| coreInsight | string | 核心洞察 |
| safetyNotice | object | 安全提示（JSON） |
| journeyBackground | array | 旅程背景数组（JSON） |
| personaProfile | object | 人物画像（JSON） |
| journeyDesign | object | 旅程设计（JSON） |
| tasks | array | 任务列表（JSON） |
| budgetInfo | object | 预算信息（JSON） |
| sources | object | 外部来源记录（JSON） |
| createdAt | string | 创建时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

**错误响应：**

```json
{
  "statusCode": 400,
  "message": "参数验证失败",
  "error": "Bad Request"
}
```

---

### 2. 获取行程详情

**接口地址：** `GET /api/v1/journeys/:journeyId`

**接口说明：** 获取指定行程的详细信息，包括所有天数和时段

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| journeyId | string | 是 | 行程 ID（UUID） |

**请求示例：**

```bash
GET /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000
```

**响应示例：**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "templateId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "generated",
  "mode": "inspiration",
  "title": "挪威北部极光追寻之旅",
  "coverImage": "https://example.com/cover.jpg",
  "destination": "挪威·特罗姆瑟·罗弗敦群岛",
  "startDate": "2024-12-01",
  "endDate": "2024-12-08",
  "durationDays": 7,
  "summary": "追寻北极光的梦幻之旅",
  "description": "详细描述...",
  "coreInsight": "核心洞察...",
  "safetyNotice": {},
  "journeyBackground": [],
  "personaProfile": {},
  "journeyDesign": {},
  "tasks": [],
  "budgetInfo": {},
  "sources": {},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "days": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "journeyId": "770e8400-e29b-41d4-a716-446655440000",
      "dayNumber": 1,
      "date": "2024-12-01",
      "title": "第一天：抵达特罗姆瑟",
      "summary": "抵达挪威北极圈内最大城市",
      "detailsJson": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "timeSlots": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440002",
          "dayId": "880e8400-e29b-41d4-a716-446655440001",
          "sequence": 1,
          "startTime": "14:00",
          "durationMinutes": 60,
          "type": "transport",
          "title": "机场接机",
          "activityHighlights": {},
          "scenicIntro": null,
          "notes": "接机后前往酒店",
          "cost": "500",
          "currencyCode": "NOK",
          "locationJson": {
            "name": "特罗姆瑟机场",
            "address": "Langnes, 9016 Tromsø"
          },
          "detailsJson": {},
          "source": "template",
          "aiGenerated": false,
          "lockedByUser": false,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

**响应字段说明：**

响应包含行程基本信息以及 `days` 数组，每个 `day` 包含：
- `id`: 天数 ID（UUID）
- `journeyId`: 所属行程 ID
- `dayNumber`: 天数序号（从 1 开始）
- `date`: 日期（YYYY-MM-DD）
- `title`: 天数标题
- `summary`: 天数摘要
- `detailsJson`: 详情 JSON
- `timeSlots`: 时段数组（按 `sequence` 升序排列）

每个 `timeSlot` 包含：
- `id`: 时段 ID（UUID）
- `dayId`: 所属天数 ID
- `sequence`: 序号（从 1 开始）
- `startTime`: 开始时间（HH:mm 格式）
- `durationMinutes`: 持续时间（分钟）
- `type`: 类型（如 `transport`、`activity`、`meal`）
- `title`: 标题
- `activityHighlights`: 活动亮点（JSON）
- `scenicIntro`: 风景介绍
- `notes`: 备注
- `cost`: 费用
- `currencyCode`: 币种代码（ISO 4217，如 `NOK`、`USD`）
- `locationJson`: 位置信息（JSON）
- `detailsJson`: 自定义详情（JSON）
- `source`: 数据来源
- `aiGenerated`: 是否为 AI 生成
- `lockedByUser`: 是否被用户锁定

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "行程不存在",
  "error": "Not Found"
}
```

---

### 3. 创建行程

**接口地址：** `POST /api/v1/journeys`

**接口说明：** 创建新的行程，可以基于模版创建或从头创建

**请求体（JSON）：**

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| title | string | 是 | 行程名称（最大 255 字符） | `挪威极光之旅` |
| coverImage | string | 否 | 封面图链接 | `https://example.com/cover.jpg` |
| startDate | string | 否 | 开始日期（ISO 8601 格式：YYYY-MM-DD） | `2024-12-01` |
| endDate | string | 否 | 结束日期（ISO 8601 格式：YYYY-MM-DD） | `2024-12-07` |
| durationDays | number | 否 | 行程天数（最小 1） | `7` |
| destination | string | 否 | 目的地 | `挪威` |
| summary | string | 否 | 行程摘要 | `追寻北极光的梦幻之旅` |
| description | string | 否 | 行程描述 | `详细描述...` |
| templateId | string | 否 | 关联的模版 ID（UUID），如果提供，会从模版复制基础结构 | `660e8400-e29b-41d4-a716-446655440001` |
| status | string | 否 | 状态：`draft`、`planning`、`confirmed`、`completed`、`cancelled`，默认 `draft` | `draft` |
| days | array | 否 | 日程结构数组（见下方说明） | 见示例 |

**days 数组项结构（JourneyDayDto）：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dayNumber | number | 是 | 天数序号（从 1 开始，最小 1） |
| date | string | 否 | 具体日期（ISO 8601 格式：YYYY-MM-DD） |
| title | string | 否 | 标题（最大 255 字符） |
| summary | string | 否 | 摘要 |
| detailsJson | object | 否 | 详情 JSON |
| timeSlots | array | 否 | 时段列表（见下方说明） |

**timeSlots 数组项结构（JourneyTimeSlotDto）：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sequence | number | 是 | 序号（从 1 开始，最小 1） |
| startTime | string | 否 | 开始时间（HH:mm 格式） |
| durationMinutes | number | 否 | 持续时间（分钟，最小 0） |
| type | string | 否 | 类型（最大 50 字符），如 `transport`、`activity`、`meal` |
| title | string | 否 | 标题（最大 255 字符） |
| activityHighlights | object | 否 | 亮点信息（JSON） |
| scenicIntro | string | 否 | 风景介绍 |
| notes | string | 否 | 备注 |
| cost | string | 否 | 费用 |
| currencyCode | string | 否 | 币种代码（最大 3 字符） |
| locationJson | object | 否 | 位置信息（JSON） |
| detailsJson | object | 否 | 自定义详情（JSON） |
| aiGenerated | boolean | 否 | 是否为 AI 生成，默认 `true` |
| lockedByUser | boolean | 否 | 是否被用户锁定，默认 `false` |

**请求示例：**

```json
{
  "title": "挪威极光之旅",
  "coverImage": "https://example.com/cover.jpg",
  "startDate": "2024-12-01",
  "endDate": "2024-12-07",
  "durationDays": 7,
  "destination": "挪威",
  "summary": "追寻北极光的梦幻之旅",
  "templateId": "660e8400-e29b-41d4-a716-446655440001",
  "days": [
    {
      "dayNumber": 1,
      "date": "2024-12-01",
      "title": "第一天：抵达奥斯陆",
      "summary": "抵达挪威首都，适应时差",
      "timeSlots": [
        {
          "sequence": 1,
          "startTime": "09:00",
          "durationMinutes": 120,
          "type": "activity",
          "title": "参观奥斯陆大教堂",
          "locationJson": {
            "name": "奥斯陆大教堂",
            "address": "Karl Johans gate 11, 0162 Oslo"
          }
        }
      ]
    }
  ]
}
```

**响应示例：**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "draft",
  "title": "挪威极光之旅",
  "coverImage": "https://example.com/cover.jpg",
  "startDate": "2024-12-01",
  "endDate": "2024-12-07",
  "durationDays": 7,
  "destination": "挪威",
  "summary": "追寻北极光的梦幻之旅",
  "templateId": "660e8400-e29b-41d4-a716-446655440001",
  "createdBy": "770e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "days": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "journeyId": "550e8400-e29b-41d4-a716-446655440000",
      "dayNumber": 1,
      "date": "2024-12-01",
      "title": "第一天：抵达奥斯陆",
      "summary": "抵达挪威首都，适应时差",
      "timeSlots": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440004",
          "dayId": "880e8400-e29b-41d4-a716-446655440003",
          "sequence": 1,
          "startTime": "09:00",
          "durationMinutes": 120,
          "type": "activity",
          "title": "参观奥斯陆大教堂"
        }
      ]
    }
  ]
}
```

**错误响应：**

```json
{
  "statusCode": 400,
  "message": ["title should not be empty"],
  "error": "Bad Request"
}
```

---

