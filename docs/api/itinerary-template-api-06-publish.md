# 行程模版接口文档 - 6. 发布行程模版

## 接口信息

**接口路径：** `POST /api/v1/itineraries/{id}/publish`

**接口描述：** 将草稿状态的行程模版发布为已发布状态

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 行程模版ID |

---

## 请求示例

```
POST /api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000/publish
```

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000/publish" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
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
      "title": "冰岛之旅",
      "destination": "冰岛",
      "duration": 5,
      "budget": "medium",
      "totalCost": 2000,
      "summary": "这个5天冰岛行程覆盖..."
    },
    "updatedAt": "2025-01-15T12:00:00Z"
  },
  "message": "发布成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 发布后的行程模版数据 |
| `data.id` | string | 行程模版ID |
| `data.status` | string | 状态（更新为 `published`） |
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
  "message": "无权发布此行程模版",
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

const response = await fetch(`/api/v1/itineraries/${itineraryId}/publish`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
if (result.success) {
  console.log('发布成功:', result.data);
  console.log('新状态:', result.data.status); // "published"
}
```

### 发布前检查示例

```typescript
async function publishItinerary(itineraryId: string) {
  // 先获取详情检查状态
  const detailResponse = await fetch(`/api/v1/itineraries/${itineraryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const detail = await detailResponse.json();
  
  if (detail.status === 'published') {
    console.log('行程模版已经是已发布状态');
    return;
  }

  // 发布
  const publishResponse = await fetch(`/api/v1/itineraries/${itineraryId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await publishResponse.json();
  if (result.success) {
    console.log('发布成功');
  }
}
```

---

## 注意事项

1. **状态变更**：此接口会将行程模版的状态从 `draft`（草稿）更新为 `published`（已发布）
2. **权限控制**：只能发布当前登录用户自己的行程模版
3. **状态检查**：如果行程模版已经是 `published` 状态，调用此接口不会报错，但状态不会改变
4. **时间戳**：发布后，`updatedAt` 字段会自动更新为当前时间
5. **可逆操作**：发布后可以通过更新接口将状态改回 `draft` 或其他状态

