# 行程模版接口文档 - 4. 更新行程模版

## 接口信息

**接口路径：** `PUT /api/v1/itineraries/{id}`

**接口描述：** 更新已有的行程模版，所有字段都是可选的，只传入需要更新的字段即可

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 行程模版ID |

---

## 请求参数

请求体格式与创建接口相同，所有字段都是可选的，只传入需要更新的字段即可。

### 请求体示例

```json
{
  "title": "更新后的冰岛之旅",
  "duration": 7,
  "totalCost": 2500,
  "summary": "更新后的行程摘要",
  "status": "published"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 否 | 行程模版标题 |
| `destination` | string | 否 | 目的地 |
| `duration` | number | 否 | 行程天数 |
| `budget` | string | 否 | 预算等级 |
| `preferences` | string[] | 否 | 偏好列表 |
| `travelStyle` | string | 否 | 旅行风格 |
| `recommendations` | object | 否 | 推荐信息 |
| `days` | array | 否 | 天数数组 |
| `totalCost` | number | 否 | 总费用 |
| `summary` | string | 否 | 行程摘要 |
| `status` | string | 否 | 状态：`draft`、`published`、`archived` |
| `language` | string | 否 | 语言代码 |
| `tasks` | array | 否 | 任务列表 |

---

## 请求示例

### cURL

```bash
curl -X PUT "http://localhost:3000/api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的冰岛之旅",
    "duration": 7,
    "totalCost": 2500
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "published",
    "language": "zh-CN",
    "itineraryData": {
      "title": "更新后的冰岛之旅",
      "destination": "冰岛",
      "duration": 7,
      "budget": "medium",
      "totalCost": 2500,
      "summary": "更新后的行程摘要"
    },
    "updatedAt": "2025-01-15T11:30:00Z"
  },
  "message": "更新成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 更新后的行程模版数据 |
| `data.id` | string | 行程模版ID |
| `data.status` | string | 状态 |
| `data.language` | string | 语言代码 |
| `data.itineraryData` | object | 行程数据 |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |
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
  "message": "无权修改此行程模版",
  "error": "Forbidden"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "参数验证失败",
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const itineraryId = '123e4567-e89b-12d3-a456-426614174000';

// 只更新标题和总费用
const response = await fetch(`/api/v1/itineraries/${itineraryId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: '更新后的冰岛之旅',
    totalCost: 2500,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('更新成功:', result.data);
}
```

---

## 注意事项

1. **部分更新**：所有字段都是可选的，只传入需要更新的字段即可
2. **权限控制**：只能更新当前登录用户自己的行程模版
3. **数据格式**：更新 `days` 数组时，需要提供完整的数组结构
4. **状态更新**：可以通过此接口更新状态（如从 `draft` 改为 `published`）
5. **时间戳**：更新后，`updatedAt` 字段会自动更新为当前时间

