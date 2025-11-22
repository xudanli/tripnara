# 行程模版接口文档 - 7. 复制行程模版

## 接口信息

**接口路径：** `POST /api/v1/itineraries/{id}/clone`

**接口描述：** 复制指定的行程模版，创建一个新的草稿模版

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 行程模版ID |

---

## 请求示例

```
POST /api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000/clone
```

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000/clone" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "987e6543-e21b-43d2-b654-321876543210",
    "status": "draft",
    "language": "zh-CN",
    "itineraryData": {
      "title": "冰岛之旅（副本）",
      "destination": "冰岛",
      "duration": 5,
      "budget": "medium",
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
    "createdAt": "2025-01-15T12:30:00Z",
    "updatedAt": "2025-01-15T12:30:00Z"
  },
  "message": "复制成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 新创建的行程模版数据 |
| `data.id` | string | 新行程模版ID（与原模版不同） |
| `data.status` | string | 状态（固定为 `draft`） |
| `data.language` | string | 语言代码 |
| `data.itineraryData` | object | 行程数据（与原模版相同） |
| `data.itineraryData.title` | string | 标题（自动添加"（副本）"后缀） |
| `data.tasks` | array | 任务列表（与原模版相同） |
| `data.createdAt` | string | 创建时间（当前时间） |
| `data.updatedAt` | string | 更新时间（当前时间） |
| `message` | string | 响应消息 |

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

const response = await fetch(`/api/v1/itineraries/${itineraryId}/clone`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
if (result.success) {
  console.log('复制成功，新模版ID:', result.data.id);
  console.log('新标题:', result.data.itineraryData.title);
  // 输出: "冰岛之旅（副本）"
}
```

### 复制并立即编辑示例

```typescript
async function cloneAndEdit(itineraryId: string) {
  // 复制模版
  const cloneResponse = await fetch(`/api/v1/itineraries/${itineraryId}/clone`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const cloneResult = await cloneResponse.json();
  if (!cloneResult.success) {
    console.error('复制失败');
    return;
  }

  const newId = cloneResult.data.id;

  // 立即更新复制的模版
  const updateResponse = await fetch(`/api/v1/itineraries/${newId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: '我的新行程',
      totalCost: 3000,
    }),
  });

  const updateResult = await updateResponse.json();
  if (updateResult.success) {
    console.log('复制并更新成功');
  }
}
```

---

## 注意事项

1. **新ID生成**：复制的模版会生成新的ID，与原模版ID不同
2. **标题处理**：
   - 如果原标题不包含"（副本）"后缀，会自动添加
   - 如果原标题已包含"（副本）"后缀，则保持不变
3. **状态重置**：复制的模版状态自动设置为 `draft`（草稿），无论原模版是什么状态
4. **时间戳重置**：创建时间和更新时间会重置为当前时间
5. **完整复制**：会复制所有数据，包括天数、活动、任务等
6. **权限控制**：只能复制当前登录用户自己的行程模版
7. **用途**：适用于基于现有模版创建新行程，或保存模版的不同版本

