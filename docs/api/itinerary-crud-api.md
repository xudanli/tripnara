# 行程 CRUD API 文档

## 概述

行程 CRUD 接口用于管理用户创建的旅行行程，包括创建、查询、更新和删除操作。

**基础路径**: `/api/itinerary` (注意：应用已设置全局前缀 `api`，控制器路径为 `itinerary`)

**认证**: 所有接口都需要 JWT Bearer Token

---

## 1. 创建行程

### 接口信息

- **URL**: `POST /api/itinerary`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface CreateItineraryRequest {
  destination: string;        // 目的地，如 "瑞士琉森"
  startDate: string;          // 旅行开始日期，格式: "YYYY-MM-DD"
  days: number;              // 旅行天数，范围 1-30
  data: {                    // 行程数据
    days: Array<{            // 每天的行程
      id?: string;           // 天数ID（UUID，可选）
      day: number;           // 第几天，从1开始
      date: string;           // 日期，格式: "YYYY-MM-DD"
      activities: Array<{     // 活动列表
        time: string;         // 活动时间，格式: "HH:mm"
        title: string;        // 活动标题
        type: "attraction" | "meal" | "hotel" | "shopping" | "transport";
        duration: number;     // 持续时间（分钟）
        location: {           // 位置坐标
          lat: number;        // 纬度
          lng: number;        // 经度
        };
        notes: string;        // 活动描述和建议
        cost: number;         // 预估费用
      }>;
    }>;
    totalCost: number;        // 总费用
    summary: string;         // 行程摘要
  };
  preferences?: {            // 用户偏好（可选）
    interests?: string[];    // 兴趣列表
    budget?: "low" | "medium" | "high";
    travelStyle?: "relaxed" | "moderate" | "intensive";
  };
  status?: "draft" | "published" | "archived";  // 状态，默认 "draft"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 是 | 目的地名称 | `"瑞士琉森"` |
| `startDate` | string | 是 | 开始日期 (YYYY-MM-DD) | `"2024-06-01"` |
| `days` | number | 是 | 旅行天数，1-30 | `5` |
| `data` | object | 是 | 行程数据对象 | 见下方示例 |
| `data.days` | array | 是 | 每天的行程数组 | 见下方示例 |
| `data.totalCost` | number | 是 | 总费用 | `8000` |
| `data.summary` | string | 是 | 行程摘要 | `"5天琉森文化探索之旅..."` |
| `preferences` | object | 否 | 用户偏好 | `{ interests: ["自然风光"], budget: "medium" }` |
| `status` | string | 否 | 状态，默认 "draft" | `"draft"` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "daysCount": 5,
    "summary": "5天琉森文化探索之旅...",
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
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**400 Bad Request** - 请求参数错误
```json
{
  "statusCode": 400,
  "message": ["destination must be a string", "days must be a number"],
  "error": "Bad Request"
}
```

**401 Unauthorized** - 未认证
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/itinerary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "days": 5,
    "data": {
      "days": [
        {
          "id": "day-id-1",
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
              "notes": "登顶铁力士峰，欣赏阿尔卑斯山壮丽景色",
              "cost": 400
            }
          ]
        }
      ],
      "totalCost": 8000,
      "summary": "5天琉森文化探索之旅"
    },
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "status": "draft"
  }'
```

#### JavaScript (Fetch API)

```javascript
const response = await fetch('http://localhost:3000/api/itinerary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    destination: '瑞士琉森',
    startDate: '2024-06-01',
    days: 5,
    data: {
      days: [
        {
          id: 'day-id-1',
          day: 1,
          date: '2024-06-01',
          activities: [
            {
              time: '09:00',
              title: '铁力士峰云端漫步',
              type: 'attraction',
              duration: 120,
              location: {
                lat: 46.7704,
                lng: 8.4050
              },
              notes: '登顶铁力士峰，欣赏阿尔卑斯山壮丽景色',
              cost: 400
            }
          ]
        }
      ],
      totalCost: 8000,
      summary: '5天琉森文化探索之旅'
    },
    preferences: {
      interests: ['自然风光', '户外活动'],
      budget: 'medium',
      travelStyle: 'relaxed'
    },
    status: 'draft'
  })
});

