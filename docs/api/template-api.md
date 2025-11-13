# 行程模版 API 接口文档

本文档提供行程模版（Template）相关的所有 API 接口说明，用于前端对接。

**基础路径：** `/api/v1/templates`

**认证：** 部分接口可能需要 JWT 认证（根据实际需求）

---

## 接口列表

### 1. 获取模版列表

**接口地址：** `GET /api/v1/templates`

**接口说明：** 查询模版列表，支持多种筛选条件

**请求参数（Query）：**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| status | string | 否 | 状态过滤：`draft`（草稿）、`published`（已发布）、`archived`（已归档）、`all`（全部） | `published` |
| mode | string | 否 | 模式过滤：`inspiration`（灵感）、`planner`（规划）、`seeker`（探索）、`all`（全部） | `inspiration` |
| modePrimary | string | 否 | 主模式分类过滤 | `极光之旅` |
| modeTags | string \| string[] | 否 | 模式标签过滤，支持逗号分隔的字符串或数组 | `极光,北欧` |
| keyword | string | 否 | 关键字搜索（搜索名称或摘要） | `挪威` |
| page | number | 否 | 页码，默认 1 | `1` |
| limit | number | 否 | 每页数量，默认 20 | `20` |

**请求示例：**

```bash
GET /api/v1/templates?status=published&mode=inspiration&page=1&limit=20
GET /api/v1/templates?keyword=挪威&modeTags=极光,北欧
```

**响应示例：**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "published",
      "mode": "inspiration",
      "modePrimary": "极光之旅",
      "modeTags": "极光,北欧,冬季",
      "title": "挪威北部极光追寻之旅",
      "coverImage": "https://example.com/cover.jpg",
      "durationDays": 7,
      "summary": "追寻北极光的梦幻之旅",
      "description": "详细描述...",
      "coreInsight": "核心洞察...",
      "safetyNoticeDefault": {},
      "journeyBackground": [],
      "personaProfile": {},
      "journeyDesign": {},
      "tasksDefault": [],
      "createdBy": null,
      "updatedBy": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | array | 模版列表数组 |
| total | number | 总记录数 |
| page | number | 当前页码 |
| limit | number | 每页数量 |

**模版对象字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 模版 ID（UUID） |
| status | string | 状态：`draft`、`published`、`archived` |
| mode | string | 模式：`inspiration`、`planner`、`seeker` |
| modePrimary | string | 主模式分类 |
| modeTags | string | 模式标签（逗号分隔） |
| title | string | 模版名称 |
| coverImage | string | 封面图链接 |
| durationDays | number | 推荐行程天数 |
| summary | string | 模版摘要 |
| description | string | 模版描述 |
| coreInsight | string | 核心洞察 |
| safetyNoticeDefault | object | 安全提示默认值（JSON） |
| journeyBackground | array | 旅程背景数组（JSON） |
| personaProfile | object | 人格画像（JSON） |
| journeyDesign | object | 旅程设计（JSON） |
| tasksDefault | array | 默认任务列表（JSON） |
| createdBy | string | 创建人 ID（UUID） |
| updatedBy | string | 更新人 ID（UUID） |
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

### 2. 获取模版详情

**接口地址：** `GET /api/v1/templates/:templateId`

**接口说明：** 获取指定模版的详细信息，包括所有天数和时段

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求示例：**

```bash
GET /api/v1/templates/550e8400-e29b-41d4-a716-446655440000
```

**响应示例：**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "published",
  "mode": "inspiration",
  "modePrimary": "极光之旅",
  "modeTags": "极光,北欧,冬季",
  "title": "挪威北部极光追寻之旅",
  "coverImage": "https://example.com/cover.jpg",
  "durationDays": 7,
  "summary": "追寻北极光的梦幻之旅",
  "description": "详细描述...",
  "coreInsight": "核心洞察...",
  "safetyNoticeDefault": {},
  "journeyBackground": [],
  "personaProfile": {},
  "journeyDesign": {},
  "tasksDefault": [],
  "createdBy": null,
  "updatedBy": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "days": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "templateId": "550e8400-e29b-41d4-a716-446655440000",
      "dayNumber": 1,
      "title": "第一天：抵达奥斯陆",
      "summary": "抵达挪威首都，适应时差",
      "detailsJson": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "timeSlots": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "dayId": "660e8400-e29b-41d4-a716-446655440001",
          "sequence": 1,
          "startTime": "09:00",
          "durationMinutes": 120,
          "type": "activity",
          "title": "参观奥斯陆大教堂",
          "activityHighlights": {},
          "scenicIntro": "介绍...",
          "locationJson": {
            "name": "奥斯陆大教堂",
            "address": "Karl Johans gate 11, 0162 Oslo"
          },
          "detailsJson": {},
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

