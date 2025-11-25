# 行程 V1 API 接口详细文档

本文档提供 `/api/v1/journeys` 相关的所有 API 接口详细说明，用于前端对接。

**基础路径：** `/api/v1/journeys`

**认证：** 所有接口都需要 JWT 认证（Bearer Token）

---

## 目录

### 基础 CRUD 接口
1. [获取行程列表](#1-获取行程列表)
2. [创建行程](./journey-api-02-create.md) - 完整文档
3. [从前端数据格式创建行程](#3-从前端数据格式创建行程)
4. [获取行程详情](#4-获取行程详情)
5. [更新行程元信息](#5-更新行程元信息)
6. [从前端数据格式更新行程](#6-从前端数据格式更新行程)
7. [删除行程](#7-删除行程)

### 天数管理接口
8. [获取行程的所有天数](#8-获取行程的所有天数)
9. [为行程添加天数](#9-为行程添加天数)
10. [更新指定天数](#10-更新指定天数)
11. [删除指定天数](#11-删除指定天数)

### 活动（时间段）管理接口
12. [获取指定天数的所有时间段](#12-获取指定天数的所有时间段)
13. [为指定天数添加时间段](#13-为指定天数添加时间段)
14. [更新指定时间段](#14-更新指定时间段)
15. [删除指定时间段](#15-删除指定时间段)
16. [重新排序时间段](#16-重新排序时间段)

### 预算管理接口
33. [获取支出列表](#33-获取支出列表)
34. [创建支出](#34-创建支出)
35. [更新支出](#35-更新支出)
36. [删除支出](#36-删除支出)

---

## 1. 获取行程列表

**接口地址：** `GET /api/v1/journeys`

**接口说明：** 获取当前登录用户的行程列表，支持分页和状态筛选

**认证：** 需要 JWT 认证

**请求参数（Query）：**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| status | string | 否 | 按状态过滤：`draft`（草稿）、`published`（已发布）、`archived`（已归档） | `published` |
| page | number | 否 | 页码，默认 1 | `1` |
| limit | number | 否 | 每页数量，默认 20 | `20` |

**请求示例：**

```bash
GET /api/v1/journeys?status=published&page=1&limit=20
Authorization: Bearer <your-jwt-token>
```

**响应示例：**

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "destination": "冰岛",
      "startDate": "2025-11-24",
      "daysCount": 5,
      "summary": "冰岛之旅",
      "totalCost": 88400,
      "status": "published",
      "preferences": {
        "interests": ["nature", "adventure"],
        "budget": "medium",
        "travelStyle": "moderate"
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
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
| data[].id | string | 行程 ID（UUID） |
| data[].userId | string | 用户 ID（UUID） |
| data[].destination | string | 目的地 |
| data[].startDate | string | 开始日期（YYYY-MM-DD） |
| data[].daysCount | number | 行程天数 |
| data[].summary | string | 行程摘要 |
| data[].totalCost | number | 总费用 |
| data[].status | string | 状态：`draft`、`published`、`archived` |
| data[].preferences | object | 用户偏好设置 |
| data[].createdAt | string | 创建时间（ISO 8601） |
| data[].updatedAt | string | 更新时间（ISO 8601） |
| total | number | 总记录数 |
| page | number | 当前页码 |
| limit | number | 每页数量 |

**错误响应：**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 2. 创建行程

**接口地址：** `POST /api/v1/journeys`

**接口说明：** 创建一个新的行程，可带 templateId、用户偏好、AI 生成参数

**认证：** 需要 JWT 认证

**请求体（Body）：**

```json
{
  "destination": "冰岛",
  "startDate": "2025-11-24",
  "days": 5,
  "summary": "冰岛之旅",
  "totalCost": 88400,
  "preferences": {
    "interests": ["nature", "adventure"],
    "budget": "medium",
    "travelStyle": "moderate"
  },
  "status": "draft",
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "activities": [
          {
            "time": "09:00",
            "title": "抵达雷克雅未克",
            "type": "transport",
            "duration": 120,
            "location": { "lat": 64.1466, "lng": -21.9426 },
            "notes": "从机场到酒店",
            "cost": 5000
          }
        ]
      }
    ]
  }
}
```

**请求字段说明：**

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| destination | string | 是 | 目的地 | `"冰岛"` |
| startDate | string | 是 | 开始日期（YYYY-MM-DD） | `"2025-11-24"` |
| days | number | 否 | 行程天数（1-30） | `5` |
| summary | string | 否 | 行程摘要 | `"冰岛之旅"` |
| totalCost | number | 否 | 总费用 | `88400` |
| preferences | object | 否 | 用户偏好设置 | 见下方 |
| status | string | 否 | 状态：`draft`、`published`、`archived`，默认 `draft` | `"draft"` |
| data | object | 否 | 行程详细数据 | 见下方 |

**preferences 对象字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| interests | string[] | 兴趣列表 |
| budget | string | 预算等级：`low`、`medium`、`high` |
| travelStyle | string | 旅行风格：`relaxed`、`moderate`、`intensive` |

**data.days 数组元素字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| day | number | 第几天 |
| date | string | 日期（YYYY-MM-DD） |
| activities | array | 活动列表 |

**activities 数组元素字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| time | string | 活动时间（HH:MM） |
| title | string | 活动标题 |
| type | string | 活动类型：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` |
| duration | number | 持续时间（分钟） |
| location | object | 位置坐标 `{ lat: number, lng: number }` |
| notes | string | 活动描述和建议 |
| cost | number | 预估费用 |

**请求示例：**

```bash
POST /api/v1/journeys
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "destination": "冰岛",
  "startDate": "2025-11-24",
  "days": 5,
  "summary": "冰岛之旅",
  "data": {
    "days": []
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "冰岛",
    "startDate": "2025-11-24",
    "daysCount": 5,
    "summary": "冰岛之旅",
    "totalCost": 0,
    "status": "draft",
    "preferences": {
      "interests": [],
      "budget": "medium",
      "travelStyle": "moderate"
    },
    "days": [],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**错误响应：**

```json
{
  "statusCode": 400,
  "message": ["destination should not be empty"],
  "error": "Bad Request"
}
```

---

## 3. 从前端数据格式创建行程

**接口地址：** `POST /api/v1/journeys/from-frontend-data`

**接口说明：** 接受前端提供的完整行程数据格式（包含 itineraryData 和 tasks），自动转换为标准格式并创建行程

**认证：** 需要 JWT 认证

**请求体（Body）：**

```json
{
  "itineraryData": {
    "destination": "冰岛",
    "duration": 5,
    "budget": "medium",
    "preferences": ["nature", "adventure"],
    "travelStyle": "moderate",
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "timeSlots": [
          {
            "time": "09:00",
            "title": "抵达雷克雅未克",
            "activity": "抵达雷克雅未克",
            "type": "transport",
            "coordinates": { "lat": 64.1466, "lng": -21.9426 },
            "notes": "从机场到酒店",
            "cost": 5000,
            "duration": 120
          }
        ]
    ],
    "totalCost": 88400,
    "summary": "冰岛之旅",
    "title": "冰岛之旅"
  },
  "startDate": "2025-11-24",
  "tasks": []
}
```

**请求字段说明：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| itineraryData | object | 是 | 前端行程数据对象 |
| itineraryData.destination | string | 是 | 目的地 |
| itineraryData.duration | number | 是 | 行程天数 |
| itineraryData.days | array | 是 | 天数数组（包含 timeSlots） |
| itineraryData.days[].day | number | 是 | 第几天 |
| itineraryData.days[].date | string | 是 | 日期（YYYY-MM-DD） |
| itineraryData.days[].timeSlots | array | 是 | 时间段数组 |
| startDate | string | 否 | 开始日期（如果未提供，将使用第一天的日期） |
| tasks | array | 否 | 任务列表（当前不保存） |

**timeSlots 数组元素字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| time | string | 活动时间（HH:MM） |
| title | string | 活动标题 |
| activity | string | 活动名称（备用，会映射到 title） |
| type | string | 活动类型：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` |
| coordinates | object | 位置坐标 `{ lat: number, lng: number }` |
| notes | string | 活动描述和建议 |
| cost | number | 预估费用 |
| duration | number | 持续时间（分钟） |

**请求示例：**

```bash
POST /api/v1/journeys/from-frontend-data
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "itineraryData": {
    "destination": "冰岛",
    "duration": 5,
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "timeSlots": []
      }
    ],
    "title": "冰岛之旅"
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "冰岛",
    "startDate": "2025-11-24",
    "daysCount": 5,
    "summary": "",
    "totalCost": 0,
    "status": "draft",
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "activities": []
      }
    ],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**注意：** 前端数据中的 `timeSlots` 会自动转换为 `activities`，`coordinates` 会转换为 `location`。

---

## 4. 获取行程详情

**接口地址：** `GET /api/v1/journeys/:journeyId`

**接口说明：** 根据 ID 获取完整的行程详情，包含所有天数和活动信息

**认证：** 需要 JWT 认证

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| journeyId | string | 是 | 行程 ID（UUID） |

**请求示例：**

```bash
GET /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <your-jwt-token>
```

**响应示例：**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "destination": "冰岛",
  "startDate": "2025-11-24",
  "daysCount": 5,
  "summary": "冰岛之旅",
  "totalCost": 88400,
  "status": "published",
  "preferences": {
    "interests": ["nature", "adventure"],
    "budget": "medium",
    "travelStyle": "moderate"
  },
  "days": [
    {
      "day": 1,
      "date": "2025-11-24",
      "activities": [
        {
          "time": "09:00",
          "title": "抵达雷克雅未克",
          "type": "transport",
          "duration": 120,
          "location": { "lat": 64.1466, "lng": -21.9426 },
          "notes": "从机场到酒店",
          "cost": 5000
        }
      ]
    }
  ],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "行程不存在: 770e8400-e29b-41d4-a716-446655440000",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 403,
  "message": "无权访问此行程",
  "error": "Forbidden"
}
```

---

## 5. 更新行程元信息

**接口地址：** `PATCH /api/v1/journeys/:journeyId`

**接口说明：** 更新行程的基本信息（destination、startDate、days、summary、totalCost、preferences、status）

**认证：** 需要 JWT 认证

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| journeyId | string | 是 | 行程 ID（UUID） |

**请求体（Body）：**

```json
{
  "destination": "挪威",
  "startDate": "2025-12-01",
  "days": 7,
  "summary": "挪威极光之旅",
  "totalCost": 120000,
  "status": "published"
}
```

**请求字段说明：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| destination | string | 否 | 目的地 |
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| days | number | 否 | 行程天数（1-30），无效值会被忽略 |
| summary | string | 否 | 行程摘要 |
| totalCost | number | 否 | 总费用 |
| preferences | object | 否 | 用户偏好设置 |
| status | string | 否 | 状态：`draft`、`published`、`archived` |

**请求示例：**

```bash
PATCH /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "summary": "更新后的行程摘要",
  "status": "published"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "冰岛",
    "startDate": "2025-11-24",
    "daysCount": 5,
    "summary": "更新后的行程摘要",
    "totalCost": 88400,
    "status": "published",
    "preferences": {
      "interests": ["nature", "adventure"],
      "budget": "medium",
      "travelStyle": "moderate"
    },
    "days": [],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**注意：** 此接口只更新行程的元信息，不会更新 `days` 数组的详细内容（activities）。如需更新详细内容，请使用 `PATCH /api/v1/journeys/:journeyId/from-frontend-data`。

---