const result = await response.json();
```

### 注意事项

1. **认证要求**: 必须提供有效的 JWT Token
2. **数据完整性**: `data.days` 数组中的天数必须与 `days` 参数一致
3. **日期格式**: 所有日期字段必须使用 `YYYY-MM-DD` 格式
4. **时间格式**: 活动时间必须使用 `HH:mm` 格式（24小时制）
5. **坐标范围**: 
   - 纬度 (lat): -90 到 90
   - 经度 (lng): -180 到 180
6. **活动类型**: 必须是以下之一：`attraction`, `meal`, `hotel`, `shopping`, `transport`
7. **状态值**: 必须是 `draft`, `published`, 或 `archived`，默认为 `draft`
8. **偏好格式**: `preferences` 可以接受数组格式（如 `["nature", "adventure"]`），会自动转换为对象格式

---

## 2. 获取行程列表

### 接口信息

- **URL**: `GET /api/itinerary`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 查询参数 (Query Parameters)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `status` | string | 否 | 筛选状态：`draft`, `published`, `archived` | `"draft"` |
| `page` | number | 否 | 页码，从1开始，默认 1 | `1` |
| `limit` | number | 否 | 每页数量，默认 10 | `10` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "destination": "瑞士琉森",
      "startDate": "2024-06-01",
      "days": 5,
      "summary": "5天琉森文化探索之旅...",
      "totalCost": 8000,
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "destination": "日本东京",
      "startDate": "2024-07-01",
      "days": 7,
      "summary": "7天东京都市探索之旅...",
      "totalCost": 12000,
      "status": "published",
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | array | 行程列表数组 |
| `data[].id` | string | 行程ID |
| `data[].destination` | string | 目的地 |
| `data[].startDate` | string | 开始日期 |
| `data[].days` | number | 旅行天数 |
| `data[].summary` | string | 行程摘要（可选） |
| `data[].totalCost` | number | 总费用（可选） |
| `data[].status` | string | 状态：`draft`, `published`, `archived` |
| `data[].createdAt` | string | 创建时间 |
| `data[].updatedAt` | string | 更新时间 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

#### 错误响应

**401 Unauthorized** - 未认证
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 请求示例

#### cURL

```bash
# 获取所有行程（默认第一页，每页10条）
curl -X GET "http://localhost:3000/api/itinerary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 获取草稿状态的行程
curl -X GET "http://localhost:3000/api/itinerary?status=draft" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 分页查询：第2页，每页20条
curl -X GET "http://localhost:3000/api/itinerary?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 组合查询：已发布的行程，第1页，每页15条
curl -X GET "http://localhost:3000/api/itinerary?status=published&page=1&limit=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript (Fetch API)

```javascript
// 获取所有行程
const response = await fetch('http://localhost:3000/api/itinerary', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 获取草稿状态的行程
const response = await fetch('http://localhost:3000/api/itinerary?status=draft', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 分页查询
const response = await fetch('http://localhost:3000/api/itinerary?page=2&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(`共 ${result.total} 条记录，当前第 ${result.page} 页`);
```

### 注意事项

1. **认证要求**: 必须提供有效的 JWT Token
2. **数据隔离**: 只能获取当前登录用户自己的行程
3. **分页参数**: 
   - `page` 从 1 开始，默认为 1
   - `limit` 默认为 10，建议不超过 100
4. **状态筛选**: 如果不提供 `status` 参数，将返回所有状态的行程
5. **排序**: 列表按创建时间倒序排列（最新的在前）
6. **空结果**: 如果没有匹配的行程，`data` 将返回空数组 `[]`

---