**响应字段说明：**

响应包含模版基本信息以及 `days` 数组，每个 `day` 包含：
- `id`: 天数 ID（UUID）
- `templateId`: 所属模版 ID
- `dayNumber`: 天数序号（从 1 开始）
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
- `activityHighlights`: 亮点信息（JSON）
- `scenicIntro`: 风景介绍
- `locationJson`: 位置信息（JSON）
- `detailsJson`: 自定义详情（JSON）

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 3. 创建模版

**接口地址：** `POST /api/v1/templates`

**接口说明：** 创建新的行程模版

**请求体（JSON）：**

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| title | string | 是 | 模版名称（最大 255 字符） | `挪威北部极光追寻之旅` |
| coverImage | string | 否 | 封面图链接 | `https://example.com/cover.jpg` |
| durationDays | number | 否 | 推荐行程天数（最小 1） | `7` |
| summary | string | 否 | 模版摘要 | `追寻北极光的梦幻之旅` |
| description | string | 否 | 模版描述 | `详细描述...` |
| coreInsight | string | 否 | 核心洞察 | `核心洞察...` |
| status | string | 否 | 状态：`draft`、`published`、`archived`，默认 `draft` | `draft` |
| mode | string | 否 | 模式：`inspiration`、`planner`、`seeker`，默认 `inspiration` | `inspiration` |
| modePrimary | string | 否 | 主模式分类（最大 50 字符） | `极光之旅` |
| modeTags | string | 否 | 模式标签（逗号分隔，最大 255 字符） | `极光,北欧,冬季` |
| safetyNoticeDefault | object | 否 | 安全提示默认值（JSON） | `{}` |
| journeyBackground | array | 否 | 旅程背景数组（JSON） | `[]` |
| personaProfile | object | 否 | 人格画像（JSON） | `{}` |
| journeyDesign | object | 否 | 旅程设计（JSON） | `{}` |
| tasksDefault | array | 否 | 默认任务列表（JSON） | `[]` |
| days | array | 否 | 日程结构数组（见下方说明） | 见示例 |

**days 数组项结构（TemplateDayDto）：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dayNumber | number | 是 | 天数序号（从 1 开始，最小 1） |
| title | string | 否 | 标题（最大 255 字符） |
| summary | string | 否 | 摘要 |
| detailsJson | object | 否 | 详情 JSON |
| timeSlots | array | 否 | 时段列表（见下方说明） |

**timeSlots 数组项结构（TemplateTimeSlotDto）：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sequence | number | 是 | 序号（从 1 开始，最小 1） |
| startTime | string | 否 | 开始时间（HH:mm 格式） |
| durationMinutes | number | 否 | 持续时间（分钟，最小 0） |
| type | string | 否 | 类型（最大 50 字符），如 `transport`、`activity`、`meal` |
| title | string | 否 | 标题（最大 255 字符） |
| activityHighlights | object | 否 | 亮点信息（JSON） |
| scenicIntro | string | 否 | 风景介绍 |
| locationJson | object | 否 | 位置信息（JSON） |
| detailsJson | object | 否 | 自定义详情（JSON） |

**请求示例：**

