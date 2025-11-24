# 行程接口文档 - 24. 创建准备任务模板

## 接口信息

**接口路径：** `POST /api/v1/journeys/preparation-profiles`

**接口描述：** 创建新的准备任务模板（仅管理员）

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "code": "iceland-general",
  "title": "冰岛通用准备任务",
  "tasks": [
    {
      "title": "确认护照有效期及前往冰岛是否需要签证/入境许可",
      "completed": false,
      "category": "preparation",
      "destination": "冰岛",
      "links": [
        {
          "label": "IATA 入境政策查询",
          "url": "https://www.iatatravelcentre.com/"
        }
      ]
    },
    {
      "title": "预订往返冰岛的核心交通（机票/火车），并关注托运行李政策",
      "completed": false,
      "category": "preparation",
      "destination": "冰岛",
      "links": [
        {
          "label": "OAG 行李政策汇总",
          "url": "https://www.oag.com/baggage-allowance"
        }
      ]
    }
  ]
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `code` | string | 是 | 模板代码（唯一标识，用于区分不同模板） |
| `title` | string | 是 | 模板标题 |
| `tasks` | array | 是 | 任务列表 |
| `tasks[].title` | string | 是 | 任务标题 |
| `tasks[].completed` | boolean | 否 | 是否完成（默认 false） |
| `tasks[].category` | string | 否 | 任务类别 |
| `tasks[].destination` | string | 否 | 目的地 |
| `tasks[].links` | array | 否 | 链接列表 |
| `tasks[].links[].label` | string | 是 | 链接标签 |
| `tasks[].links[].url` | string | 是 | 链接URL |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/preparation-profiles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "iceland-general",
    "title": "冰岛通用准备任务",
    "tasks": [
      {
        "title": "确认护照有效期及前往冰岛是否需要签证/入境许可",
        "category": "preparation",
        "destination": "冰岛",
        "links": [
          {
            "label": "IATA 入境政策查询",
            "url": "https://www.iatatravelcentre.com/"
          }
        ]
      }
    ]
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "profile-id-new-1",
    "code": "iceland-general",
    "title": "冰岛通用准备任务",
    "tasks": [
      {
        "title": "确认护照有效期及前往冰岛是否需要签证/入境许可",
        "completed": false,
        "category": "preparation",
        "destination": "冰岛",
        "links": [
          {
            "label": "IATA 入境政策查询",
            "url": "https://www.iatatravelcentre.com/"
          }
        ]
      }
    ],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "创建成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 创建的模板数据 |
| `data.id` | string | 模板ID（自动生成） |
| `data.code` | string | 模板代码 |
| `data.title` | string | 模板标题 |
| `data.tasks` | array | 任务列表 |
| `data.createdAt` | string | 创建时间（ISO 8601格式） |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |
| `message` | string | 响应消息 |

---

## 错误响应

### 400 Bad Request - 模板代码已存在

```json
{
  "statusCode": 400,
  "message": "模板代码已存在: iceland-general",
  "error": "Bad Request"
}
```

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "code must be a string",
    "code should not be empty",
    "title must be a string",
    "title should not be empty",
    "tasks must be an array"
  ],
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

## 使用示例

### JavaScript/TypeScript

```typescript
const newProfile = {
  code: 'iceland-general',
  title: '冰岛通用准备任务',
  tasks: [
    {
      title: '确认护照有效期及前往冰岛是否需要签证/入境许可',
      category: 'preparation',
      destination: '冰岛',
      links: [
        {
          label: 'IATA 入境政策查询',
          url: 'https://www.iatatravelcentre.com/',
        },
      ],
    },
    {
      title: '预订往返冰岛的核心交通（机票/火车），并关注托运行李政策',
      category: 'preparation',
      destination: '冰岛',
      links: [
        {
          label: 'OAG 行李政策汇总',
          url: 'https://www.oag.com/baggage-allowance',
        },
      ],
    },
  ],
};

const response = await fetch('/api/v1/journeys/preparation-profiles', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newProfile),
});

const result = await response.json();
if (result.success) {
  console.log('创建成功:', result.data);
}
```

---

## 注意事项

1. **权限控制**：当前实现中未严格验证管理员权限，未来可能需要添加管理员权限验证

2. **模板代码唯一性**：`code` 字段必须唯一，如果已存在相同代码的模板，会返回 400 错误

3. **任务格式**：任务格式与行程任务格式相同，但模板中的任务通常不包含 `id` 和 `createdAt` 字段（会在应用到行程时自动生成）

4. **用途**：创建的模板可以用于：
   - 在同步任务时作为参考
   - 通过 `POST /api/v1/journeys/:journeyId/tasks/sync?templateId=xxx` 直接应用到行程

5. **维护**：这些模板通常由管理员维护，用于标准化不同目的地的准备任务