## 3. 获取行程详情

### 接口信息

- **URL**: `GET /api/itinerary/:id`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 路径参数 (Path Parameters)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | 是 | 行程ID (UUID) | `"550e8400-e29b-41d4-a716-446655440000"` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "daysCount": 5,
    "summary": "5天琉森文化探索之旅，从铁力士峰的云端漫步到琉森湖的湖光山色...",
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
            "notes": "登顶铁力士峰，欣赏阿尔卑斯山壮丽景色，体验云端漫步的刺激",
            "cost": 400
          },
          {
            "time": "14:00",
            "title": "琉森老城区漫步",
            "type": "attraction",
            "duration": 180,
            "location": {
              "lat": 47.0502,
              "lng": 8.3093
            },
            "notes": "探索琉森古城，参观卡佩尔桥和狮子纪念碑",
            "cost": 0
          }
        ]
      },
      {
        "id": "day-id-2",
        "day": 2,
        "date": "2024-06-02",
        "activities": [
          {
            "time": "10:00",
            "title": "琉森湖游船",
            "type": "attraction",
            "duration": 120,
            "location": {
              "lat": 47.0502,
              "lng": 8.3093
            },
            "notes": "乘坐游船欣赏琉森湖美景，感受湖光山色",
            "cost": 150
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
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 行程详情对象 |
| `data.id` | string | 行程ID |
| `data.destination` | string | 目的地 |
| `data.startDate` | string | 开始日期 |
| `data.daysCount` | number | 旅行天数 |
| `data.summary` | string | 行程摘要 |
| `data.totalCost` | number | 总费用 |
| `data.days` | array | 每天的行程详情 |
| `data.days[].id` | string | 天数ID（UUID） |
| `data.days[].day` | number | 第几天 |
| `data.days[].date` | string | 日期 |
| `data.days[].activities` | array | 活动列表 |
| `data.days[].activities[].time` | string | 活动时间 |
| `data.days[].activities[].title` | string | 活动标题 |
| `data.days[].activities[].type` | string | 活动类型 |
| `data.days[].activities[].duration` | number | 持续时间（分钟） |
| `data.days[].activities[].location` | object | 位置坐标 |
| `data.days[].activities[].notes` | string | 活动描述 |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.preferences` | object | 用户偏好 |
| `data.status` | string | 状态 |
| `data.createdAt` | string | 创建时间 |
| `data.updatedAt` | string | 更新时间 |

#### 错误响应

**400 Bad Request** - 无效的行程ID
```json
{
  "statusCode": 400,
  "message": "Invalid itinerary ID format"
}
```

**401 Unauthorized** - 未认证
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - 无权访问（不是自己的行程）
```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this itinerary"
}
```

**404 Not Found** - 行程不存在
```json
{
  "statusCode": 404,
  "message": "Itinerary not found"
}
```

### 请求示例

#### cURL

```bash
curl -X GET "http://localhost:3000/api/itinerary/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript (Fetch API)

```javascript
const itineraryId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`http://localhost:3000/api/itinerary/${itineraryId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('行程详情:', result.data);
} else if (response.status === 404) {
  console.log('行程不存在');
} else if (response.status === 403) {
  console.log('无权访问此行程');
}
```

### 注意事项

1. **认证要求**: 必须提供有效的 JWT Token
2. **数据隔离**: 只能获取当前登录用户自己的行程
3. **ID格式**: 行程ID必须是有效的UUID格式
4. **完整数据**: 返回的数据包含完整的行程信息，包括所有天数和活动详情
5. **排序**: `days` 数组按 `day` 字段升序排列，`activities` 数组按 `time` 字段升序排列
6. **权限检查**: 如果尝试访问其他用户的行程，将返回 403 Forbidden 错误

---

## 4. 更新行程

### 接口信息

- **URL**: `PATCH /api/itinerary/:id`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 路径参数 (Path Parameters)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | 是 | 行程ID (UUID) | `"550e8400-e29b-41d4-a716-446655440000"` |

#### 请求体 (Request Body)

所有字段都是可选的，只需要传递需要更新的字段：

```typescript
interface UpdateItineraryRequest {
  destination?: string;       // 目的地
  startDate?: string;         // 旅行开始日期，格式: "YYYY-MM-DD"
  days?: number;             // 旅行天数，范围 1-30
  summary?: string;          // 行程摘要
  totalCost?: number;         // 总费用
  preferences?: {             // 用户偏好
    interests?: string[];     // 兴趣列表
    budget?: "low" | "medium" | "high";
    travelStyle?: "relaxed" | "moderate" | "intensive";
  };
  status?: "draft" | "published" | "archived";  // 状态
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `destination` | string | 否 | 目的地名称 | `"日本东京"` |
| `startDate` | string | 否 | 开始日期 (YYYY-MM-DD) | `"2024-07-01"` |
| `days` | number | 否 | 旅行天数，1-30 | `7` |
| `summary` | string | 否 | 行程摘要 | `"7天东京都市探索之旅..."` |
| `totalCost` | number | 否 | 总费用 | `12000` |
| `preferences` | object | 否 | 用户偏好 | `{ interests: ["都市文化"], budget: "high" }` |
| `status` | string | 否 | 状态 | `"published"` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "destination": "日本东京",
    "startDate": "2024-07-01",
    "daysCount": 7,
    "summary": "7天东京都市探索之旅...",
    "totalCost": 12000,
    "days": [
      {
        "day": 1,
        "date": "2024-07-01",
        "activities": [...]
      }
    ],
    "preferences": {
      "interests": ["都市文化"],
      "budget": "high",
      "travelStyle": "moderate"
    },
    "status": "published",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### 错误响应

**400 Bad Request** - 请求参数错误
```json
{
  "statusCode": 400,
  "message": ["days must be a number", "status must be one of: draft, published, archived"],
  "error": "Bad Request"
}
```

**401 Unauthorized** - 未认证
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - 无权访问（不是自己的行程）
```json
{
  "statusCode": 403,
  "message": "You do not have permission to update this itinerary"
}
```

**404 Not Found** - 行程不存在
```json
{
  "statusCode": 404,
  "message": "Itinerary not found"
}
```

### 请求示例

#### cURL

```bash
# 更新目的地和状态
curl -X PATCH "http://localhost:3000/api/itinerary/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "日本东京",
    "status": "published"
  }'

# 更新总费用和摘要
curl -X PATCH "http://localhost:3000/api/itinerary/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "totalCost": 12000,
    "summary": "更新后的行程摘要"
  }'

# 更新偏好信息
curl -X PATCH "http://localhost:3000/api/itinerary/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "preferences": {
      "interests": ["都市文化", "美食"],
      "budget": "high",
      "travelStyle": "moderate"
    }
  }'
```

#### JavaScript (Fetch API)

```javascript
const itineraryId = '550e8400-e29b-41d4-a716-446655440000';

// 更新目的地和状态
const response = await fetch(`http://localhost:3000/api/itinerary/${itineraryId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    destination: '日本东京',
    status: 'published'
  })
});