```json
{
  "title": "挪威北部极光追寻之旅",
  "coverImage": "https://example.com/cover.jpg",
  "durationDays": 7,
  "summary": "追寻北极光的梦幻之旅",
  "description": "详细描述...",
  "mode": "inspiration",
  "modePrimary": "极光之旅",
  "modeTags": "极光,北欧,冬季",
  "days": [
    {
      "dayNumber": 1,
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
  "mode": "inspiration",
  "title": "挪威北部极光追寻之旅",
  "coverImage": "https://example.com/cover.jpg",
  "durationDays": 7,
  "summary": "追寻北极光的梦幻之旅",
  "description": "详细描述...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "days": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "templateId": "550e8400-e29b-41d4-a716-446655440000",
      "dayNumber": 1,
      "title": "第一天：抵达奥斯陆",
      "summary": "抵达挪威首都，适应时差",
      "timeSlots": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "dayId": "660e8400-e29b-41d4-a716-446655440001",
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

### 4. 更新模版

**接口地址：** `PATCH /api/v1/templates/:templateId`

**接口说明：** 更新模版信息（支持部分更新）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求体（JSON）：**

所有字段均为可选，只传递需要更新的字段即可。字段结构与创建模版接口相同（见接口 3）。

**请求示例：**

```json
{
  "title": "更新后的模版名称",
  "status": "published",
  "summary": "更新后的摘要"
}
```

**响应示例：**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "published",
  "mode": "inspiration",
  "title": "更新后的模版名称",
  "coverImage": "https://example.com/cover.jpg",
  "durationDays": 7,
  "summary": "更新后的摘要",
  "description": "详细描述...",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 5. 删除模版

**接口地址：** `DELETE /api/v1/templates/:templateId`

**接口说明：** 删除指定的模版（级联删除关联的天数和时段）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求示例：**

```bash
DELETE /api/v1/templates/550e8400-e29b-41d4-a716-446655440000
```

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 6. 发布模版

**接口地址：** `POST /api/v1/templates/:templateId/publish`

**接口说明：** 将模版状态更新为 `published`（已发布）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求示例：**

```bash
POST /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/publish
```

**响应示例：**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "published",
  "mode": "inspiration",
  "title": "挪威北部极光追寻之旅",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 7. 复制模版

**接口地址：** `POST /api/v1/templates/:templateId/clone`

**接口说明：** 复制指定的模版，创建新的草稿模版（状态为 `draft`，标题自动添加 " Copy" 后缀）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求示例：**

```bash
POST /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/clone
```

**响应示例：**

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "status": "draft",
  "mode": "inspiration",
  "title": "挪威北部极光追寻之旅 Copy",
  "coverImage": "https://example.com/cover.jpg",
  "durationDays": 7,
  "summary": "追寻北极光的梦幻之旅",
  "createdAt": "2024-01-02T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "days": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "templateId": "880e8400-e29b-41d4-a716-446655440000",
      "dayNumber": 1,
      "title": "第一天：抵达奥斯陆",
      "timeSlots": [
        {
          "id": "aa0e8400-e29b-41d4-a716-446655440002",
          "dayId": "990e8400-e29b-41d4-a716-446655440001",
          "sequence": 1,
          "startTime": "09:00",
          "type": "activity",
          "title": "参观奥斯陆大教堂"
        }
      ]
    }
  ]
}
```

**说明：**
- 新模版的 `id` 会重新生成
- 状态自动设置为 `draft`
- 标题自动添加 " Copy" 后缀
- 所有关联的天数和时段都会被复制

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 8. 获取模版天数列表

**接口地址：** `GET /api/v1/templates/:templateId/days`

**接口说明：** 获取指定模版的所有天数列表（按 `dayNumber` 升序排列）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求示例：**

```bash
GET /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/days
```

**响应示例：**

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "templateId": "550e8400-e29b-41d4-a716-446655440000",
    "dayNumber": 1,
    "title": "第一天：抵达奥斯陆",
    "summary": "抵达挪威首都，适应时差",
    "detailsJson": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "templateId": "550e8400-e29b-41d4-a716-446655440000",
    "dayNumber": 2,
    "title": "第二天：奥斯陆市区游览",
    "summary": "探索奥斯陆的经典景点",
    "detailsJson": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 天数 ID（UUID） |
| templateId | string | 所属模版 ID |
| dayNumber | number | 天数序号（从 1 开始） |
| title | string | 天数标题 |
| summary | string | 天数摘要 |
| detailsJson | object | 详情 JSON |
| createdAt | string | 创建时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 9. 创建模版天数

**接口地址：** `POST /api/v1/templates/:templateId/days`

**接口说明：** 为指定模版创建新的天数

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |

**请求体（JSON）：**

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| dayNumber | number | 否 | 天数序号（从 1 开始，最小 1）。如果不提供，自动设置为当前最大序号 + 1 | `3` |
| title | string | 否 | 标题（最大 255 字符） | `第三天：前往特罗姆瑟` |
| summary | string | 否 | 摘要 | `乘坐飞机前往特罗姆瑟` |
| detailsJson | object | 否 | 详情 JSON | `{}` |
| timeSlots | array | 否 | 时段列表（可选，见接口 3 的 timeSlots 结构） | 见示例 |

**请求示例：**

```json
{
  "dayNumber": 3,
  "title": "第三天：前往特罗姆瑟",
  "summary": "乘坐飞机前往特罗姆瑟，开始极光之旅",
  "timeSlots": [
    {
      "sequence": 1,
      "startTime": "08:00",
      "durationMinutes": 60,
      "type": "transport",
      "title": "前往机场"
    },
    {
      "sequence": 2,
      "startTime": "10:00",
      "durationMinutes": 90,
      "type": "transport",
      "title": "飞往特罗姆瑟"
    }
  ]
}
```