if (response.ok) {
  const result = await response.json();
  console.log('更新成功:', result.data);
} else if (response.status === 404) {
  console.log('行程不存在');
} else if (response.status === 403) {
  console.log('无权更新此行程');
}
```

### 注意事项

1. **认证要求**: 必须提供有效的 JWT Token
2. **数据隔离**: 只能更新当前登录用户自己的行程
3. **部分更新**: 只需要传递需要更新的字段，未传递的字段将保持不变
4. **ID格式**: 行程ID必须是有效的UUID格式
5. **日期格式**: `startDate` 必须使用 `YYYY-MM-DD` 格式
6. **天数范围**: `days` 必须在 1-30 之间
7. **状态值**: `status` 必须是 `draft`, `published`, 或 `archived`
8. **偏好格式**: `preferences` 可以接受数组格式（如 `["nature", "adventure"]`），会自动转换为对象格式
9. **更新时间**: 更新成功后，`updatedAt` 字段会自动更新为当前时间
10. **权限检查**: 如果尝试更新其他用户的行程，将返回 403 Forbidden 错误

---

## 5. 删除行程

### 接口信息

- **URL**: `DELETE /api/itinerary/:id`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 路径参数 (Path Parameters)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | 是 | 行程ID (UUID) | `"550e8400-e29b-41d4-a716-446655440000"` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "行程已删除"
}
```

#### 错误响应

**400 Bad Request** - 无效的行程ID
```json
{
  "statusCode": 400,
  "message": "Invalid itinerary ID format"
}
```

**401 Unauthorized** - 未认证
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - 无权访问（不是自己的行程）
```json
{
  "statusCode": 403,
  "message": "You do not have permission to delete this itinerary"
}
```

**404 Not Found** - 行程不存在
```json
{
  "statusCode": 404,
  "message": "Itinerary not found"
}
```

### 请求示例

#### cURL

```bash
curl -X DELETE "http://localhost:3000/api/itinerary/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript (Fetch API)

```javascript
const itineraryId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`http://localhost:3000/api/itinerary/${itineraryId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('删除成功:', result.message);
} else if (response.status === 404) {
  console.log('行程不存在');
} else if (response.status === 403) {
  console.log('无权删除此行程');
}
```

### 注意事项

1. **认证要求**: 必须提供有效的 JWT Token
2. **数据隔离**: 只能删除当前登录用户自己的行程
3. **ID格式**: 行程ID必须是有效的UUID格式
4. **永久删除**: 删除操作是永久性的，无法恢复。请谨慎操作
5. **级联删除**: 删除行程时，会同时删除相关的天数（days）和活动（activities）数据
6. **权限检查**: 如果尝试删除其他用户的行程，将返回 403 Forbidden 错误
7. **删除确认**: 建议在前端实现删除确认对话框，避免误操作

---

## 总结

### 接口列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | `/api/itinerary` | 创建行程 | 创建新的旅行行程 |
| GET | `/api/itinerary` | 获取列表 | 获取用户的行程列表，支持分页和状态筛选 |
| GET | `/api/itinerary/:id` | 获取详情 | 获取指定行程的详细信息 |
| PATCH | `/api/itinerary/:id` | 更新行程 | 更新行程的部分或全部字段 |
| DELETE | `/api/itinerary/:id` | 删除行程 | 永久删除指定的行程 |

### 通用说明

1. **认证**: 所有接口都需要在请求头中携带 JWT Bearer Token
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

2. **数据隔离**: 所有操作都只能访问和操作当前登录用户自己的数据

3. **错误处理**: 
   - 400: 请求参数错误
   - 401: 未认证或Token无效
   - 403: 无权访问（不是自己的数据）
   - 404: 资源不存在

4. **日期格式**: 所有日期字段使用 `YYYY-MM-DD` 格式

5. **时间格式**: 活动时间使用 `HH:mm` 格式（24小时制）

6. **ID格式**: 所有ID字段使用UUID格式

7. **状态值**: 行程状态只能是 `draft`（草稿）、`published`（已发布）、`archived`（已归档）

### 最佳实践

1. **错误处理**: 在前端实现完善的错误处理逻辑，根据不同的HTTP状态码显示相应的错误提示
2. **加载状态**: 在请求过程中显示加载状态，提升用户体验
3. **数据验证**: 在发送请求前进行客户端数据验证，减少无效请求
4. **分页加载**: 对于列表接口，实现分页加载或无限滚动，避免一次性加载大量数据
5. **删除确认**: 删除操作前必须进行二次确认，避免误操作
6. **缓存策略**: 合理使用缓存，减少不必要的API请求

---