**响应示例：**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440003",
  "templateId": "550e8400-e29b-41d4-a716-446655440000",
  "dayNumber": 3,
  "title": "第三天：前往特罗姆瑟",
  "summary": "乘坐飞机前往特罗姆瑟，开始极光之旅",
  "detailsJson": {},
  "createdAt": "2024-01-02T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "timeSlots": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "dayId": "660e8400-e29b-41d4-a716-446655440003",
      "sequence": 1,
      "startTime": "08:00",
      "durationMinutes": 60,
      "type": "transport",
      "title": "前往机场"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "dayId": "660e8400-e29b-41d4-a716-446655440003",
      "sequence": 2,
      "startTime": "10:00",
      "durationMinutes": 90,
      "type": "transport",
      "title": "飞往特罗姆瑟"
    }
  ]
}
```

**错误响应：**

```json
{
  "statusCode": 400,
  "message": "dayNumber 已存在，请调整序号",
  "error": "Bad Request"
}
```

或

```json
{
  "statusCode": 404,
  "message": "模板不存在",
  "error": "Not Found"
}
```

---

### 10. 更新模版天数

**接口地址：** `PATCH /api/v1/templates/:templateId/days/:dayId`

**接口说明：** 更新指定天数的信息（支持部分更新）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |

**请求体（JSON）：**

所有字段均为可选，字段结构与创建天数接口相同（见接口 9）。

**请求示例：**

```json
{
  "title": "更新后的天数标题",
  "summary": "更新后的摘要"
}
```

**响应示例：**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "templateId": "550e8400-e29b-41d4-a716-446655440000",
  "dayNumber": 1,
  "title": "更新后的天数标题",
  "summary": "更新后的摘要",
  "detailsJson": {},
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板日程不存在",
  "error": "Not Found"
}
```

或

```json
{
  "statusCode": 400,
  "message": "目标 dayNumber 已存在",
  "error": "Bad Request"
}
```

---

### 11. 删除模版天数

**接口地址：** `DELETE /api/v1/templates/:templateId/days/:dayId`

**接口说明：** 删除指定的天数（级联删除关联的时段）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |

**请求示例：**

```bash
DELETE /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/days/660e8400-e29b-41d4-a716-446655440001
```

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板日程不存在",
  "error": "Not Found"
}
```

---

### 12. 获取模版时段列表

**接口地址：** `GET /api/v1/templates/:templateId/days/:dayId/slots`

**接口说明：** 获取指定天数的所有时段列表（按 `sequence` 升序排列）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |

**请求示例：**

```bash
GET /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/days/660e8400-e29b-41d4-a716-446655440001/slots
```

**响应示例：**

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "dayId": "660e8400-e29b-41d4-a716-446655440001",
    "sequence": 1,
    "startTime": "09:00",
    "durationMinutes": 120,
    "type": "activity",
    "title": "参观奥斯陆大教堂",
    "activityHighlights": {},
    "scenicIntro": "奥斯陆大教堂是挪威国教路德宗的主教座堂",
    "locationJson": {
      "name": "奥斯陆大教堂",
      "address": "Karl Johans gate 11, 0162 Oslo",
      "latitude": 59.9139,
      "longitude": 10.7522
    },
    "detailsJson": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "dayId": "660e8400-e29b-41d4-a716-446655440001",
    "sequence": 2,
    "startTime": "12:00",
    "durationMinutes": 60,
    "type": "meal",
    "title": "午餐",
    "locationJson": {
      "name": "Fjord Restaurant",
      "address": "Stranden 1, 0250 Oslo"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 时段 ID（UUID） |
| dayId | string | 所属天数 ID |
| sequence | number | 序号（从 1 开始） |
| startTime | string | 开始时间（HH:mm 格式） |
| durationMinutes | number | 持续时间（分钟） |
| type | string | 类型（如 `transport`、`activity`、`meal`） |
| title | string | 标题 |
| activityHighlights | object | 亮点信息（JSON） |
| scenicIntro | string | 风景介绍 |
| locationJson | object | 位置信息（JSON），通常包含 `name`、`address`、`latitude`、`longitude` 等 |
| detailsJson | object | 自定义详情（JSON） |
| createdAt | string | 创建时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板日程不存在",
  "error": "Not Found"
}
```

---

### 13. 创建模版时段

**接口地址：** `POST /api/v1/templates/:templateId/days/:dayId/slots`

**接口说明：** 为指定天数创建新的时段

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |

**请求体（JSON）：**

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| sequence | number | 是 | 序号（从 1 开始，最小 1） | `3` |
| startTime | string | 否 | 开始时间（HH:mm 格式） | `14:00` |
| durationMinutes | number | 否 | 持续时间（分钟，最小 0） | `90` |
| type | string | 否 | 类型（最大 50 字符），如 `transport`、`activity`、`meal` | `activity` |
| title | string | 否 | 标题（最大 255 字符） | `参观维京船博物馆` |
| activityHighlights | object | 否 | 亮点信息（JSON） | `{"highlight1": "..."}` |
| scenicIntro | string | 否 | 风景介绍 | `介绍...` |
| locationJson | object | 否 | 位置信息（JSON） | `{"name": "...", "address": "..."}` |
| detailsJson | object | 否 | 自定义详情（JSON） | `{}` |

**请求示例：**

```json
{
  "sequence": 3,
  "startTime": "14:00",
  "durationMinutes": 90,
  "type": "activity",
  "title": "参观维京船博物馆",
  "scenicIntro": "了解维京时代的历史和文化",
  "locationJson": {
    "name": "维京船博物馆",
    "address": "Huk Aveny 35, 0287 Oslo",
    "latitude": 59.9042,
    "longitude": 10.6844
  }
}
```

**响应示例：**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440004",
  "dayId": "660e8400-e29b-41d4-a716-446655440001",
  "sequence": 3,
  "startTime": "14:00",
  "durationMinutes": 90,
  "type": "activity",
  "title": "参观维京船博物馆",
  "activityHighlights": null,
  "scenicIntro": "了解维京时代的历史和文化",
  "locationJson": {
    "name": "维京船博物馆",
    "address": "Huk Aveny 35, 0287 Oslo",
    "latitude": 59.9042,
    "longitude": 10.6844
  },
  "detailsJson": null,
  "createdAt": "2024-01-02T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 400,
  "message": "sequence 已存在，请调整序号",
  "error": "Bad Request"
}
```

或

```json
{
  "statusCode": 404,
  "message": "模板日程不存在",
  "error": "Not Found"
}
```

---

### 14. 更新模版时段

**接口地址：** `PATCH /api/v1/templates/:templateId/days/:dayId/slots/:slotId`

**接口说明：** 更新指定时段的信息（支持部分更新）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |
| slotId | string | 是 | 时段 ID（UUID） |

**请求体（JSON）：**

所有字段均为可选，字段结构与创建时段接口相同（见接口 13）。

**请求示例：**

```json
{
  "title": "更新后的时段标题",
  "durationMinutes": 120,
  "locationJson": {
    "name": "新地点",
    "address": "新地址"
  }
}
```

**响应示例：**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "dayId": "660e8400-e29b-41d4-a716-446655440001",
  "sequence": 1,
  "startTime": "09:00",
  "durationMinutes": 120,
  "type": "activity",
  "title": "更新后的时段标题",
  "locationJson": {
    "name": "新地点",
    "address": "新地址"
  },
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板时段不存在",
  "error": "Not Found"
}
```

或

```json
{
  "statusCode": 400,
  "message": "目标 sequence 已存在",
  "error": "Bad Request"
}
```

---

### 15. 删除模版时段

**接口地址：** `DELETE /api/v1/templates/:templateId/days/:dayId/slots/:slotId`

**接口说明：** 删除指定的时段

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| templateId | string | 是 | 模版 ID（UUID） |
| dayId | string | 是 | 天数 ID（UUID） |
| slotId | string | 是 | 时段 ID（UUID） |

**请求示例：**

```bash
DELETE /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/days/660e8400-e29b-41d4-a716-446655440001/slots/770e8400-e29b-41d4-a716-446655440002
```

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

```json
{
  "statusCode": 404,
  "message": "模板时段不存在",
  "error": "Not Found"
}
```

---

## 附录

### 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 数据格式说明

1. **时间格式：** 所有时间字段使用 ISO 8601 格式（如 `2024-01-01T00:00:00.000Z`），时段开始时间使用 `HH:mm` 格式（如 `09:00`）
2. **UUID 格式：** 所有 ID 字段使用 UUID v4 格式（如 `550e8400-e29b-41d4-a716-446655440000`）
3. **JSON 字段：** `detailsJson`、`locationJson`、`activityHighlights` 等字段为 JSONB 类型，可以存储任意 JSON 对象
4. **分页：** 列表接口支持 `page` 和 `limit` 参数，响应中包含 `total`、`page`、`limit` 字段

### 注意事项

1. 删除模版时会级联删除所有关联的天数和时段
2. 删除天数时会级联删除所有关联的时段
3. 创建或更新天数/时段时，`dayNumber`/`sequence` 必须唯一
4. 模版状态为 `published` 时，建议谨慎修改，避免影响已创建的行程
5. 复制模版时，所有关联数据都会被复制，但 ID 会重新生成

---

